import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import type { Express, Response } from 'express';
import {
  CreateInventoryVoucherDto,
  UpdateInventoryVoucherDto,
  ErrorCode,
  type InventoryExcelJobResult,
  type InventoryExcelJobStatus,
} from '@repo/types';
import {
  createS3Client,
  getObjectStream,
  presignGetObject,
  putObjectBuffer,
  readS3ConfigFromEnv,
} from '@repo/storage';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import * as model from '../models/inventory.model';
import { getInventoryExcelQueue } from '../queues/inventory-excel.queue';
import { config } from '../config/env';
import { getRedisConnection } from '../config/redis';
import { acquireInventoryExcelLock, releaseInventoryExcelLock } from './inventory-excel-lock.service';
import { parse, startOfDay, addDays, addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

const XLSX_CONTENT =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

// Get Voucher Template (for frontend form initial state)
export async function getVoucherTemplate() {
  const prefix = 'NK';
  const latestVoucherNumber = await model.getLatestVoucherNumber(prefix);
  
  let nextNumber = `${prefix}000001`;
  if (latestVoucherNumber) {
    const numericPart = latestVoucherNumber.substring(prefix.length);
    const parsed = parseInt(numericPart, 10);
    if (!isNaN(parsed)) {
      nextNumber = `${prefix}${String(parsed + 1).padStart(6, '0')}`;
    }
  }

  const today = new Date().toISOString().split('T')[0];

  return {
    voucher_number: nextNumber,
    voucher_date: today,
    unit_name: '',
    department_name: '',
    debit_account: '',
    credit_account: '',
    deliverer_name: '',
    warehouse_id: '',
    location: '',
    reference_source: '',
    original_docs_count: 0,
    total_amount_numeric: 0,
    total_amount_words: '',
    details: [],
  };
}

// Create Voucher
export async function createVoucher(dto: CreateInventoryVoucherDto) {
  const client = await model.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Validate warehouse exists and is active
    const warehouse = await model.findWarehouseById(dto.warehouse_id, client);
    if (!warehouse) throw new AppError(ErrorCode.WAREHOUSE.NOT_FOUND, 404);
    if (!warehouse.is_active) throw new AppError(ErrorCode.WAREHOUSE.INACTIVE, 400);

    // 2. Validate voucher_number uniqueness (among non-deleted)
    const existing = await model.findVoucherByNumber(dto.voucher_number, client);
    if (existing) throw new AppError(ErrorCode.VOUCHER.DUPLICATE_NUMBER, 409);

    // 3. Validate all items exist
    for (const detail of dto.details) {
      const item = await model.findItemById(detail.item_id, client);
      if (!item) throw new AppError(ErrorCode.ITEM.NOT_FOUND, 404);
    }

    // 4. Reconcile total
    const calculatedTotal = dto.details.reduce(
      (sum, d) => sum + d.quantity_actual * d.unit_price,
      0,
    );
    const tolerance = 0.01;
    if (Math.abs(dto.total_amount_numeric - calculatedTotal) > tolerance) {
      throw new AppError(ErrorCode.VALIDATION.FAILED, 400, [
        {
          field: 'total_amount_numeric',
          code: ErrorCode.VALIDATION.FAILED,
          params: { expected: calculatedTotal, actual: dto.total_amount_numeric },
        },
      ]);
    }

    // 5. Insert voucher
    const voucher = await model.insertVoucher(
      {
        voucher_number: dto.voucher_number,
        voucher_date: dto.voucher_date,
        unit_name: dto.unit_name,
        department_name: dto.department_name,
        debit_account: dto.debit_account,
        credit_account: dto.credit_account,
        deliverer_name: dto.deliverer_name!,
        warehouse_id: dto.warehouse_id,
        location: dto.location,
        reference_source: dto.reference_source,
        original_docs_count: dto.original_docs_count,
        total_amount_numeric: dto.total_amount_numeric,
        total_amount_words: dto.total_amount_words,
      },
      client,
    );

    // 6. Insert details
    const detailParams = dto.details.map((d, i) => ({
      voucher_id: voucher.id,
      item_id: d.item_id,
      item_code_snapshot: d.item_code_snapshot,
      item_name_snapshot: d.item_name_snapshot,
      unit_snapshot: d.unit_snapshot,
      quantity_by_doc: d.quantity_by_doc,
      quantity_actual: d.quantity_actual,
      unit_price: d.unit_price,
      sort_order: i + 1,
    }));

    const details = await model.insertVoucherDetails(detailParams, client);

    await client.query('COMMIT');

    return { ...voucher, details };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, 'Unexpected error in createVoucher');
    throw new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500);
  } finally {
    client.release();
  }
}

