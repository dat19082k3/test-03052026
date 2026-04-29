import { z } from 'zod';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACCOUNT_CODE_REGEX = /^\d{3,20}$/;

// Voucher Detail Schema
export const voucherDetailSchema = z.object({
  item_id: z
    .string({ error: 'Item ID is required' })
    .regex(UUID_REGEX, 'Item ID must be a valid UUID'),

  item_code_snapshot: z
    .string()
    .max(50, 'Item code snapshot must not exceed 50 characters')
    .optional(),

  item_name_snapshot: z
    .string()
    .max(255, 'Item name snapshot must not exceed 255 characters')
    .optional(),

  unit_snapshot: z
    .string()
    .max(50, 'Unit snapshot must not exceed 50 characters')
    .optional(),

  quantity_by_doc: z
    .number({ error: 'Document quantity is required' })
    .positive('Document quantity must be greater than 0'),

  quantity_actual: z
    .number({ error: 'Actual quantity is required' })
    .positive('Actual quantity must be greater than 0'),

  unit_price: z
    .number({ error: 'Unit price is required' })
    .nonnegative('Unit price must be 0 or greater'),
});

// Create Voucher Schema (POST)
export const createVoucherSchema = z.object({
  voucher_number: z
    .string({ error: 'Voucher number is required' })
    .trim()
    .min(1, 'Voucher number must not be empty')
    .max(50, 'Voucher number must not exceed 50 characters'),

  voucher_date: z
    .string({ error: 'Voucher date is required' })
    .refine((val: string) => !isNaN(Date.parse(val)), 'Voucher date must be a valid date')
    .refine((val: string) => {
      const d = new Date(val);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      return d <= today;
    }, 'Voucher date must not be in the future'),

  // Organization info
  unit_name: z
    .string()
    .max(255, 'Unit name must not exceed 255 characters')
    .optional(),

  department_name: z
    .string()
    .max(255, 'Department name must not exceed 255 characters')
    .optional(),

  // Accounting codes
  debit_account: z
    .string()
    .regex(ACCOUNT_CODE_REGEX, 'Debit account must be a numeric code (3-20 digits)')
    .optional(),

  credit_account: z
    .string()
    .regex(ACCOUNT_CODE_REGEX, 'Credit account must be a numeric code (3-20 digits)')
    .optional(),

  // Delivery info
  deliverer_name: z
    .string({ error: 'Deliverer name is required' })
    .trim()
    .min(1, 'Deliverer name must not be empty')
    .max(255, 'Deliverer name must not exceed 255 characters'),

  warehouse_id: z
    .string({ error: 'Warehouse ID is required' })
    .regex(UUID_REGEX, 'Warehouse ID must be a valid UUID'),

  location: z
    .string()
    .max(500, 'Location must not exceed 500 characters')
    .optional(),

  // Attached docs
  reference_source: z
    .string()
    .max(500, 'Reference source must not exceed 500 characters')
    .optional(),

  original_docs_count: z
    .number()
    .int('Original docs count must be an integer')
    .nonnegative('Original docs count must be 0 or greater')
    .optional(),

  // Summary
  total_amount_numeric: z
    .number({ error: 'Total amount is required' })
    .nonnegative('Total amount must be 0 or greater'),

  total_amount_words: z
    .string()
    .max(500, 'Total amount in words must not exceed 500 characters')
    .optional(),

  // Detail lines — at least 1 required per Form 01-VT
  details: z
    .array(voucherDetailSchema)
    .min(1, 'At least one detail line is required'),
});

// Update Voucher Schema (PUT)
// All fields optional, but must pass same rules when provided
export const updateVoucherSchema = createVoucherSchema.partial().refine(
  (data: Record<string, unknown>) => Object.keys(data).length > 0,
  'At least one field must be provided for update'
);

// Inferred types from schemas
export type CreateVoucherInput = z.infer<typeof createVoucherSchema>;
export type UpdateVoucherInput = z.infer<typeof updateVoucherSchema>;
export type VoucherDetailInput = z.infer<typeof voucherDetailSchema>;
