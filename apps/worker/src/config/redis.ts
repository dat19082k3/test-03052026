import IORedis from 'ioredis';
import { config } from './env';
import { logger } from '../utils/logger';

export const redisConnection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  db: config.redis.db,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy: (times) => Math.min(times * 100, 2000),
});

export async function waitUntilRedisReady() {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      await redisConnection.ping();
      logger.info('Redis connection alive');
      break;
    } catch (err) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}