// Get Vouchers (paginated)
export async function getVouchers(
  options: Omit<model.FindVouchersOptions, 'startDate' | 'endDate'> & {
    from?: string;
    to?: string;
    tz?: string;
    ids?: string[];
  },
) {
  const { from, to, tz = 'UTC', ...rest } = options;
  const safeTz = Intl.supportedValuesOf('timeZone').includes(tz)
  ? tz
  : 'UTC';

  let startDate: string | undefined;
  let endDate: string | undefined;

  if (from) {
    const fromDate = from.includes('T') ? new Date(from) : parse(from, 'yyyy-MM-dd', new Date());
    startDate = from.includes('T') ? fromZonedTime(fromDate, safeTz).toISOString() : fromZonedTime(startOfDay(fromDate), safeTz).toISOString();
  }

  if (to) {
    const toDate = to.includes('T') ? new Date(to) : parse(to, 'yyyy-MM-dd', new Date());
    endDate = to.includes('T') ? fromZonedTime(addMinutes(toDate, 1), safeTz).toISOString() : fromZonedTime(startOfDay(addDays(toDate, 1)), safeTz).toISOString();
  }

  const { data, total } = await model.findVouchers({
    ...rest,
    startDate,
    endDate,
    ids: options.ids,
  });

  const totalPages = Math.ceil(total / (options.limit || 10));
  return { 
    data, 
    meta: { 
      total, 
      page: options.page, 
      limit: options.limit, 
      totalPages,
      timezone: safeTz
    } 
  };
}

// Get Voucher by ID
export async function getVoucherById(id: string) {
  const voucher = await model.findVoucherById(id);
  if (!voucher) throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);

  const details = await model.findVoucherDetailsById(id);
  return { ...voucher, details };
}

// Update Voucher
export async function updateVoucher(id: string, dto: UpdateInventoryVoucherDto) {
  const client = await model.pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Lock and verify voucher exists and is in draft state
    const voucher = await model.findVoucherByIdForUpdate(id, client);
    if (!voucher) throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);
    if (voucher.status !== 'draft') throw new AppError(ErrorCode.VOUCHER.INVALID_STATE, 400);

    // 2. Validate warehouse if provided
    const warehouseId = dto.warehouse_id || voucher.warehouse_id;
    if (dto.warehouse_id) {
      const warehouse = await model.findWarehouseById(dto.warehouse_id, client);
      if (!warehouse) throw new AppError(ErrorCode.WAREHOUSE.NOT_FOUND, 404);
      if (!warehouse.is_active) throw new AppError(ErrorCode.WAREHOUSE.INACTIVE, 400);
    }

    // 3. Validate voucher_number uniqueness if changed
    if (dto.voucher_number && dto.voucher_number !== voucher.voucher_number) {
      const existing = await model.findVoucherByNumber(dto.voucher_number, client);
      if (existing) throw new AppError(ErrorCode.VOUCHER.DUPLICATE_NUMBER, 409);
    }

    // 4. Validate items and reconcile total if details provided
    if (dto.details !== undefined) {
      if (dto.details.length === 0) {
        throw new AppError(ErrorCode.VALIDATION.FAILED, 400, [
          { field: 'details', code: ErrorCode.VALIDATION.ARRAY_MIN, params: { min: 1 } },
        ]);
      }

      for (const detail of dto.details) {
        const item = await model.findItemById(detail.item_id, client);
        if (!item) throw new AppError(ErrorCode.ITEM.NOT_FOUND, 404);
      }

      const calculatedTotal = dto.details.reduce(
        (sum, d) => sum + d.quantity_actual * d.unit_price,
        0,
      );
      const totalToCheck = dto.total_amount_numeric ?? voucher.total_amount_numeric;
      const tolerance = 0.01;
      if (Math.abs(Number(totalToCheck) - calculatedTotal) > tolerance) {
        throw new AppError(ErrorCode.VALIDATION.FAILED, 400, [
          {
            field: 'total_amount_numeric',
            code: ErrorCode.VALIDATION.FAILED,
            params: { expected: calculatedTotal, actual: Number(totalToCheck) },
          },
        ]);
      }
    }

    // 5. Update voucher fields
    const { details: _, ...voucherFields } = dto;
    const updated = await model.updateVoucherFields(id, voucherFields as any, client);

    // 6. Replace details if provided
    let updatedDetails: any[];
    if (dto.details !== undefined) {
      await model.deleteVoucherDetails(id, client);
      const detailParams = dto.details.map((d, i) => ({
        voucher_id: id,
        item_id: d.item_id,
        item_code_snapshot: d.item_code_snapshot,
        item_name_snapshot: d.item_name_snapshot,
        unit_snapshot: d.unit_snapshot,
        quantity_by_doc: d.quantity_by_doc,
        quantity_actual: d.quantity_actual,
        unit_price: d.unit_price,
        sort_order: i + 1,
      }));
      updatedDetails = await model.insertVoucherDetails(detailParams, client);
    } else {
      updatedDetails = await model.findVoucherDetailsById(id, client);
    }

    await client.query('COMMIT');

    return { ...updated, details: updatedDetails };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, 'Unexpected error in updateVoucher');
    throw new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500);
  } finally {
    client.release();
  }
}

