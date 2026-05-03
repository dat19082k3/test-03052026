import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { INVENTORY_EXCEL_QUEUE } from './inventory-excel.constants';

let schedulerQueue: Queue | null = null;

export function getInventoryExcelSchedulerQueue() {
  if (!schedulerQueue) {
    schedulerQueue = new Queue(INVENTORY_EXCEL_QUEUE, {
      connection: redisConnection,
    });
  }
  return schedulerQueue;
}
