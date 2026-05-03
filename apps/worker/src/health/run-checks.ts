import {
  checkS3BucketReachable,
  createS3Client,
  readS3ConfigFromEnv,
} from '@repo/storage';
import { pool } from '../config/database';
import { redisConnection } from '../config/redis';
import { logger } from '../utils/logger';

export type CheckStatus = 'ok' | 'fail' | 'skipped';

export interface HealthCheckResult {
  ok: boolean;
  checks: Record<string, CheckStatus>;
}

export async function runHealthChecks(): Promise<HealthCheckResult> {
  const checks: Record<string, CheckStatus> = {};

  try {
    await pool.query('SELECT 1');
    checks.database = 'ok';
  } catch (err) {
    logger.error({ err }, 'healthcheck: database');
    checks.database = 'fail';
  }

  try {
    const pong = await redisConnection.ping();
    checks.redis = pong === 'PONG' ? 'ok' : 'fail';
    if (checks.redis === 'fail') {
      logger.error({ pong }, 'healthcheck: redis unexpected ping');
    }
  } catch (err) {
    logger.error({ err }, 'healthcheck: redis');
    checks.redis = 'fail';
  }

  const s3cfg = readS3ConfigFromEnv();
  if (!s3cfg) {
    checks.s3 = 'skipped';
    logger.debug('healthcheck: S3_BUCKET not set, skipping S3');
  } else {
    try {
      const client = createS3Client(s3cfg);
      await checkS3BucketReachable({ client, bucket: s3cfg.bucket });
      checks.s3 = 'ok';
    } catch (err) {
      logger.error({ err }, 'healthcheck: s3');
      checks.s3 = 'fail';
    }
  }

  const coreOk = checks.database === 'ok' && checks.redis === 'ok';
  const s3Ok = checks.s3 !== 'fail';
  const ok = coreOk && s3Ok;

  if (ok) {
    logger.info({ checks }, 'healthcheck: all required checks passed');
  } else {
    logger.warn({ checks }, 'healthcheck: degraded or failing');
  }

  return { ok, checks };
}