// Post Voucher (Draft -> Posted)
export async function postVoucher(id: string) {
  const client = await model.pool.connect();

  try {
    await client.query('BEGIN');

    const voucher = await model.findVoucherByIdForUpdate(id, client);
    if (!voucher) throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);
    if (voucher.status === 'posted') throw new AppError(ErrorCode.VOUCHER.ALREADY_POSTED, 400);
    if (voucher.status !== 'draft') throw new AppError(ErrorCode.VOUCHER.INVALID_STATE, 400);

    await model.updateVoucherStatus(id, { status: 'posted' }, client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, 'Unexpected error in postVoucher');
    throw new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500);
  } finally {
    client.release();
  }
}

// Cancel Voucher (Draft/Posted -> Cancelled)
export async function cancelVoucher(id: string, reason: string, cancelledBy?: string) {
  const client = await model.pool.connect();

  try {
    await client.query('BEGIN');

    const voucher = await model.findVoucherByIdForUpdate(id, client);
    if (!voucher) throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);
    if (voucher.status === 'cancelled') throw new AppError(ErrorCode.VOUCHER.ALREADY_CANCELLED, 400);

    await model.updateVoucherStatus(
      id,
      { status: 'cancelled', cancel_reason: reason, cancelled_by: cancelledBy },
      client
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, 'Unexpected error in cancelVoucher');
    throw new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500);
  } finally {
    client.release();
  }
}

