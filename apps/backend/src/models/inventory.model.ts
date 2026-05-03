import { Pool, PoolClient } from 'pg';
import { pool } from '../config/database';

// Warehouse Queries
export async function findWarehouseById(id: string, client?: PoolClient) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT id, code, name, is_active FROM warehouses WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Item Queries
export async function findItemById(id: string, client?: PoolClient) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT id, code, name, unit_name FROM inventory_items WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

// Voucher Queries
export async function findVoucherByNumber(voucherNumber: string, client?: PoolClient) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT id FROM inventory_vouchers WHERE voucher_number = $1`,
    [voucherNumber],
  );
  return rows[0] || null;
}

export async function getLatestVoucherNumber(prefix: string, client?: PoolClient) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT voucher_number FROM inventory_vouchers 
     WHERE voucher_number LIKE $1 
     ORDER BY voucher_number DESC LIMIT 1`,
    [`${prefix}%`],
  );
  return rows[0]?.voucher_number || null;
}

export async function findVoucherById(id: string, client?: PoolClient) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, replaced_from_id, cancelled_at, cancelled_by, cancel_reason, created_at, updated_at
     FROM inventory_vouchers WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findVoucherByIdForUpdate(id: string, client: PoolClient) {
  const { rows } = await client.query(
    `SELECT id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, replaced_from_id, cancelled_at, cancelled_by, cancel_reason, created_at, updated_at 
     FROM inventory_vouchers WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

export async function findVoucherDetailsById(voucherId: string, client?: PoolClient) {
  const executor = client || pool;
  const { rows } = await executor.query(
    `SELECT id, voucher_id, item_id, item_code_snapshot, item_name_snapshot, unit_snapshot, quantity_by_doc, quantity_actual, unit_price, total_price, sort_order, created_at, updated_at
     FROM inventory_voucher_details WHERE voucher_id = $1 ORDER BY sort_order ASC`,
    [voucherId],
  );
  return rows;
}

export interface FindVouchersOptions {
  page: number;
  limit: number;
  search?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export async function findVouchers(options: FindVouchersOptions) {
  const { 
    page, 
    limit, 
    search, 
    status, 
    startDate, 
    endDate, 
    sortBy, 
    sortOrder = 'desc' 
  } = options;
  const offset = (page - 1) * limit;
  const values: any[] = [];
  const conditions: string[] = [];
  let paramIdx = 1;

  // Build WHERE conditions
  if (search) {
    conditions.push(`(voucher_number ILIKE $${paramIdx} OR deliverer_name ILIKE $${paramIdx})`);
    values.push(`%${search}%`);
    paramIdx++;
  }

  if (status) {
    const statusList = status.split(',');
    conditions.push(`status = ANY($${paramIdx})`);
    values.push(statusList);
    paramIdx++;
  } 

  if (startDate) {
    conditions.push(`voucher_date >= $${paramIdx}`);
    values.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    conditions.push(`voucher_date < $${paramIdx}`);
    values.push(endDate);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Count total matching records
  const countResult = await pool.query(
    `SELECT COUNT(id) FROM inventory_vouchers ${whereClause}`,
    values
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Build ORDER BY clause
  const allowedSortFields = [
    'voucher_number', 
    'voucher_date', 
    'deliverer_name', 
    'total_amount_numeric', 
    'created_at', 
    'status'
  ];
  
  // Map frontend field names to db column names if necessary
  const fieldMapping: Record<string, string> = {
    'voucherNo': 'voucher_number',
    'date': 'voucher_date',
    'supplier': 'deliverer_name',
    'totalAmount': 'total_amount_numeric',
  };

  const dbSortField = fieldMapping[sortBy || ''] || sortBy || 'created_at';
  const finalSortField = allowedSortFields.includes(dbSortField) ? dbSortField : 'created_at';
  const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const limitParamIdx = paramIdx++;
  const offsetParamIdx = paramIdx++;
  values.push(limit, offset);

  const { rows } = await pool.query(
    `SELECT id, voucher_number, voucher_date, deliverer_name, warehouse_id, total_amount_numeric, created_by, status, created_at 
     FROM inventory_vouchers 
     ${whereClause} 
     ORDER BY ${finalSortField} ${finalSortOrder} 
     LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
    values,
  );

  return { data: rows, total };
}

// Voucher Mutations
export interface InsertVoucherParams {
  voucher_number: string;
  voucher_date: string;
  unit_name?: string;
  department_name?: string;
  debit_account?: string;
  credit_account?: string;
  deliverer_name: string;
  warehouse_id: string;
  location?: string;
  reference_source?: string;
  original_docs_count?: number;
  total_amount_numeric: number;
  total_amount_words?: string;
  replaced_from_id?: string;
  created_by?: string;
}

