/**
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
  pgm.sql(`
    -- 1. Warehouses
    CREATE TABLE warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        address TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. Inventory Items
    CREATE TABLE inventory_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(255) NOT NULL,
        unit_name VARCHAR(50),
        description TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );

    -- 3. Inventory Vouchers
    CREATE TABLE inventory_vouchers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_number VARCHAR(50) UNIQUE NOT NULL,
        voucher_date TIMESTAMP WITH TIME ZONE NOT NULL,
        
        -- Organization Information
        unit_name VARCHAR(255),
        department_name VARCHAR(255),
        
        -- Accounting Information
        debit_account VARCHAR(20),
        credit_account VARCHAR(20),
        
        -- Delivery Information
        deliverer_name VARCHAR(255),
        warehouse_id UUID REFERENCES warehouses(id),
        location TEXT,
        
        -- Attached Documents
        reference_source TEXT,
        original_docs_count INTEGER DEFAULT 0,
        
        -- Summary
        total_amount_numeric NUMERIC(19, 4) DEFAULT 0,
        total_amount_words TEXT,
        
        -- Audit fields
        created_by UUID,
        updated_by UUID,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP WITH TIME ZONE
    );

    -- 4. Inventory Voucher Details
    CREATE TABLE inventory_voucher_details (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        voucher_id UUID NOT NULL REFERENCES inventory_vouchers(id) ON DELETE CASCADE,
        item_id UUID REFERENCES inventory_items(id),
        
        -- Snapshot information at time of entry
        item_code_snapshot VARCHAR(50),
        item_name_snapshot VARCHAR(255),
        unit_snapshot VARCHAR(50),
        
        -- Quantity and price
        quantity_by_doc NUMERIC(19, 4) NOT NULL,
        quantity_actual NUMERIC(19, 4) NOT NULL,
        unit_price NUMERIC(19, 4) NOT NULL,
        total_price NUMERIC(19, 4) GENERATED ALWAYS AS (quantity_actual * unit_price) STORED,
        
        sort_order INTEGER
    );
  `);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @param run {() => void | undefined}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE IF EXISTS inventory_voucher_details;
    DROP TABLE IF EXISTS inventory_vouchers;
    DROP TABLE IF EXISTS inventory_items;
    DROP TABLE IF EXISTS warehouses;
  `);
};
