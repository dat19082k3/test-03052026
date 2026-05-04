import { Readable } from 'stream';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
  type HeadObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3EnvConfig {
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
  accessKeyId?: string;
  secretAccessKey?: string;
}

export function readS3ConfigFromEnv(): S3EnvConfig | null {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[S3 Storage] S3_BUCKET is not set. Storage might fallback to local.');
    }
    return null;
  }

  const accessKeyId = process.env.S3_ACCESS_KEY?.trim() || process.env.AWS_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.S3_SECRET_KEY?.trim() || process.env.AWS_SECRET_ACCESS_KEY?.trim();

  const cfg: S3EnvConfig = {
    region:
      process.env.AWS_REGION ||
      process.env.AWS_DEFAULT_REGION ||
      process.env.S3_REGION ||
      'ap-southeast-1',
    bucket,
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle:
      process.env.S3_FORCE_PATH_STYLE === '1' || process.env.S3_FORCE_PATH_STYLE === 'true',
    accessKeyId,
    secretAccessKey,
  };

  if (process.env.NODE_ENV === 'development') {
    console.log('[S3 Storage] Resolved config from env:', {
      endpoint: cfg.endpoint,
      bucket: cfg.bucket,
      accessKeyId: cfg.accessKeyId ? `***${cfg.accessKeyId.slice(-4)}` : 'MISSING',
      hasSecret: !!cfg.secretAccessKey,
    });
  }

  return cfg;
}

export function createS3Client(cfg: S3EnvConfig): S3Client {
  const credentials =
    cfg.accessKeyId && cfg.secretAccessKey
      ? {
          accessKeyId: cfg.accessKeyId,
          secretAccessKey: cfg.secretAccessKey,
        }
      : undefined;

  if (process.env.NODE_ENV === 'development') {
    // Check if we are using typical default credentials unexpectedly
    if (cfg.accessKeyId === 'minioadmin' && process.env.S3_ACCESS_KEY !== 'minioadmin') {
      console.error('[S3 Storage] WARNING: Using default "minioadmin" credentials even though S3_ACCESS_KEY is set to something else in env!', {
        envValue: process.env.S3_ACCESS_KEY,
        resolvedValue: cfg.accessKeyId
      });
    }

    console.log('[S3 Storage] Initializing S3Client:', {
      endpoint: cfg.endpoint,
      region: cfg.region,
      forcePathStyle: cfg.forcePathStyle,
      hasCredentials: !!credentials,
    });
  }

  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
    credentials,
  });
}

/** Lightweight connectivity check (credentials + bucket existence). */
export async function checkS3BucketReachable(params: {
  client: S3Client;
  bucket: string;
}): Promise<void> {
  await params.client.send(new HeadBucketCommand({ Bucket: params.bucket }));
}

function streamFromBody(body: GetObjectCommandOutput['Body']): Readable {
  if (!body) {
    throw new Error('S3 GetObject returned empty body');
  }
  return body as Readable;
}

export async function putObjectFile(params: {
  client: S3Client;
  bucket: string;
  key: string;
  filePath: string;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  const fs = await import('fs/promises');
  const buf = await fs.readFile(params.filePath);
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: buf,
      ContentType: params.contentType || 'application/octet-stream',
      Metadata: params.metadata,
    }),
  );
}

export async function putObjectBuffer(params: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}): Promise<void> {
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || 'application/octet-stream',
      Metadata: params.metadata,
    }),
  );
}

export async function getObjectStream(params: {
  client: S3Client;
  bucket: string;
  key: string;
}): Promise<Readable> {
  const out = await params.client.send(
    new GetObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    }),
  );
  return streamFromBody(out.Body);
}

export async function downloadObjectToFile(params: {
  client: S3Client;
  bucket: string;
  key: string;
  filePath: string;
}): Promise<void> {
  const stream = await getObjectStream(params);
  await pipeline(stream, createWriteStream(params.filePath));
}

export async function deleteObject(params: {
  client: S3Client;
  bucket: string;
  key: string;
}): Promise<void> {
  await params.client.send(
    new DeleteObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
    }),
  );
}

export async function getObjectMetadata(params: {
  client: S3Client;
  bucket: string;
  key: string;
}): Promise<HeadObjectCommandOutput['Metadata'] | null> {
  try {
    const out = await params.client.send(
      new HeadObjectCommand({
        Bucket: params.bucket,
        Key: params.key,
      }),
    );
    return out.Metadata || {};
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    throw err;
  }
}

/** Server-side presigned GET (e.g. short-lived); prefer app-domain proxy URLs for end users. */
export async function presignGetObject(params: {
  client: S3Client;
  bucket: string;
  key: string;
  expiresInSeconds: number;
}): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: params.bucket,
    Key: params.key,
  });
  return getSignedUrl(params.client, cmd, { expiresIn: params.expiresInSeconds });
}
