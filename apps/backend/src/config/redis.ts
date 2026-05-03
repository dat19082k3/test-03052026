import IORedis from 'ioredis';
import { config } from './env';

let redisConnection: IORedis | null = null;

export function getRedisConnection() {
  if (!redisConnection) {
    redisConnection = new IORedis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      maxRetriesPerRequest: null,
    });
  }

  return redisConnection;
}
