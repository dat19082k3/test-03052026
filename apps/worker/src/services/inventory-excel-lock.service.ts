import type IORedis from 'ioredis';

const PREFIX = 'inv-excel:lock:';

export async function releaseInventoryExcelLock(redis: IORedis, clientId: string): Promise<void> {
  await redis.del(PREFIX + clientId);
}
