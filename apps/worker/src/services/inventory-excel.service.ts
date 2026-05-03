import fs from 'fs';
import path from 'path';
import ExcelJS from 'exceljs';
import {
  bulkUpsertVouchersForImport,
  findVoucherPrintDataByIds,
  findVouchersByIdsForExport,
  findVouchersForExport,
  type ImportVoucherRow,
} from '@repo/db';
import { config } from '../config/env';
import { pool } from '../config/database';

export interface ExportOptions {
  jobId: string;
  mode?: 'list_all' | 'list_selected' | 'forms_selected' | 'form_single';
  voucherIds?: string[];
  voucherId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  templatePath?: string;
  onProgress?: (processed: number) => Promise<void>;
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
  await fs.promises.mkdir(config.exportDir, { recursive: true });

  const filePath = path.join(config.exportDir, `inventory-vouchers-${options.jobId}.xlsx`);
  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: filePath,
    useSharedStrings: false,
    useStyles: false,
  });
  const worksheet = workbook.addWorksheet('Inventory Vouchers');

  applyListColumns(worksheet);

  let processed = 0;
  let lastCreatedAt: string | undefined;
  let lastId: string | undefined;

  if (options.mode === 'list_selected') {
    const rows = await findVouchersByIdsForExport(pool, options.voucherIds || []);
    for (const row of rows) {
      worksheet.addRow(row).commit();
      processed++;
    }

    await options.onProgress?.(processed);
    worksheet.commit();
    await workbook.commit();
    return { filePath, processed };
  }

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

    for (const row of rows) {
      worksheet.addRow(row).commit();
      processed++;
    }

    const lastRow = rows[rows.length - 1];
    lastCreatedAt = lastRow.created_at instanceof Date ? lastRow.created_at.toISOString() : String(lastRow.created_at);
    lastId = lastRow.id;
    await options.onProgress?.(processed);
  }

  worksheet.commit();
  await workbook.commit();

  return { filePath, processed };
}

function copyWorksheet(source: ExcelJS.Worksheet, target: ExcelJS.Worksheet) {
  target.properties = clone(source.properties);
  target.pageSetup = clone(source.pageSetup);
  target.headerFooter = clone(source.headerFooter);
  target.views = clone(source.views);

  source.columns.forEach((column, index) => {
    const targetColumn = target.getColumn(index + 1);
    targetColumn.width = column.width;
    targetColumn.hidden = column.hidden ?? false;
    if (column.style) targetColumn.style = clone(column.style);
  });

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

  for (const merge of source.model.merges) {
    target.mergeCells(merge);
  }
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

function fillVoucherForm(worksheet: ExcelJS.Worksheet, voucher: any) {
  const voucherDate = voucher.voucher_date instanceof Date ? voucher.voucher_date : new Date(String(voucher.voucher_date));
  const details = voucher.details || [];
  const detailStartRow = 17;
  const minDetailRows = 3;

  if (details.length > minDetailRows) {
    worksheet.spliceRows(20, 0, ...Array.from({ length: details.length - minDetailRows }, () => []));
    for (let row = 20; row < 20 + details.length - minDetailRows; row++) {
      copyRowStyle(worksheet, 19, row);
    }
  }

  const totalRow = detailStartRow + Math.max(details.length, minDetailRows);
  worksheet.getCell('A1').value = `Đơn vị: ${voucher.unit_name || ''}`;
  worksheet.getCell('A2').value = `Bộ phận: ${voucher.department_name || ''}`;
  worksheet.getCell('A6').value = Number.isNaN(voucherDate.getTime())
    ? `Ngày ${formatDate(voucher.voucher_date)}`
    : `Ngày ${voucherDate.getDate()} tháng ${voucherDate.getMonth() + 1} năm ${voucherDate.getFullYear()}`;
  worksheet.getCell('A7').value = `Số: ${voucher.voucher_number || ''}`;
  worksheet.getCell('G8').value = `Nợ: ${voucher.debit_account || ''}`;
  worksheet.getCell('G9').value = `Có: ${voucher.credit_account || ''}`;
  worksheet.getCell('A10').value = `- Họ và tên người giao: ${voucher.deliverer_name || ''}`;
  worksheet.getCell('A11').value = `- Theo ${voucher.reference_source || ''}`;
  worksheet.getCell('A12').value = `Nhập tại kho: ${voucher.warehouse_name || ''} (${voucher.warehouse_code || ''}) địa điểm ${voucher.location || voucher.warehouse_address || ''}`;
  worksheet.getCell(`A${totalRow + 2}`).value = `- Tổng số tiền (viết bằng chữ): ${voucher.total_amount_words || ''}`;
  worksheet.getCell(`A${totalRow + 3}`).value = `- Số chứng từ gốc kèm theo: ${voucher.original_docs_count ?? 0}`;

  details.forEach((detail: any, index: number) => {
    const rowNumber = detailStartRow + index;
    copyRowStyle(worksheet, 17, rowNumber);
    const row = worksheet.getRow(rowNumber);
    row.getCell(1).value = index + 1;
    row.getCell(2).value = detail.item_name_snapshot || '';
    row.getCell(3).value = detail.item_code_snapshot || '';
    row.getCell(4).value = detail.unit_snapshot || '';
    row.getCell(5).value = Number(detail.quantity_by_doc || 0);
    row.getCell(6).value = Number(detail.quantity_actual || 0);
    row.getCell(7).value = Number(detail.unit_price || 0);
    row.getCell(8).value = Number(detail.total_price || 0);
  });

  worksheet.getCell(`H${totalRow}`).value = Number(voucher.total_amount_numeric || 0);
}

async function exportVoucherForms(options: ExportOptions) {
  await fs.promises.mkdir(config.exportDir, { recursive: true });

  const voucherIds = options.mode === 'form_single' && options.voucherId
    ? [options.voucherId]
    : options.voucherIds || [];
  const vouchers = await findVoucherPrintDataByIds(pool, voucherIds);
  const templatePath = options.templatePath || config.voucherTemplatePath;

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
  });

  const fileName = options.mode === 'form_single'
    ? `inventory-voucher-form-${vouchers[0].voucher_number || options.jobId}.xlsx`
    : `inventory-voucher-forms-${options.jobId}.xlsx`;
  const filePath = path.join(config.exportDir, fileName);
  await workbook.xlsx.writeFile(filePath);
  await options.onProgress?.(vouchers.length);

  return { filePath, processed: vouchers.length };
}

export async function exportVouchersToExcel(options: ExportOptions) {
  const mode = options.mode || 'list_all';
  if (mode === 'forms_selected' || mode === 'form_single') {
    return exportVoucherForms({ ...options, mode });
  }

  return exportVoucherList({ ...options, mode });
}

export interface ImportOptions {
  filePath: string;
  onProgress?: (processed: number) => Promise<void>;
}

function normalizeCellValue(value: ExcelJS.CellValue) {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === 'object' && 'text' in value) return String(value.text);
  return String(value).trim();
}

export async function importVouchersFromExcel(options: ImportOptions) {
  const workbookReader = new ExcelJS.stream.xlsx.WorkbookReader(options.filePath, {
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
  return { imported, processed };
}
