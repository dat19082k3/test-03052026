import type IORedis from 'ioredis';

const PREFIX = 'inv-excel:lock:';

export async function acquireInventoryExcelLock(
  redis: IORedis,
  clientId: string,
  ttlSeconds: number,
  value: string = '1',
): Promise<boolean> {
  const key = PREFIX + clientId;
  const r = await redis.set(key, value, 'EX', ttlSeconds, 'NX');
  return r === 'OK';
}

export async function releaseInventoryExcelLock(redis: IORedis, clientId: string): Promise<void> {
  await redis.del(PREFIX + clientId);
}
