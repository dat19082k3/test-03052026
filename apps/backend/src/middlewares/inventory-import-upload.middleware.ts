import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { config } from '../config/env';

const uploadDir = config.excelImportUploadDir;

export const inventoryImportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const safe = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${Date.now()}-${safe}`);
  },
});

export const inventoryImportUpload = multer({
  storage: inventoryImportStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel' ||
      file.originalname.toLowerCase().endsWith('.xlsx');
    if (!ok) {
      cb(new Error('Only .xlsx Excel files are allowed'));
      return;
    }
    cb(null, true);
  },
});
