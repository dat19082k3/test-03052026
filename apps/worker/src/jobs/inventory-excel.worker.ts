import { Job, Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { exportVouchersToExcel, importVouchersFromExcel } from '../services/inventory-excel.service';

export const INVENTORY_EXCEL_QUEUE = 'inventory-excel';

export function createInventoryExcelWorker() {
  return new Worker(
    INVENTORY_EXCEL_QUEUE,
    async (job: Job) => {
      if (job.name === 'export-vouchers') {
        return exportVouchersToExcel({
          jobId: String(job.id),
          mode: job.data.mode,
          voucherIds: job.data.voucherIds,
          voucherId: job.data.voucherId,
          status: job.data.status,
          startDate: job.data.startDate,
          endDate: job.data.endDate,
          templatePath: job.data.templatePath,
          onProgress: async (processed) => job.updateProgress({ processed }),
        });
      }

      if (job.name === 'import-vouchers') {
        return importVouchersFromExcel({
          filePath: job.data.filePath,
          onProgress: async (processed) => job.updateProgress({ processed }),
        });
      }

      throw new Error(`Unsupported inventory excel job: ${job.name}`);
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
      limiter: {
        max: config.concurrency,
        duration: 1000,
      },
    },
  )
    .on('completed', (job, result) => {
      logger.info({ jobId: job.id, jobName: job.name, result }, 'Inventory Excel job completed');
    })
    .on('failed', (job, error) => {
      logger.error({ jobId: job?.id, jobName: job?.name, err: error }, 'Inventory Excel job failed');
    });
}