// Replace Voucher (Cancelled -> New Draft)
export async function replaceVoucher(oldId: string, dto: CreateInventoryVoucherDto) {
  const client = await model.pool.connect();

  try {
    await client.query('BEGIN');

    const oldVoucher = await model.findVoucherByIdForUpdate(oldId, client);
    if (!oldVoucher) throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);
    if (oldVoucher.status !== 'cancelled') throw new AppError(ErrorCode.VOUCHER.NOT_CANCELLED, 400);

    // 1. Validate warehouse
    const warehouse = await model.findWarehouseById(dto.warehouse_id, client);
    if (!warehouse) throw new AppError(ErrorCode.WAREHOUSE.NOT_FOUND, 404);
    if (!warehouse.is_active) throw new AppError(ErrorCode.WAREHOUSE.INACTIVE, 400);

    // 2. Validate voucher_number uniqueness
    const existing = await model.findVoucherByNumber(dto.voucher_number, client);
    if (existing) throw new AppError(ErrorCode.VOUCHER.DUPLICATE_NUMBER, 409);

    // 3. Validate items
    for (const detail of dto.details) {
      const item = await model.findItemById(detail.item_id, client);
      if (!item) throw new AppError(ErrorCode.ITEM.NOT_FOUND, 404);
    }

    // 4. Reconcile total
    const calculatedTotal = dto.details.reduce(
      (sum, d) => sum + d.quantity_actual * d.unit_price,
      0,
    );
    const tolerance = 0.01;
    if (Math.abs(dto.total_amount_numeric - calculatedTotal) > tolerance) {
      throw new AppError(ErrorCode.VALIDATION.FAILED, 400, [
        {
          field: 'total_amount_numeric',
          code: ErrorCode.VALIDATION.FAILED,
          params: { expected: calculatedTotal, actual: dto.total_amount_numeric },
        },
      ]);
    }

    // 5. Insert voucher with replaced_from_id
    const voucher = await model.insertVoucher(
      {
        ...dto,
        deliverer_name: dto.deliverer_name!,
        original_docs_count: dto.original_docs_count ?? 0,
        replaced_from_id: oldId,
      },
      client,
    );

    // 6. Insert details
    const detailParams = dto.details.map((d, i) => ({
      ...d,
      voucher_id: voucher.id,
      sort_order: i + 1,
    }));

    const details = await model.insertVoucherDetails(detailParams, client);

    await client.query('COMMIT');

    return { ...voucher, details };
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, 'Unexpected error in replaceVoucher');
    throw new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500);
  } finally {
    client.release();
  }
}

// Delete Draft Voucher (Hard Delete)
export async function deleteDraftVoucher(id: string) {
  const client = await model.pool.connect();

  try {
    await client.query('BEGIN');

    const voucher = await model.findVoucherByIdForUpdate(id, client);
    if (!voucher) {
      throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);
    }
    
    if (voucher.status !== 'draft') {
      throw new AppError(ErrorCode.VOUCHER.INVALID_STATE, 400);
    }

    await model.deleteVoucherDetails(id, client);
    await model.hardDeleteVoucher(id, client);

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    if (error instanceof AppError) throw error;
    logger.error({ err: error }, 'Unexpected error in deleteDraftVoucher');
    throw new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500);
  } finally {
    client.release();
  }
}

