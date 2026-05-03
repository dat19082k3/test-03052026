import './config/env';
import { createInventoryExcelWorker } from './jobs/inventory-excel.worker';
import { createHealthHttpServer, listenHealthServer } from './health/http-server';
import { config } from './config/env';
import { logger } from './utils/logger';

const worker = createInventoryExcelWorker();
const healthServer = createHealthHttpServer();

void listenHealthServer(healthServer).then(() => {
  logger.info({ port: config.healthPort }, 'Worker health server listening');
});

logger.info('Inventory Excel worker started');

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down worker');
  await new Promise<void>((resolve, reject) => {
    healthServer.close((err) => (err ? reject(err) : resolve()));
  });
  await worker.close();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
