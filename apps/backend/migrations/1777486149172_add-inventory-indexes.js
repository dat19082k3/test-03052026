/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
exports.shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.up = (pgm) => {
  pgm.sql(`
    -- Index for counting and filtering deleted vouchers
    CREATE INDEX idx_inventory_vouchers_deleted_at
      ON inventory_vouchers (deleted_at);

    -- Index for fetching vouchers ordered by created_at (paginated list)
    CREATE INDEX idx_inventory_vouchers_created_at
      ON inventory_vouchers (created_at DESC);

    -- Index for finding details by voucher_id quickly
    CREATE INDEX idx_inventory_voucher_details_voucher_id
      ON inventory_voucher_details (voucher_id);
      
    -- Note: idx_voucher_number_active was created previously.
    -- Primary Keys (id) and UNIQUE constraints already have implicit indexes.
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
exports.down = (pgm) => {
  pgm.sql(`
    DROP INDEX IF EXISTS idx_inventory_vouchers_deleted_at;
    DROP INDEX IF EXISTS idx_inventory_vouchers_created_at;
    DROP INDEX IF EXISTS idx_inventory_voucher_details_voucher_id;
  `);
};
