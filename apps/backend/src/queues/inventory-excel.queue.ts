import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';

export const INVENTORY_EXCEL_QUEUE = 'inventory-excel';

export interface InventoryExportJobData {
  mode?: 'list_all' | 'list_selected' | 'forms_selected' | 'form_single';
  requestedBy?: string;
  voucherIds?: string[];
  voucherId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  templatePath?: string;
  excelClientId: string;
  lockTtl?: number;
}

export interface InventoryImportJobData {
  requestedBy?: string;
  filePath?: string;
  importS3Key?: string;
  excelClientId: string;
  lockTtl?: number;
}

export type InventoryExcelJobData =
  | InventoryExportJobData
  | InventoryImportJobData;

let inventoryExcelQueue: Queue<InventoryExcelJobData> | null = null;

export function getInventoryExcelQueue() {
  if (!inventoryExcelQueue) {
    inventoryExcelQueue = new Queue<InventoryExcelJobData>(INVENTORY_EXCEL_QUEUE, {
      connection: getRedisConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 60 * 60,
        },
      },
    });
  }

  return inventoryExcelQueue;
}
