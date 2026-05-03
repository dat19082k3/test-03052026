import { Pool } from 'pg';
import { randomUUID } from 'crypto';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env.development
dotenv.config({ path: path.join(__dirname, '../.env.development') });

const pool = new Pool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_DATABASE || 'test_03052026_db',
  user: process.env.DB_USERNAME || 'test0305',
  password: process.env.DB_PASSWORD || 'test03052026',
});

const BATCH_SIZE = 1000;
const DEFAULT_TOTAL_RECORDS = 1000000;

async function seed() {
  const argCount = process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1];
  const totalToSeed = argCount ? parseInt(argCount, 10) : DEFAULT_TOTAL_RECORDS;

  console.log(`Starting to seed ${totalToSeed} records...`);
  const start = Date.now();

  try {
    // 0. Clear existing dynamic data
    console.log('Clearing existing vouchers and details...');
    await pool.query('TRUNCATE TABLE inventory_vouchers CASCADE');

    // 1. Ensure we have some warehouses and items
    console.log('Preparing reference data (warehouses and items)...');
    
    // Create 10 warehouses
    const warehouseIds: string[] = [];
    for (let i = 1; i <= 10; i++) {
        const id = randomUUID();
        const code = `WH-SEED-${i}`;
        const name = `Warehouse Seed ${i}`;
        await pool.query(
            'INSERT INTO warehouses (id, code, name) VALUES ($1, $2, $3) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id',
            [id, code, name]
        ).then(res => warehouseIds.push(res.rows[0].id));
    }

    // Create 1000 items
    const itemIds: string[] = [];
    const itemsData: any[] = [];
    for (let i = 1; i <= 1000; i++) {
        const id = randomUUID();
        const code = `ITEM-SEED-${i.toString().padStart(4, '0')}`;
        const name = `Item Seed ${i}`;
        const unitName = ['PCS', 'BOX', 'KG', 'METER'][Math.floor(Math.random() * 4)];
        const res = await pool.query(
            'INSERT INTO inventory_items (id, code, name, unit_name) VALUES ($1, $2, $3, $4) ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name RETURNING id, code, name, unit_name',
            [id, code, name, unitName]
        );
        itemIds.push(res.rows[0].id);
        itemsData.push(res.rows[0]);
    }

    // 2. Seed Vouchers in batches
    let seededCount = 0;
    while (seededCount < totalToSeed) {
        const currentBatchSize = Math.min(BATCH_SIZE, totalToSeed - seededCount);
        const voucherBatch: any[] = [];
        const detailBatch: any[] = [];

        for (let i = 0; i < currentBatchSize; i++) {
            const voucherId = randomUUID();
            const voucherIdx = seededCount + i + 1;
            const voucherNum = `NK-${voucherIdx.toString().padStart(7, '0')}`;
            const voucherDate = new Date(Date.now() - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));
            const warehouseId = warehouseIds[Math.floor(Math.random() * warehouseIds.length)];
            
            // Randomize Status: 70% posted, 20% draft, 10% cancelled
            const statusRand = Math.random();
            let status: string;
            let cancelReason: string | null = null;
            let cancelledAt: string | null = null;

            if (statusRand < 0.7) {
                status = 'posted';
            } else if (statusRand < 0.9) {
                status = 'draft';
            } else {
                status = 'cancelled';
                cancelReason = ['Wrong quantity', 'Order cancelled by supplier', 'Duplicate entry', 'Input error'][Math.floor(Math.random() * 4)];
                cancelledAt = new Date(voucherDate.getTime() + 86400000).toISOString(); // 1 day after voucher date
            }

            voucherBatch.push({
                id: voucherId,
                voucher_number: voucherNum,
                voucher_date: voucherDate.toISOString(),
                deliverer_name: `Supplier ${Math.floor(Math.random() * 100) + 1}`,
                warehouse_id: warehouseId,
                status: status,
                total_amount_numeric: 0, // Placeholder
                cancel_reason: cancelReason,
                cancelled_at: cancelledAt
            });

            // 1-3 details per voucher
            const numDetails = Math.floor(Math.random() * 3) + 1;
            let voucherTotal = 0;
            for (let j = 0; j < numDetails; j++) {
                const item = itemsData[Math.floor(Math.random() * itemsData.length)];
                const qty = Math.floor(Math.random() * 100) + 1;
                const price = Math.floor(Math.random() * 1000) * 1000 + 50000;
                const subtotal = qty * price;
                voucherTotal += subtotal;

                detailBatch.push({
                    voucher_id: voucherId,
                    item_id: item.id,
                    item_code_snapshot: item.code,
                    item_name_snapshot: item.name,
                    unit_snapshot: item.unit_name,
                    quantity_by_doc: qty,
                    quantity_actual: qty,
                    unit_price: price,
                    sort_order: j + 1
                });
            }
            voucherBatch[i].total_amount_numeric = voucherTotal;
        }

        // Use a single client for the entire batch to ensure transaction consistency
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Insert Vouchers
            const voucherQuery = `
                INSERT INTO inventory_vouchers (
                    id, voucher_number, voucher_date, deliverer_name, warehouse_id, status, total_amount_numeric, cancelled_at, cancel_reason
                ) VALUES ${voucherBatch.map((_, idx) => `($${idx*9+1}, $${idx*9+2}, $${idx*9+3}, $${idx*9+4}, $${idx*9+5}, $${idx*9+6}, $${idx*9+7}, $${idx*9+8}, $${idx*9+9})`).join(',')}
                ON CONFLICT (voucher_number) DO NOTHING
                RETURNING id
            `;
            const voucherValues = voucherBatch.flatMap(v => [
                v.id, v.voucher_number, v.voucher_date, v.deliverer_name, v.warehouse_id, v.status, v.total_amount_numeric, v.cancelled_at, v.cancel_reason
            ]);
            
            const voucherRes = await client.query(voucherQuery, voucherValues);
            const insertedIds = new Set(voucherRes.rows.map(r => r.id));

            // Only insert details for vouchers that were actually inserted in this batch
            const filteredDetails = detailBatch.filter(d => insertedIds.has(d.voucher_id));

            if (filteredDetails.length > 0) {
                // Insert Details
                const detailQuery = `
                    INSERT INTO inventory_voucher_details (
                        voucher_id, item_id, item_code_snapshot, item_name_snapshot, unit_snapshot, quantity_by_doc, quantity_actual, unit_price, sort_order
                    ) VALUES ${filteredDetails.map((_, idx) => `($${idx*9+1}, $${idx*9+2}, $${idx*9+3}, $${idx*9+4}, $${idx*9+5}, $${idx*9+6}, $${idx*9+7}, $${idx*9+8}, $${idx*9+9})`).join(',')}
                `;
                const detailValues = filteredDetails.flatMap(d => [
                    d.voucher_id, d.item_id, d.item_code_snapshot, d.item_name_snapshot, d.unit_snapshot, d.quantity_by_doc, d.quantity_actual, d.unit_price, d.sort_order
                ]);

                await client.query(detailQuery, detailValues);
            }

            await client.query('COMMIT');
            seededCount += currentBatchSize;
        } catch (e) {
            await client.query('ROLLBACK');
            throw e;
        } finally {
            client.release();
        }
        if (seededCount % 50000 === 0 || seededCount === totalToSeed) {
            const elapsed = (Date.now() - start) / 1000;
            console.log(`Seeded ${seededCount} / ${totalToSeed} vouchers (${((seededCount/totalToSeed)*100).toFixed(1)}%) - ${elapsed.toFixed(1)}s elapsed`);
        }
    }

    const end = Date.now();
    console.log(`Successfully seeded ${totalToSeed} vouchers in ${((end - start) / 1000).toFixed(1)}s`);

  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await pool.end();
  }
}

seed();
