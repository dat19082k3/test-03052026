import type { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

export type QueryExecutor = Pick<Pool | PoolClient, 'query'>;

const VOUCHER_COLUMNS =
  'id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, replaced_from_id, cancelled_at, cancelled_by, cancel_reason, created_at, updated_at';

const DETAIL_COLUMNS =
  'id, voucher_id, item_id, item_code_snapshot, item_name_snapshot, unit_snapshot, quantity_by_doc, quantity_actual, unit_price, total_price, sort_order, created_at, updated_at';

async function query<T extends QueryResultRow = any>(executor: QueryExecutor, text: string, values?: any[]) {
  return executor.query(text, values) as Promise<QueryResult<T>>;
}

export async function findWarehouseById(executor: QueryExecutor, id: string) {
  const { rows } = await query(
    executor,
    'SELECT id, code, name, is_active FROM warehouses WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

export async function findItemById(executor: QueryExecutor, id: string) {
  const { rows } = await query(
    executor,
    'SELECT id, code, name, unit_name FROM inventory_items WHERE id = $1',
    [id],
  );
  return rows[0] || null;
}

export async function findVoucherByNumber(executor: QueryExecutor, voucherNumber: string) {
  const { rows } = await query(
    executor,
    'SELECT id FROM inventory_vouchers WHERE voucher_number = $1',
    [voucherNumber],
  );
  return rows[0] || null;
}

export async function getLatestVoucherNumber(executor: QueryExecutor, prefix: string) {
  const { rows } = await query(
    executor,
    `SELECT voucher_number FROM inventory_vouchers
     WHERE voucher_number LIKE $1
     ORDER BY voucher_number DESC LIMIT 1`,
    [`${prefix}%`],
  );
  return rows[0]?.voucher_number || null;
}

export async function findVoucherById(executor: QueryExecutor, id: string) {
  const { rows } = await query(
    executor,
    `SELECT ${VOUCHER_COLUMNS} FROM inventory_vouchers WHERE id = $1`,
    [id],
  );
  return rows[0] || null;
}

export async function findVoucherByIdForUpdate(executor: QueryExecutor, id: string) {
  const { rows } = await query(
    executor,
    `SELECT ${VOUCHER_COLUMNS} FROM inventory_vouchers WHERE id = $1 FOR UPDATE`,
    [id],
  );
  return rows[0] || null;
}

export async function findVoucherDetailsById(executor: QueryExecutor, voucherId: string) {
  const { rows } = await query(
    executor,
    `SELECT ${DETAIL_COLUMNS}
     FROM inventory_voucher_details
     WHERE voucher_id = $1
     ORDER BY sort_order ASC`,
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
  ids?: string[];
}

export function buildVoucherFilters(
  options: Pick<FindVouchersOptions, 'search' | 'status' | 'startDate' | 'endDate' | 'ids'> & {
    excludeCancelledByDefault?: boolean;
  },
) {
  const values: any[] = [];
  const conditions: string[] = [];
  let paramIdx = 1;

  if (options.search) {
    conditions.push(`(voucher_number ILIKE $${paramIdx} OR deliverer_name ILIKE $${paramIdx})`);
    values.push(`%${options.search}%`);
    paramIdx++;
  }

  if (options.status) {
    conditions.push(`status = ANY($${paramIdx})`);
    values.push(options.status.split(','));
    paramIdx++;
  }

  if (options.startDate) {
    conditions.push(`voucher_date >= $${paramIdx}`);
    values.push(options.startDate);
    paramIdx++;
  }

  if (options.endDate) {
    conditions.push(`voucher_date < $${paramIdx}`);
    values.push(options.endDate);
    paramIdx++;
  }
  
  if (options.ids !== undefined) {
    if (options.ids.length === 0) {
      return { values: [], nextParamIdx: 1, whereClause: 'WHERE 1 = 0' };
    }
    conditions.push(`id = ANY($${paramIdx})`);
    values.push(options.ids);
    paramIdx++;
  }

  return {
    values,
    nextParamIdx: paramIdx,
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '',
  };
}

export function resolveVoucherSort(sortBy?: string, sortOrder: 'asc' | 'desc' = 'desc') {
  const allowedSortFields = [
    'voucher_number',
    'voucher_date',
    'deliverer_name',
    'total_amount_numeric',
    'created_at',
    'status',
  ];

  const fieldMapping: Record<string, string> = {
    voucherNo: 'voucher_number',
    date: 'voucher_date',
    supplier: 'deliverer_name',
    totalAmount: 'total_amount_numeric',
  };

  const dbSortField = fieldMapping[sortBy || ''] || sortBy || 'created_at';
  const finalSortField = allowedSortFields.includes(dbSortField) ? dbSortField : 'created_at';
  const finalSortOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  return { finalSortField, finalSortOrder };
}

export async function findVouchers(executor: QueryExecutor, options: FindVouchersOptions) {
  const { page, limit, sortBy, sortOrder = 'desc' } = options;
  const offset = (page - 1) * limit;
  const filters = buildVoucherFilters({ ...options, excludeCancelledByDefault: true });

  const countResult = await query(
    executor,
    `SELECT COUNT(id) FROM inventory_vouchers ${filters.whereClause}`,
    filters.values,
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const { finalSortField, finalSortOrder } = resolveVoucherSort(sortBy, sortOrder);
  const values = [...filters.values, limit, offset];
  const limitParamIdx = filters.nextParamIdx;
  const offsetParamIdx = filters.nextParamIdx + 1;

  const { rows } = await query(
    executor,
    `SELECT id, voucher_number, voucher_date, deliverer_name, warehouse_id, total_amount_numeric, created_by, status, created_at
     FROM inventory_vouchers
     ${filters.whereClause}
     ORDER BY ${finalSortField} ${finalSortOrder}
     LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx}`,
    values,
  );

  return { data: rows, total };
}

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

export async function insertVoucher(executor: QueryExecutor, params: InsertVoucherParams) {
  const { rows } = await query(
    executor,
    `INSERT INTO inventory_vouchers (
      voucher_number, voucher_date, unit_name, department_name,
      debit_account, credit_account, deliverer_name, warehouse_id,
      location, reference_source, original_docs_count,
      total_amount_numeric, total_amount_words, replaced_from_id, created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
    RETURNING id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, replaced_from_id, created_at, updated_at`,
    [
      params.voucher_number,
      params.voucher_date,
      params.unit_name || null,
      params.department_name || null,
      params.debit_account || null,
      params.credit_account || null,
      params.deliverer_name,
      params.warehouse_id,
      params.location || null,
      params.reference_source || null,
      params.original_docs_count ?? 0,
      params.total_amount_numeric,
      params.total_amount_words || null,
      params.replaced_from_id || null,
      params.created_by || null,
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

export async function insertVoucherDetails(executor: QueryExecutor, details: InsertDetailParams[]) {
  if (details.length === 0) return [];

  const values: any[] = [];
  const placeholders = details.map((d, i) => {
    const base = i * 9;
    values.push(
      d.voucher_id,
      d.item_id,
      d.item_code_snapshot || null,
      d.item_name_snapshot || null,
      d.unit_snapshot || null,
      d.quantity_by_doc,
      d.quantity_actual,
      d.unit_price,
      d.sort_order,
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6},$${base + 7},$${base + 8},$${base + 9})`;
  });

  const { rows } = await query(
    executor,
    `INSERT INTO inventory_voucher_details (
      voucher_id, item_id, item_code_snapshot, item_name_snapshot,
      unit_snapshot, quantity_by_doc, quantity_actual, unit_price, sort_order
    ) VALUES ${placeholders.join(',')}
    RETURNING ${DETAIL_COLUMNS}`,
    values,
  );
  return rows;
}

export async function updateVoucherFields(
  executor: QueryExecutor,
  id: string,
  params: Partial<InsertVoucherParams> & { updated_by?: string },
) {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  const allowedKeys: (keyof typeof params)[] = [
    'voucher_number',
    'voucher_date',
    'unit_name',
    'department_name',
    'debit_account',
    'credit_account',
    'deliverer_name',
    'warehouse_id',
    'location',
    'reference_source',
    'original_docs_count',
    'total_amount_numeric',
    'total_amount_words',
    'updated_by',
  ];

  for (const key of allowedKeys) {
    if (params[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(params[key]);
    }
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(id);

  const { rows } = await query(
    executor,
    `UPDATE inventory_vouchers
     SET ${fields.join(', ')}
     WHERE id = $${idx}
     RETURNING id, voucher_number, voucher_date, unit_name, department_name, debit_account, credit_account, deliverer_name, warehouse_id, location, reference_source, original_docs_count, total_amount_numeric, total_amount_words, created_by, is_active, status, created_at, updated_at`,
    values,
  );
  return rows[0] || null;
}

export async function deleteVoucherDetails(executor: QueryExecutor, voucherId: string) {
  await query(executor, 'DELETE FROM inventory_voucher_details WHERE voucher_id = $1', [voucherId]);
}

export async function updateVoucherStatus(
  executor: QueryExecutor,
  id: string,
  params: { status: 'posted' | 'cancelled'; cancel_reason?: string; cancelled_by?: string },
) {
  if (params.status === 'cancelled') {
    const { rows } = await query(
      executor,
      `UPDATE inventory_vouchers
       SET status = 'cancelled', cancelled_at = CURRENT_TIMESTAMP, cancel_reason = $2, cancelled_by = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id`,
      [id, params.cancel_reason || null, params.cancelled_by || null],
    );
    return rows[0] || null;
  }

  const { rows } = await query(
    executor,
    `UPDATE inventory_vouchers
     SET status = 'posted', updated_at = CURRENT_TIMESTAMP
     WHERE id = $1
     RETURNING id`,
    [id],
  );
  return rows[0] || null;
}

export async function hardDeleteVoucher(executor: QueryExecutor, id: string) {
  const { rows } = await query(executor, 'DELETE FROM inventory_vouchers WHERE id = $1 RETURNING id', [id]);
  return rows[0] || null;
}

export interface ExportVouchersOptions {
  batchSize: number;
  lastCreatedAt?: string;
  lastId?: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  voucherIds?: string[];
}

export async function findVouchersForExport(executor: QueryExecutor, options: ExportVouchersOptions) {
  const filters = buildVoucherFilters({
    status: options.status,
    startDate: options.startDate,
    endDate: options.endDate,
    excludeCancelledByDefault: !options.status,
  });
  const conditions = filters.whereClause ? [filters.whereClause.replace(/^WHERE /, '')] : [];
  const values = [...filters.values];
  let idx = filters.nextParamIdx;

  if (options.voucherIds?.length) {
    conditions.push(`v.id = ANY($${idx})`);
    values.push(options.voucherIds);
    idx++;
  }

  if (options.lastCreatedAt && options.lastId) {
    conditions.push(`(v.created_at, v.id) > ($${idx}, $${idx + 1})`);
    values.push(options.lastCreatedAt, options.lastId);
    idx += 2;
  }

  values.push(options.batchSize);

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const { rows } = await query(
    executor,
    `SELECT
       v.id,
       v.voucher_number,
       v.voucher_date,
       v.status,
       v.unit_name,
       v.department_name,
       v.debit_account,
       v.credit_account,
       v.deliverer_name,
       v.warehouse_id,
       w.code AS warehouse_code,
       w.name AS warehouse_name,
       v.total_amount_numeric,
       v.cancel_reason,
       v.created_at,
       COALESCE(detail_stats.detail_count, 0)::int AS detail_count
     FROM inventory_vouchers v
     LEFT JOIN warehouses w ON w.id = v.warehouse_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS detail_count
       FROM inventory_voucher_details d
       WHERE d.voucher_id = v.id
     ) detail_stats ON TRUE
     ${whereClause}
     ORDER BY v.created_at ASC, v.id ASC
     LIMIT $${idx}`,
    values,
  );
  return rows;
}

export async function findVouchersByIdsForExport(executor: QueryExecutor, voucherIds: string[]) {
  if (voucherIds.length === 0) return [];

  const { rows } = await query(
    executor,
    `SELECT
       v.id,
       v.voucher_number,
       v.voucher_date,
       v.status,
       v.unit_name,
       v.department_name,
       v.debit_account,
       v.credit_account,
       v.deliverer_name,
       v.warehouse_id,
       w.code AS warehouse_code,
       w.name AS warehouse_name,
       v.total_amount_numeric,
       v.created_at,
       COALESCE(detail_stats.detail_count, 0)::int AS detail_count
     FROM unnest($1::uuid[]) WITH ORDINALITY selected(id, ord)
     JOIN inventory_vouchers v ON v.id = selected.id
     LEFT JOIN warehouses w ON w.id = v.warehouse_id
     LEFT JOIN LATERAL (
       SELECT COUNT(*) AS detail_count
       FROM inventory_voucher_details d
       WHERE d.voucher_id = v.id
     ) detail_stats ON TRUE
     ORDER BY selected.ord ASC`,
    [voucherIds],
  );
  return rows;
}

export async function getVouchersFingerprint(executor: QueryExecutor, options: Pick<ExportVouchersOptions, 'status' | 'startDate' | 'endDate' | 'voucherIds'>) {
  const filters = buildVoucherFilters({
    status: options.status,
    startDate: options.startDate,
    endDate: options.endDate,
    ids: options.voucherIds,
    excludeCancelledByDefault: !options.status,
  });

  const { rows } = await query(
    executor,
    `SELECT
       COUNT(id) as total_count,
       MAX(updated_at) as max_updated_at
     FROM inventory_vouchers v
     ${filters.whereClause}`,
    filters.values,
  );

  const stats = rows[0];
  const count = parseInt(stats.total_count, 10);
  const updatedAt = stats.max_updated_at ? new Date(stats.max_updated_at).getTime() : 0;
  
  return `${count}-${updatedAt}`;
}

export async function findVoucherPrintDataByIds(executor: QueryExecutor, voucherIds: string[]) {
  if (voucherIds.length === 0) return [];

  const voucherResult = await query(
    executor,
    `SELECT
       selected.ord,
       v.${VOUCHER_COLUMNS.replace(/, /g, ', v.')},
       w.code AS warehouse_code,
       w.name AS warehouse_name,
       w.address AS warehouse_address
     FROM unnest($1::uuid[]) WITH ORDINALITY selected(id, ord)
     JOIN inventory_vouchers v ON v.id = selected.id
     LEFT JOIN warehouses w ON w.id = v.warehouse_id
     ORDER BY selected.ord ASC`,
    [voucherIds],
  );

  const detailResult = await query(
    executor,
    `SELECT
       d.${DETAIL_COLUMNS.replace(/, /g, ', d.')},
       selected.ord AS voucher_ord
     FROM unnest($1::uuid[]) WITH ORDINALITY selected(id, ord)
     JOIN inventory_voucher_details d ON d.voucher_id = selected.id
     ORDER BY selected.ord ASC, d.sort_order ASC`,
    [voucherIds],
  );

  const detailsByVoucherId = new Map<string, any[]>();
  for (const detail of detailResult.rows) {
    const details = detailsByVoucherId.get(detail.voucher_id) || [];
    details.push(detail);
    detailsByVoucherId.set(detail.voucher_id, details);
  }

  return voucherResult.rows.map((voucher) => ({
    ...voucher,
    details: detailsByVoucherId.get(voucher.id) || [],
  }));
}

export interface ImportVoucherRow {
  voucher_number: string;
  voucher_date: string;
  deliverer_name: string;
  warehouse_id: string;
  total_amount_numeric: number;
  status?: 'draft' | 'posted' | 'cancelled';
}

export async function bulkUpsertVouchersForImport(executor: QueryExecutor, rowsToImport: ImportVoucherRow[]) {
  if (rowsToImport.length === 0) return 0;

  const values: any[] = [];
  const placeholders = rowsToImport.map((row, i) => {
    const base = i * 6;
    values.push(
      row.voucher_number,
      row.voucher_date,
      row.deliverer_name,
      row.warehouse_id,
      row.total_amount_numeric,
      row.status || 'draft',
    );
    return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},$${base + 5},$${base + 6})`;
  });

  const result = await query(
    executor,
    `INSERT INTO inventory_vouchers (
       voucher_number, voucher_date, deliverer_name, warehouse_id, total_amount_numeric, status
     ) VALUES ${placeholders.join(',')}
     ON CONFLICT (voucher_number) DO UPDATE SET
       voucher_date = EXCLUDED.voucher_date,
       deliverer_name = EXCLUDED.deliverer_name,
       warehouse_id = EXCLUDED.warehouse_id,
       total_amount_numeric = EXCLUDED.total_amount_numeric,
       status = EXCLUDED.status,
       updated_at = CURRENT_TIMESTAMP`,
    values,
  );

  return result.rowCount || 0;
}
