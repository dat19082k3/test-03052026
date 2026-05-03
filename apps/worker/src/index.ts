import './config/env';
import { createInventoryExcelWorker } from './jobs/inventory-excel.worker';
import { logger } from './utils/logger';

const worker = createInventoryExcelWorker();

logger.info('Inventory Excel worker started');

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down worker');
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
