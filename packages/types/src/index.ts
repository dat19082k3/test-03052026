export interface Warehouse {
  id: string; // UUID
  code: string;
  name: string;
  address?: string | null;
  is_active: boolean;
  created_at: string | Date;
}

export interface InventoryItem {
  id: string; // UUID
  code: string;
  name: string;
  unit_name?: string | null;
  description?: string | null;
  created_at: string | Date;
}

export interface InventoryVoucher {
  id: string; // UUID
  voucher_number: string;
  voucher_date: string | Date;
  
  unit_name?: string | null;
  department_name?: string | null;
  
  debit_account?: string | null;
  credit_account?: string | null;
  
  deliverer_name?: string | null;
  warehouse_id?: string | null; // UUID references warehouses(id)
  location?: string | null;
  
  reference_source?: string | null;
  original_docs_count: number;
  
  total_amount_numeric: number;
  total_amount_words?: string | null;
  
  created_by?: string | null; // UUID
  updated_by?: string | null; // UUID
  created_at: string | Date;
  updated_at: string | Date;
  deleted_at?: string | Date | null;
}

export interface InventoryVoucherDetail {
  id: string; // UUID
  voucher_id: string; // UUID references inventory_vouchers(id)
  item_id?: string | null; // UUID references inventory_items(id)
  
  item_code_snapshot?: string | null;
  item_name_snapshot?: string | null;
  unit_snapshot?: string | null;
  
  quantity_by_doc: number;
  quantity_actual: number;
  unit_price: number;
  total_price: number;
  
  sort_order?: number | null;
}

export interface ApiSuccessResponse<T> {
  status: 'success';
  data: T;
}

export interface ApiFieldError {
  field: string;
  code: string;
  params?: Record<string, string | number>;
}

export interface ApiErrorResponse {
  status: 'error';
  code: string;
  errors?: ApiFieldError[];
}

export interface PaginatedResponse<T> {
  status: 'success';
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface CreateInventoryVoucherDetailDto {
  item_id: string; // UUID
  item_code_snapshot?: string;
  item_name_snapshot?: string;
  unit_snapshot?: string;
  quantity_by_doc: number;
  quantity_actual: number;
  unit_price: number;
}

export interface CreateInventoryVoucherDto {
  voucher_number: string;
  voucher_date: string; // ISO Date String
  
  unit_name?: string;
  department_name?: string;
  
  debit_account?: string;
  credit_account?: string;
  
  deliverer_name?: string;
  warehouse_id: string; // UUID
  location?: string;
  
  reference_source?: string;
  original_docs_count?: number;
  
  total_amount_numeric: number;
  total_amount_words?: string;

  details: CreateInventoryVoucherDetailDto[];
}

export interface UpdateInventoryVoucherDto extends Partial<CreateInventoryVoucherDto> {
  // Option to completely replace details or just update fields of the master voucher
}

// Validation schemas (Zod)
export {
  createVoucherSchema,
  updateVoucherSchema,
  voucherDetailSchema,
  type CreateVoucherInput,
  type UpdateVoucherInput,
  type VoucherDetailInput,
} from './validations/inventory.validation';

// Error codes
export { ErrorCode, type ErrorCodeType } from './errors/error-codes';
