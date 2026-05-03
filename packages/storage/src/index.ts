import { Readable } from 'stream';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface S3EnvConfig {
  region: string;
  bucket: string;
  endpoint?: string;
  forcePathStyle?: boolean;
}

export function readS3ConfigFromEnv(): S3EnvConfig | null {
  const bucket = process.env.S3_BUCKET?.trim();
  if (!bucket) return null;
  return {
    region: process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'ap-southeast-1',
    bucket,
    endpoint: process.env.S3_ENDPOINT?.trim() || undefined,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === '1' || process.env.S3_FORCE_PATH_STYLE === 'true',
  };
}

export function createS3Client(cfg: S3EnvConfig): S3Client {
  return new S3Client({
    region: cfg.region,
    endpoint: cfg.endpoint,
    forcePathStyle: cfg.forcePathStyle,
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
}): Promise<void> {
  const fs = await import('fs/promises');
  const buf = await fs.readFile(params.filePath);
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: buf,
      ContentType: params.contentType || 'application/octet-stream',
    }),
  );
}

export async function putObjectBuffer(params: {
  client: S3Client;
  bucket: string;
  key: string;
  body: Buffer;
  contentType?: string;
}): Promise<void> {
  await params.client.send(
    new PutObjectCommand({
      Bucket: params.bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || 'application/octet-stream',
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
