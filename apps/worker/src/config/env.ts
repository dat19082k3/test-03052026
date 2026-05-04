import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import os from 'os';
import path from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'development' ? '.env.development' : '.env';

const localEnvPath = path.resolve(process.cwd(), envFile);
const rootEnvPath = path.resolve(process.cwd(), '../../', envFile);

expand(dotenv.config({ path: localEnvPath, override: true }));
expand(dotenv.config({ path: rootEnvPath, override: true }));

export const config = {
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'development' ? 'debug' : 'info'),
  concurrency: parseInt(process.env.WORKER_CONCURRENCY || '2', 10),
  exportDir: process.env.EXCEL_EXPORT_DIR || os.tmpdir(),
  /** When set, worker loads the voucher form template from S3. */
  s3VoucherFormTemplateKey: process.env.S3_VOUCHER_FORM_TEMPLATE_KEY?.trim() || '',
  /** When set, worker loads the voucher list template from S3. */
  s3VoucherListTemplateKey: process.env.S3_VOUCHER_LIST_TEMPLATE_KEY?.trim() || '',
  excelS3FileTtlSeconds: parseInt(process.env.EXCEL_S3_FILE_TTL_SECONDS || '1800', 10),
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
  healthPort: parseInt(process.env.WORKER_HEALTH_PORT || '9090', 10),
};
