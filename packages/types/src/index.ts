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