export async function insertVoucher(params: InsertVoucherParams, client: PoolClient) {
  const { rows } = await client.query(
    `INSERT INTO inventory_vouchers (
      voucher_number, voucher_date, unit_name, department_name,
      debit_account, credit_account, deliverer_name, warehouse_id,
      location, reference_source, original_docs_count,
      total_amount_numeric, total_amount_words, replaced_from_id, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, replaced_from_id, created_at, updated_at`,
    [
      params.voucher_number, params.voucher_date, params.unit_name || null,
      params.department_name || null, params.debit_account || null,
      params.credit_account || null, params.deliverer_name, params.warehouse_id,
      params.location || null, params.reference_source || null,
      params.original_docs_count ?? 0, params.total_amount_numeric,
      params.total_amount_words || null, params.replaced_from_id || null, params.created_by || null,
    ],
  );
  return rows[0];
}

export interface InsertDetailParams {
  voucher_id: string;
  item_id: string;
  item_code_snapshot?: string;
  item_name_snapshot?: string;
  unit_snapshot?: string;
  quantity_by_doc: number;
  quantity_actual: number;
  unit_price: number;
  sort_order: number;
}

export async function insertVoucherDetails(details: InsertDetailParams[], client: PoolClient) {
  if (details.length === 0) return [];

  const values: any[] = [];
  const placeholders = details.map((d, i) => {
    const base = i * 9;
    values.push(
      d.voucher_id, d.item_id, d.item_code_snapshot || null,
      d.item_name_snapshot || null, d.unit_snapshot || null,
      d.quantity_by_doc, d.quantity_actual, d.unit_price, d.sort_order,
    );
    return `($${base+1},$${base+2},$${base+3},$${base+4},$${base+5},$${base+6},$${base+7},$${base+8},$${base+9})`;
  });

  const { rows } = await client.query(
    `INSERT INTO inventory_voucher_details (
      voucher_id, item_id, item_code_snapshot, item_name_snapshot,
      unit_snapshot, quantity_by_doc, quantity_actual, unit_price, sort_order
    ) VALUES ${placeholders.join(',')}
    RETURNING id, voucher_id, item_id, item_code_snapshot, item_name_snapshot, unit_snapshot, quantity_by_doc, quantity_actual, unit_price, total_price, sort_order, created_at, updated_at`,
    values,
  );
  return rows;
}

export async function updateVoucherFields(
  id: string,
  params: Partial<InsertVoucherParams> & { updated_by?: string },
  client: PoolClient,
) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const allowedKeys: (keyof typeof params)[] = [
    'voucher_number', 'voucher_date', 'unit_name', 'department_name',
    'debit_account', 'credit_account', 'deliverer_name', 'warehouse_id',
    'location', 'reference_source', 'original_docs_count',
    'total_amount_numeric', 'total_amount_words', 'updated_by',
  ];

  for (const key of allowedKeys) {
    if (params[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(params[key]);
    }
  }

  fields.push(`updated_at = CURRENT_TIMESTAMP`);
  values.push(id);

  const { rows } = await client.query(
    `UPDATE inventory_vouchers SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, created_at, updated_at`,
    values,
  );
  return rows[0] || null;
}

export async function deleteVoucherDetails(voucherId: string, client: PoolClient) {
  await client.query(
    `DELETE FROM inventory_voucher_details WHERE voucher_id = $1`,
    [voucherId],
  );
}

export async function updateVoucherStatus(
  id: string,
  params: { status: 'posted' | 'cancelled'; cancel_reason?: string; cancelled_by?: string },
  client: PoolClient
) {
  if (params.status === 'cancelled') {
    const { rows } = await client.query(
      `UPDATE inventory_vouchers SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancel_reason = $2, cancelled_by = $3, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id, params.cancel_reason || null, params.cancelled_by || null],
    );
    return rows[0] || null;
  } else {
    const { rows } = await client.query(
      `UPDATE inventory_vouchers SET status = 'posted', updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING id`,
      [id],
    );
    return rows[0] || null;
  }
}

export async function hardDeleteVoucher(id: string, client: PoolClient) {
  const { rows } = await client.query(
    `DELETE FROM inventory_vouchers WHERE id = $1 RETURNING id`,
    [id],
  );
  return rows[0] || null;
}

export { pool };
