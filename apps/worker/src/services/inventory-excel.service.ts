import fs from 'fs';
import os from 'os';
import path from 'path';
import ExcelJS from 'exceljs';
import {
  bulkUpsertVouchersForImport,
  findVoucherPrintDataByIds,
  findVouchersByIdsForExport,
  findVouchersForExport,
  type ImportVoucherRow,
} from '@repo/db';
import {
  createS3Client,
  downloadObjectToFile,
  putObjectFile,
  readS3ConfigFromEnv,
} from '@repo/storage';
import { config } from '../config/env';
import { pool } from '../config/database';
import { getInventoryExcelSchedulerQueue } from '../queues/inventory-excel.queue';
import type { InventoryExcelJobResult } from '@repo/types';

export interface ExportOptions {
  jobId: string;
  mode?: 'list_all' | 'list_selected' | 'forms_selected' | 'form_single';
  voucherIds?: string[];
  voucherId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  templatePath?: string;
  lockTtl?: number;
  onProgress?: (processed: number) => Promise<void>;
}

const XLSX_CONTENT =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

async function scheduleS3Cleanup(key: string) {
  const queue = getInventoryExcelSchedulerQueue();
  await queue.add('excel-s3-cleanup', { key }, { delay: config.excelS3FileTtlSeconds * 1000 });
}

async function finalizeExcelOutput(params: {
  jobId: string;
  localFilePath: string;
  fileName: string;
  processed: number;
  keepLocalFile?: boolean;
}): Promise<InventoryExcelJobResult> {
  const s3cfg = readS3ConfigFromEnv();
  if (s3cfg) {
    const client = createS3Client(s3cfg);
    const key = `excel/exports/${params.jobId}/${params.fileName}`;
    await putObjectFile({
      client,
      bucket: s3cfg.bucket,
      key,
      filePath: params.localFilePath,
      contentType: XLSX_CONTENT,
    });
    
    if (!params.keepLocalFile) {
      await fs.promises.unlink(params.localFilePath).catch(() => undefined);
    }

    await scheduleS3Cleanup(key);
    return {
      storage: 's3',
      fileName: params.fileName,
      s3Key: key,
      processed: params.processed,
      fileExpiresInSeconds: config.excelS3FileTtlSeconds,
      // Include local path if kept
      ...(params.keepLocalFile && { filePath: path.resolve(params.localFilePath) }),
    };
  }

  return {
    storage: 'local',
    fileName: params.fileName,
    filePath: path.resolve(params.localFilePath),
    processed: params.processed,
  };
}

async function resolveTemplatePath(templateName: 'phieu_nhap_kho.xlsx' | 'danh_sach_phieu_nhap_kho.xlsx', override?: string): Promise<string> {
  if (override) return override;

  const s3TemplateKey = templateName === 'phieu_nhap_kho.xlsx' 
    ? config.s3VoucherFormTemplateKey 
    : config.s3VoucherListTemplateKey;

  if (s3TemplateKey) {
    const s3cfg = readS3ConfigFromEnv();
    if (!s3cfg) {
      throw new Error('S3 template key is set but S3_BUCKET / AWS credentials are missing');
    }
    const client = createS3Client(s3cfg);
    const target = path.join(os.tmpdir(), `inv-template-${templateName}`);
    await downloadObjectToFile({
      client,
      bucket: s3cfg.bucket,
      key: s3TemplateKey,
      filePath: target,
    });
    return target;
  }

  // Fallback to local path
  return path.resolve(process.cwd(), `../../packages/templates/${templateName}`);
}

function formatDate(value: unknown) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

function clone<T>(value: T): T {
  if (value === undefined) return value;
  return JSON.parse(JSON.stringify(value));
}