export async function enqueueVoucherExport(options: {
  mode?: 'list_all' | 'list_selected' | 'forms_selected' | 'form_single';
  requestedBy?: string;
  voucherIds?: string[];
  voucherId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  templatePath?: string;
  excelClientId: string;
}) {
  const excelClientId = options.excelClientId.trim();
  if (!excelClientId) {
    throw new AppError(ErrorCode.VALIDATION.REQUIRED, 400, [
      { field: 'excelClientId', code: ErrorCode.VALIDATION.REQUIRED },
    ]);
  }

  const mode = options.mode || 'list_all';
  const allowedModes = ['list_all', 'list_selected', 'forms_selected', 'form_single'];
  if (!allowedModes.includes(mode)) {
    throw new AppError(ErrorCode.VALIDATION.INVALID_FORMAT, 400, [
      { field: 'mode', code: ErrorCode.VALIDATION.INVALID_FORMAT },
    ]);
  }

  const voucherIds = mode === 'form_single'
    ? options.voucherId ? [options.voucherId] : []
    : options.voucherIds || [];

  if ((mode === 'list_selected' || mode === 'forms_selected') && !Array.isArray(options.voucherIds)) {
    throw new AppError(ErrorCode.VALIDATION.INVALID_TYPE, 400, [
      { field: 'voucherIds', code: ErrorCode.VALIDATION.INVALID_TYPE },
    ]);
  }

  if ((mode === 'list_selected' || mode === 'forms_selected' || mode === 'form_single') && voucherIds.length === 0) {
    throw new AppError(ErrorCode.VALIDATION.REQUIRED, 400, [
      { field: mode === 'form_single' ? 'voucherId' : 'voucherIds', code: ErrorCode.VALIDATION.REQUIRED },
    ]);
  }

  const redis = getRedisConnection();
  
  let estimatedCount = 20;
  if (mode === 'form_single') {
    estimatedCount = 1;
  } else if (mode === 'list_selected' || mode === 'forms_selected') {
    estimatedCount = voucherIds.length;
  } else {
    const { meta } = await getVouchers({ 
      page: 1, 
      limit: 1, 
      status: options.status,
      from: options.startDate,
      to: options.endDate 
    }).catch(() => ({ meta: { total: 100 } }));
    estimatedCount = meta.total || 100;
  }

  // 2. Calculate Dynamic TTL and Job Timeout
  const ttl = Math.min(3600, Math.max(300, Math.ceil(300 + estimatedCount * 0.1)));

  const inventoryExcelQueue = getInventoryExcelQueue();
  const jobId = `export-${excelClientId}`;

  // 1. Check for existing lock and verify if it's stale
  let locked = await acquireInventoryExcelLock(redis, excelClientId, ttl, jobId);
  if (!locked) {
    const existingJobId = await redis.get(`inv-excel:lock:${excelClientId}`);
    const job = existingJobId ? await inventoryExcelQueue.getJob(existingJobId) : null;
    const state = job ? await job.getState() : null;

    const isActive = state && ['active', 'waiting', 'delayed'].includes(state);
    if (isActive) {
      throw new AppError(ErrorCode.COMMON.CONFLICT, 409, [
        { field: 'excel', code: ErrorCode.COMMON.CONFLICT },
      ]);
    }

    // Lock is stale: Force release and re-acquire
    await releaseInventoryExcelLock(redis, excelClientId);
    locked = await acquireInventoryExcelLock(redis, excelClientId, ttl, jobId);
    if (!locked) {
      throw new AppError(ErrorCode.COMMON.CONFLICT, 409, [
        { field: 'excel', code: ErrorCode.COMMON.CONFLICT },
      ]);
    }
  }

  try {
    // If a completed/failed job exists with the same ID, remove it to avoid BullMQ dupe error
    const oldJob = await inventoryExcelQueue.getJob(jobId);
    if (oldJob) await oldJob.remove();

    const job = await inventoryExcelQueue.add(
      'export-vouchers',
      {
        mode,
        voucherIds,
        voucherId: options.voucherId,
        status: options.status,
        startDate: options.startDate,
        endDate: options.endDate,
        templatePath: options.templatePath,
        requestedBy: options.requestedBy,
        excelClientId,
        lockTtl: ttl,
      },
      {
        jobId, // Use stable job ID for better tracking
        delay: 5000,
      }
    );
    return { jobId: job.id, state: await job.getState() };
  } catch (error) {
    await releaseInventoryExcelLock(redis, excelClientId);
    throw error;
  }
}

export async function enqueueVoucherImportFromUpload(file: Express.Multer.File, excelClientId: string) {
  const clientId = excelClientId.trim();
  if (!clientId) {
    throw new AppError(ErrorCode.VALIDATION.REQUIRED, 400, [
      { field: 'excelClientId', code: ErrorCode.VALIDATION.REQUIRED },
    ]);
  }

  const redis = getRedisConnection();
  const inventoryExcelQueue = getInventoryExcelQueue();
  const jobId = `import-${clientId}`;

  let locked = await acquireInventoryExcelLock(redis, clientId, 600, jobId);
  if (!locked) {
    const existingJobId = await redis.get(`inv-excel:lock:${clientId}`);
    const job = existingJobId ? await inventoryExcelQueue.getJob(existingJobId) : null;
    const state = job ? await job.getState() : null;

    if (state && ['active', 'waiting', 'delayed'].includes(state)) {
      throw new AppError(ErrorCode.COMMON.CONFLICT, 409, [
        { field: 'excel', code: ErrorCode.COMMON.CONFLICT },
      ]);
    }

    await releaseInventoryExcelLock(redis, clientId);
    locked = await acquireInventoryExcelLock(redis, clientId, 600, jobId);
  }

  try {
    const oldJob = await inventoryExcelQueue.getJob(jobId);
    if (oldJob) await oldJob.remove();
    const buf = await fs.promises.readFile(file.path);
    let importS3Key: string | undefined;
    let localFilePath: string | undefined;

    const s3cfg = readS3ConfigFromEnv();
    if (s3cfg) {
      const client = createS3Client(s3cfg);
      const key = `excel/imports/${randomUUID()}/${path.basename(file.filename)}`;
      await putObjectBuffer({
        client,
        bucket: s3cfg.bucket,
        key,
        body: buf,
        contentType: XLSX_CONTENT,
      });
      importS3Key = key;
      await fs.promises.unlink(file.path).catch(() => undefined);
    } else {
      localFilePath = path.resolve(file.path);
    }

    const job = await inventoryExcelQueue.add('import-vouchers', {
      importS3Key,
      filePath: localFilePath,
      excelClientId: clientId,
    });
    return { jobId: job.id, state: await job.getState() };
  } catch (error) {
    await releaseInventoryExcelLock(redis, clientId);
    await fs.promises.unlink(file.path).catch(() => undefined);
    throw error;
  }
}

