import { Job, Worker } from 'bullmq';
import { redisConnection } from '../config/redis';
import { config } from '../config/env';
import { logger } from '../utils/logger';
import { exportVouchersToExcel, importVouchersFromExcel } from '../services/inventory-excel.service';
import { releaseInventoryExcelLock } from '../services/inventory-excel-lock.service';
import { deleteObject, readS3ConfigFromEnv, createS3Client } from '@repo/storage';
import { INVENTORY_EXCEL_QUEUE } from '../queues/inventory-excel.constants';

export { INVENTORY_EXCEL_QUEUE };

export function createInventoryExcelWorker() {
  return new Worker(
    INVENTORY_EXCEL_QUEUE,
    async (job: Job) => {
      const excelClientId = job.data.excelClientId as string | undefined;
      try {
        if (job.name === 'excel-s3-cleanup') {
          const key = job.data.key as string;
          const s3cfg = readS3ConfigFromEnv();
          if (!s3cfg || !key) return { deleted: false };
          const client = createS3Client(s3cfg);
          await deleteObject({ client, bucket: s3cfg.bucket, key });
          return { deleted: true, key };
        }

        if (job.name === 'export-vouchers') {
          return await exportVouchersToExcel({
            jobId: String(job.id),
            mode: job.data.mode,
            voucherIds: job.data.voucherIds,
            voucherId: job.data.voucherId,
            status: job.data.status,
            startDate: job.data.startDate,
            endDate: job.data.endDate,
            templatePath: job.data.templatePath,
            lockTtl: job.data.lockTtl,
            onProgress: async (processed) => job.updateProgress({ processed }),
          });
        }

        if (job.name === 'import-vouchers') {
          return await importVouchersFromExcel({
            filePath: job.data.filePath as string | undefined,
            importS3Key: job.data.importS3Key as string | undefined,
            onProgress: async (processed) => job.updateProgress({ processed }),
          });
        }

        throw new Error(`Unsupported inventory excel job: ${job.name}`);
      } finally {
        if (excelClientId) {
          await releaseInventoryExcelLock(redisConnection, excelClientId).catch((err) =>
            logger.warn({ err, excelClientId }, 'Failed to release inventory excel lock'),
          );
        }
      }
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
