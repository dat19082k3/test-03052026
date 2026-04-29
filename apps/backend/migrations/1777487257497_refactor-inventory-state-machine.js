/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const up = (pgm) => {
  // 1. Add new columns
  pgm.addColumns('inventory_vouchers', {
    status: {
      type: 'varchar(50)',
      notNull: true,
      default: 'draft',
    },
    replaced_from_id: {
      type: 'uuid',
      references: '"inventory_vouchers"',
      onDelete: 'SET NULL',
    },
    cancelled_at: {
      type: 'timestamp with time zone',
    },
    cancelled_by: {
      type: 'uuid',
    },
    cancel_reason: {
      type: 'text',
    },
  });

  // 2. Add CHECK constraint for status
  pgm.addConstraint('inventory_vouchers', 'chk_inventory_voucher_status', {
    check: "status IN ('draft', 'posted', 'cancelled')",
  });

  // 3. Drop old partial unique index
  pgm.dropIndex('inventory_vouchers', ['voucher_number'], { name: 'idx_voucher_number_active' });
  
  // 4. Drop the deleted_at index
  pgm.dropIndex('inventory_vouchers', ['deleted_at'], { name: 'idx_inventory_vouchers_deleted_at' });

  // 5. Drop deleted_at column
  pgm.dropColumns('inventory_vouchers', ['deleted_at']);

  // 6. Create NEW global unique index on voucher_number
  pgm.createIndex('inventory_vouchers', ['voucher_number'], {
    name: 'idx_voucher_number_unique',
    unique: true,
  });

  // 7. Optional: Ensure a voucher can only be replaced once
  pgm.sql(`
    CREATE UNIQUE INDEX idx_replaced_from_id_unique 
    ON inventory_vouchers (replaced_from_id) 
    WHERE replaced_from_id IS NOT NULL;
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 */
export const down = (pgm) => {
  // Restore deleted_at column
  pgm.addColumns('inventory_vouchers', {
    deleted_at: {
      type: 'timestamp with time zone',
    },
  });

  // Drop new global unique index
  pgm.dropIndex('inventory_vouchers', ['voucher_number'], { name: 'idx_voucher_number_unique' });
  
  // Drop replaced_from_id unique index
  pgm.sql('DROP INDEX IF EXISTS idx_replaced_from_id_unique;');

  // Create old partial unique index
  pgm.sql(`
    CREATE UNIQUE INDEX idx_voucher_number_active
      ON inventory_vouchers (voucher_number)
      WHERE deleted_at IS NULL;
  `);

  // Create old index on deleted_at
  pgm.createIndex('inventory_vouchers', ['deleted_at'], { name: 'idx_inventory_vouchers_deleted_at' });

  // Drop check constraint
  pgm.dropConstraint('inventory_vouchers', 'chk_inventory_voucher_status');

  // Drop new columns
  pgm.dropColumns('inventory_vouchers', [
    'status',
    'replaced_from_id',
    'cancelled_at',
    'cancelled_by',
    'cancel_reason',
  ]);
};
