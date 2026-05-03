import dotenv from 'dotenv';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'development' ? '.env.development' : '.env';

const localEnvPath = path.resolve(process.cwd(), envFile);
const rootEnvPath = path.resolve(process.cwd(), '../../', envFile);

dotenv.config({ path: localEnvPath });
dotenv.config({ path: rootEnvPath });

export const config = {
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'development' ? 'debug' : 'info'),
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  exportDir: process.env.EXCEL_EXPORT_DIR || path.resolve(process.cwd(), 'storage/exports'),
  voucherTemplatePath: process.env.INVENTORY_VOUCHER_TEMPLATE_PATH || '/Users/dss/Downloads/pn.xlsx',
  importBatchSize: parseInt(process.env.EXCEL_IMPORT_BATCH_SIZE || '1000', 10),
  exportBatchSize: parseInt(process.env.EXCEL_EXPORT_BATCH_SIZE || '5000', 10),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.DB_DATABASE || '',
    user: process.env.DB_USERNAME || '',
    password: process.env.DB_PASSWORD || '',
  },
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
    db: parseInt(process.env.REDIS_DB || '0', 10),
  },
};