export async function getInventoryExcelJob(jobId: string): Promise<InventoryExcelJobStatus> {
  const inventoryExcelQueue = getInventoryExcelQueue();
  const job = await inventoryExcelQueue.getJob(jobId);
  if (!job) throw new AppError(ErrorCode.COMMON.NOT_FOUND, 404);

  const state = await job.getState();
  const baseRv = job.returnvalue as InventoryExcelJobResult | null | undefined;
  let returnvalue: InventoryExcelJobResult | null = baseRv ?? null;

  const out: InventoryExcelJobStatus = {
    jobId: job.id,
    name: job.name,
    state,
    progress: job.progress,
    failedReason: job.failedReason,
    returnvalue,
  };

  if (state === 'completed' && job.name === 'export-vouchers' && returnvalue?.fileName) {
    const rel = `/api/inventory/excel-jobs/${jobId}/download`;
    const full = config.publicAppOrigin ? `${config.publicAppOrigin}${rel}` : rel;
    returnvalue = { ...returnvalue, downloadPath: full };
    out.downloadPath = full;
    out.returnvalue = returnvalue;

    const s3cfg = readS3ConfigFromEnv();
    if (s3cfg && returnvalue.storage === 's3' && returnvalue.s3Key) {
      const client = createS3Client(s3cfg);
      const presignedUrl = await presignGetObject({
        client,
        bucket: s3cfg.bucket,
        key: returnvalue.s3Key,
        expiresInSeconds: Math.min(1800, config.excelS3FileTtlSeconds),
      });
      returnvalue = { ...returnvalue, presignedUrl, fileExpiresInSeconds: config.excelS3FileTtlSeconds };
      out.returnvalue = returnvalue;
    }
  }

  return out;
}

export async function streamInventoryExcelDownload(jobId: string, res: Response) {
  const inventoryExcelQueue = getInventoryExcelQueue();
  const job = await inventoryExcelQueue.getJob(jobId);
  if (!job) throw new AppError(ErrorCode.COMMON.NOT_FOUND, 404);

  const state = await job.getState();
  if (state !== 'completed') {
    throw new AppError(ErrorCode.VALIDATION.FAILED, 400, [
      { field: 'jobId', code: ErrorCode.VALIDATION.FAILED, params: { reason: 'not_completed' } },
    ]);
  }
  if (job.name !== 'export-vouchers') {
    throw new AppError(ErrorCode.VALIDATION.FAILED, 400, [
      { field: 'jobId', code: ErrorCode.VALIDATION.FAILED, params: { reason: 'not_export_job' } },
    ]);
  }

  const rv = job.returnvalue as InventoryExcelJobResult | undefined;
  if (!rv?.fileName) {
    throw new AppError(ErrorCode.COMMON.NOT_FOUND, 404);
  }

  const s3cfg = readS3ConfigFromEnv();
  if (rv.storage === 's3' && rv.s3Key && s3cfg) {
    const client = createS3Client(s3cfg);
    const stream = await getObjectStream({ client, bucket: s3cfg.bucket, key: rv.s3Key });
    res.setHeader('Content-Type', XLSX_CONTENT);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rv.fileName)}`);
    stream.pipe(res);
    return;
  }

  const localPath =
    rv.filePath && fs.existsSync(rv.filePath)
      ? rv.filePath
      : path.join(config.excelSharedExportDir, path.basename(rv.fileName));
  if (!fs.existsSync(localPath)) {
    throw new AppError(ErrorCode.COMMON.NOT_FOUND, 404);
  }

  res.setHeader('Content-Type', XLSX_CONTENT);
  res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(rv.fileName)}`);
  fs.createReadStream(localPath).pipe(res);
}
