import {
  CreateInventoryVoucherDto,
  UpdateInventoryVoucherDto,
  ErrorCode,
} from '@repo/types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';
import * as model from '../models/inventory.model';
import { parse, startOfDay, addDays, addMinutes } from 'date-fns';
import { fromZonedTime } from 'date-fns-tz';

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
