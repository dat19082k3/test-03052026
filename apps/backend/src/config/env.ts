import dotenv from 'dotenv';
import path from 'path';

// Determine which .env file to load
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'development' ? '.env.development' : '.env';

// Load environment variables from the root of the monorepo or local
const localEnvPath = path.resolve(process.cwd(), envFile);
const rootEnvPath = path.resolve(process.cwd(), '../../', envFile);

dotenv.config({ path: localEnvPath });
dotenv.config({ path: rootEnvPath });

export const config = {
  nodeEnv,
  port: parseInt(process.env.PORT || '4000', 10),
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'development' ? 'debug' : 'info'),
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
  /** Same absolute path as worker EXCEL_EXPORT_DIR when not using S3 (single-node dev). */
  excelSharedExportDir:
    process.env.EXCEL_SHARED_EXPORT_DIR ||
    path.resolve(process.cwd(), '../worker/storage/exports'),
  excelImportUploadDir:
    process.env.EXCEL_IMPORT_UPLOAD_DIR || path.resolve(process.cwd(), 'storage/imports'),
  excelS3FileTtlSeconds: parseInt(process.env.EXCEL_S3_FILE_TTL_SECONDS || '1800', 10),
  /** Public browser origin for download links (e.g. https://app.example.com). */
  publicAppOrigin: (process.env.PUBLIC_APP_ORIGIN || process.env.NEXT_PUBLIC_APP_URL || '').replace(/\/$/, ''),
};
