/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  pgm.sql(`
    -- Partial unique index: voucher_number unique only among non-deleted
    CREATE UNIQUE INDEX idx_voucher_number_active
      ON inventory_vouchers (voucher_number)
      WHERE deleted_at IS NULL;

    -- Check constraints
    ALTER TABLE inventory_vouchers
      ADD CONSTRAINT chk_total_amount_non_negative
      CHECK (total_amount_numeric >= 0);

    ALTER TABLE inventory_voucher_details
      ADD CONSTRAINT chk_quantity_by_doc_positive
      CHECK (quantity_by_doc > 0);

    ALTER TABLE inventory_voucher_details
      ADD CONSTRAINT chk_quantity_actual_positive
      CHECK (quantity_actual > 0);

    ALTER TABLE inventory_voucher_details
      ADD CONSTRAINT chk_unit_price_non_negative
      CHECK (unit_price >= 0);
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_voucher_number_active;
    ALTER TABLE inventory_vouchers DROP CONSTRAINT IF EXISTS chk_total_amount_non_negative;
    ALTER TABLE inventory_voucher_details DROP CONSTRAINT IF EXISTS chk_quantity_by_doc_positive;
    ALTER TABLE inventory_voucher_details DROP CONSTRAINT IF EXISTS chk_quantity_actual_positive;
    ALTER TABLE inventory_voucher_details DROP CONSTRAINT IF EXISTS chk_unit_price_non_negative;
  `);
};