function safeSheetName(value: string, fallback: string) {
  const sanitized = value.replace(/[\\/*?:[\]]/g, ' ').trim();
  return (sanitized || fallback).slice(0, 31);
}

function applyListColumns(worksheet: ExcelJS.Worksheet) {
  worksheet.columns = [
    { header: 'Voucher Number', key: 'voucher_number', width: 24 },
    { header: 'Voucher Date', key: 'voucher_date', width: 18 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Deliverer', key: 'deliverer_name', width: 32 },
    { header: 'Warehouse ID', key: 'warehouse_id', width: 38 },
    { header: 'Warehouse Code', key: 'warehouse_code', width: 18 },
    { header: 'Warehouse Name', key: 'warehouse_name', width: 32 },
    { header: 'Total Amount', key: 'total_amount_numeric', width: 18 },
    { header: 'Detail Count', key: 'detail_count', width: 14 },
    { header: 'Created At', key: 'created_at', width: 24 },
  ];
}

async function exportVoucherList(options: ExportOptions) {
  const startTime = Date.now();
  const timeoutMs = options.lockTtl ? options.lockTtl * 1000 : 3600000; // Default 1h

  const checkTimeout = () => {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Export timed out after ${timeoutMs}ms`);
    }
  };

  await fs.promises.mkdir(config.exportDir, { recursive: true });

  const templatePath = await resolveTemplatePath('danh_sach_phieu_nhap_kho.xlsx', options.templatePath);
  const templateWorkbook = new ExcelJS.Workbook();
  await templateWorkbook.xlsx.readFile(templatePath);
  const templateWorksheet = templateWorkbook.worksheets[0];
  if (!templateWorksheet) {
    throw new Error(`Template has no worksheet: ${templatePath}`);
  }

  const fileName = `danh-sach-phieu-nhap-kho-${options.jobId}.xlsx`;
  const filePath = path.join(config.exportDir, fileName);
  
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useSharedStrings: true,
    useStyles: true,
  });
  const worksheet = workbook.addWorksheet(templateWorksheet.name, {
    views: templateWorksheet.views,
  });
  copyWorksheet(templateWorksheet, worksheet);

  let processed = 0;
  let lastCreatedAt: string | undefined;
  let lastId: string | undefined;
  const dataStartRow = 3; // Assuming header is on row 2

  if (options.mode === 'list_selected') {
    const rows = await findVouchersByIdsForExport(pool, options.voucherIds || []);
    rows.forEach((row, index) => {
      worksheet.getRow(dataStartRow + index).values = {
        stt: index + 1,
        voucher_number: row.voucher_number,
        voucher_date: formatDate(row.voucher_date),
        status: row.status,
        deliverer_name: row.deliverer_name,
        warehouse_name: row.warehouse_name,
        total_amount: row.total_amount_numeric,
      };
      processed++;
    });
    await options.onProgress?.(processed);
  } else {
    while (true) {
      const rows = await findVouchersForExport(pool, {
        batchSize: config.exportBatchSize,
        lastCreatedAt,
        lastId,
        status: options.status,
        startDate: options.startDate,
        endDate: options.endDate,
      });

      if (rows.length === 0) break;

      rows.forEach((row) => {
        worksheet.insertRow(dataStartRow + processed, {
          stt: processed + 1,
          voucher_number: row.voucher_number,
          voucher_date: formatDate(row.voucher_date),
          status: row.status,
          deliverer_name: row.deliverer_name,
          warehouse_name: row.warehouse_name,
          total_amount: row.total_amount_numeric,
        });
        processed++;
      });

      const lastRow = rows[rows.length - 1];
      lastCreatedAt = lastRow.created_at instanceof Date ? lastRow.created_at.toISOString() : String(lastRow.created_at);
      lastId = lastRow.id;
      await options.onProgress?.(processed);
      checkTimeout();
    }
  }

  worksheet.commit();
  await workbook.commit();

  return finalizeExcelOutput({ jobId: options.jobId, localFilePath: filePath, fileName, processed, keepLocalFile: false });
}

function copyWorksheet(source: ExcelJS.Worksheet, target: ExcelJS.Worksheet) {
  target.properties = clone(source.properties);
  target.pageSetup = clone(source.pageSetup);
  target.headerFooter = clone(source.headerFooter);
  
  try {
    if (source.views) {
      (target as any).views = clone(source.views);
    }
  } catch (e) {
    // Skip if read-only (common in WorkbookWriter)
  }

  source.columns.forEach((column, index) => {
    const targetColumn = target.getColumn(index + 1);
    targetColumn.width = column.width;
    targetColumn.hidden = column.hidden ?? false;
    if (column.style) targetColumn.style = clone(column.style);
  });

  // IMPORTANT: For streaming WorkbookWriter, merges must be defined 
  // before rows are committed.
  if (source.model.merges) {
    for (const merge of source.model.merges) {
      target.mergeCells(merge);
    }
  }

  source.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const targetRow = target.getRow(rowNumber);
    targetRow.height = row.height;
    targetRow.hidden = row.hidden;
    targetRow.outlineLevel = row.outlineLevel;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const targetCell = targetRow.getCell(colNumber);
      targetCell.value = clone(cell.value);
      targetCell.style = clone(cell.style);
      targetCell.numFmt = cell.numFmt;
      targetCell.alignment = clone(cell.alignment);
      targetCell.border = clone(cell.border);
      targetCell.fill = clone(cell.fill);
      targetCell.font = clone(cell.font);
      targetCell.protection = clone(cell.protection);
    });
    targetRow.commit();
  });
}

function copyRowStyle(worksheet: ExcelJS.Worksheet, fromRowNumber: number, toRowNumber: number) {
  const fromRow = worksheet.getRow(fromRowNumber);
  const toRow = worksheet.getRow(toRowNumber);
  toRow.height = fromRow.height;
  fromRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    const targetCell = toRow.getCell(colNumber);
    targetCell.style = clone(cell.style);
    targetCell.numFmt = cell.numFmt;
    targetCell.alignment = clone(cell.alignment);
    targetCell.border = clone(cell.border);
    targetCell.fill = clone(cell.fill);
    targetCell.font = clone(cell.font);
  });
}

/**
 * sheet layout from packages/templates/phieu_nhap_kho.xlsx
 */
function fillVoucherForm(worksheet: ExcelJS.Worksheet, voucher: any) {
  const voucherDate = voucher.voucher_date instanceof Date ? voucher.voucher_date : new Date(String(voucher.voucher_date));
  const details = voucher.details || [];

  const detailStartRow = 16;
  const minDetailRows = 3;
  const templateLastDetailRow = detailStartRow + minDetailRows - 1;
  const cộngRowInitial = detailStartRow + minDetailRows;

  if (details.length > minDetailRows) {
    const insertCount = details.length - minDetailRows;
    worksheet.spliceRows(cộngRowInitial, 0, ...Array.from({ length: insertCount }, () => []));
    for (let row = cộngRowInitial; row < cộngRowInitial + insertCount; row++) {
      copyRowStyle(worksheet, templateLastDetailRow, row);
    }
  }

  const lastDetailRow = detailStartRow + Math.max(details.length, minDetailRows) - 1;
  const totalRow = lastDetailRow + 1;

  worksheet.getCell('A1').value = `Đơn vị: ${voucher.unit_name || ''}`;
  worksheet.getCell('A2').value = `Bộ phận: ${voucher.department_name || ''}`;

  const dateText = Number.isNaN(voucherDate.getTime())
    ? `Ngày ${formatDate(voucher.voucher_date)}`
    : `Ngày ${voucherDate.getDate()} tháng ${voucherDate.getMonth() + 1} năm ${voucherDate.getFullYear()}`;
  worksheet.getCell('C6').value = dateText;
  worksheet.getCell('C7').value = `Số: ${voucher.voucher_number || ''}`;
  worksheet.getCell('E6').value = `Nợ: ${voucher.debit_account || ''}`;
  worksheet.getCell('E7').value = `Có: ${voucher.credit_account || ''}`;

  worksheet.getCell('A9').value = `- Họ và tên người giao: ${voucher.deliverer_name || ''}`;
  worksheet.getCell('A10').value = `- Theo ${voucher.reference_source || ''}`;
  worksheet.getCell('A11').value = `Nhập tại kho: ${voucher.warehouse_name || ''} (${voucher.warehouse_code || ''}) địa điểm ${voucher.location || voucher.warehouse_address || ''}`;

  worksheet.getCell(`A${totalRow + 2}`).value = `- Tổng số tiền (viết bằng chữ): ${voucher.total_amount_words || ''}`;
  worksheet.getCell(`A${totalRow + 3}`).value = `- Số chứng từ gốc kèm theo: ${voucher.original_docs_count ?? 0}`;

  const span = Math.max(details.length, minDetailRows);
  for (let i = 0; i < span; i++) {
    const rowNumber = detailStartRow + i;
    copyRowStyle(worksheet, templateLastDetailRow, rowNumber);
    const row = worksheet.getRow(rowNumber);
    const detail = details[i];
    if (!detail) {
      for (let c = 1; c <= 8; c++) {
        row.getCell(c).value = null;
      }
      continue;
    }
    const lineTotal =
      detail.total_price != null
        ? Number(detail.total_price)
        : Number(detail.quantity_actual || 0) * Number(detail.unit_price || 0);

    row.getCell(1).value = i + 1;
    row.getCell(2).value = detail.item_name_snapshot || '';
    row.getCell(3).value = detail.item_code_snapshot || '';
    row.getCell(4).value = detail.unit_snapshot || '';
    row.getCell(5).value = Number(detail.quantity_by_doc || 0);
    row.getCell(6).value = Number(detail.quantity_actual || 0);
    row.getCell(7).value = Number(detail.unit_price || 0);
    row.getCell(8).value = lineTotal;
  }

  worksheet.getCell(`H${totalRow}`).value = Number(voucher.total_amount_numeric || 0);
}

async function exportVoucherForms(options: ExportOptions) {
  const startTime = Date.now();
  const timeoutMs = options.lockTtl ? options.lockTtl * 1000 : 3600000;
  const checkTimeout = () => {
    if (Date.now() - startTime > timeoutMs) {
      throw new Error(`Export timed out after ${timeoutMs}ms`);
    }
  };

  await fs.promises.mkdir(config.exportDir, { recursive: true });

  const voucherIds = options.mode === 'form_single' && options.voucherId
    ? [options.voucherId]
    : options.voucherIds || [];
  const vouchers = await findVoucherPrintDataByIds(pool, voucherIds);
  const templatePath = await resolveTemplatePath('phieu_nhap_kho.xlsx', options.templatePath);

  if (vouchers.length === 0) {
    throw new Error('No vouchers found for form export');
  }

  const templateWorkbook = new ExcelJS.Workbook();
  await templateWorkbook.xlsx.readFile(templatePath);
  const templateWorksheet = templateWorkbook.worksheets[0];
  if (!templateWorksheet) {
    throw new Error(`Template has no worksheet: ${templatePath}`);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'inventory-worker';
  workbook.created = new Date();

  vouchers.forEach((voucher, index) => {
    const worksheet = workbook.addWorksheet(safeSheetName(voucher.voucher_number, `Voucher ${index + 1}`));
    copyWorksheet(templateWorksheet, worksheet);
    fillVoucherForm(worksheet, voucher);
    checkTimeout();
  });

  const fileName =
    options.mode === 'form_single'
      ? `inventory-voucher-form-${vouchers[0].voucher_number || options.jobId}.xlsx`
      : `inventory-voucher-forms-${options.jobId}.xlsx`;
  const filePath = path.join(config.exportDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  await options.onProgress?.(vouchers.length);

  return finalizeExcelOutput({
    jobId: options.jobId,
    localFilePath: filePath,
    fileName,
    processed: vouchers.length,
    keepLocalFile: true,
  });
}

export async function exportVouchersToExcel(options: ExportOptions) {
  const mode = options.mode || 'list_all';
  if (mode === 'forms_selected' || mode === 'form_single') {
    return exportVoucherForms({ ...options, mode });
  }

  return exportVoucherList({ ...options, mode });
}

export interface ImportOptions {
  filePath?: string;
  importS3Key?: string;
  onProgress?: (processed: number) => Promise<void>;
}

function normalizeCellValue(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in value) return String(value.text);
  return String(value).trim();
}

export async function importVouchersFromExcel(options: ImportOptions): Promise<
  InventoryExcelJobResult & { imported: number; processed: number }
> {
  let resolvedPath = options.filePath;
  let tempPath: string | null = null;

  if (options.importS3Key) {
    const s3cfg = readS3ConfigFromEnv();
    if (!s3cfg) {
      throw new Error('importS3Key provided but S3 is not configured');
    }
    const client = createS3Client(s3cfg);
    tempPath = path.join(os.tmpdir(), `inv-import-${Date.now()}-${Math.random().toString(36).slice(2)}.xlsx`);
    await downloadObjectToFile({
      client,
      bucket: s3cfg.bucket,
      key: options.importS3Key,
      filePath: tempPath,
    });
    resolvedPath = tempPath;
  }

  if (!resolvedPath) {
    throw new Error('Import requires filePath or importS3Key');
  }

  try {
    const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(resolvedPath, {
      entries: 'emit',
      sharedStrings: 'cache',
      hyperlinks: 'ignore',
      worksheets: 'emit',
    });

    let processed = 0;
    let imported = 0;
    let headers: string[] = [];
    let batch: ImportVoucherRow[] = [];

    async function flushBatch() {
      if (batch.length === 0) return;
      imported += await bulkUpsertVouchersForImport(pool, batch);
      batch = [];
      await options.onProgress?.(processed);
    }

    for await (const worksheetReader of workbookReader) {
      for await (const row of worksheetReader) {
        const values = Array.isArray(row.values) ? row.values.slice(1) : [];

        if (row.number === 1) {
          headers = values.map((value) => normalizeCellValue(value as ExcelJS.CellValue));
          continue;
        }

        const record = Object.fromEntries(
          headers.map((header, index) => [header, normalizeCellValue(values[index] as ExcelJS.CellValue)]),
        );

        if (!record['Voucher Number']) continue;
        if (!record['Voucher Date'] || !record['Deliverer'] || !record['Warehouse ID']) {
          throw new Error(`Missing required import fields at row ${row.number}`);
        }

        batch.push({
          voucher_number: record['Voucher Number'],
          voucher_date: record['Voucher Date'],
          deliverer_name: record['Deliverer'],
          warehouse_id: record['Warehouse ID'],
          total_amount_numeric: Number(record['Total Amount'] || 0),
          status: (record['Status'] || 'draft') as ImportVoucherRow['status'],
        });
        processed++;

        if (batch.length >= config.importBatchSize) {
          await flushBatch();
        }
      }
      break;
    }

    await flushBatch();

    const base: InventoryExcelJobResult = options.importS3Key
      ? { storage: 's3', fileName: path.basename(options.importS3Key), s3Key: options.importS3Key }
      : { storage: 'local', fileName: path.basename(resolvedPath) };

    return { ...base, imported, processed };
  } finally {
    if (tempPath) {
      await fs.promises.unlink(tempPath).catch(() => undefined);
    }
    if (options.importS3Key) {
      await scheduleS3Cleanup(options.importS3Key);
    } else if (options.filePath) {
      await fs.promises.unlink(options.filePath).catch(() => undefined);
    }
  }
}
