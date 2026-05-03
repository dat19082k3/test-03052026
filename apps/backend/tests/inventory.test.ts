import { ErrorCode } from '@repo/types';
import { AppError } from '../src/utils/app-error';
import * as service from '../src/services/inventory.service';
import * as model from '../src/models/inventory.model';

// Mock pg pool
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

jest.mock('../src/config/database', () => {
  const mPool = {
    query: jest.fn(),
    connect: jest.fn(() => mockClient),
  };
  return { pool: mPool };
});

// Helpers
const WAREHOUSE_ID = '11111111-1111-1111-1111-111111111111';
const ITEM_ID_1 = '22222222-2222-2222-2222-222222222222';
const VOUCHER_ID = '33333333-3333-3333-3333-333333333333';

function makeValidDto() {
  return {
    voucher_number: 'NK-001',
    voucher_date: '2026-04-29',
    deliverer_name: 'Nguyen Van A',
    warehouse_id: WAREHOUSE_ID,
    total_amount_numeric: 1000,
    details: [
      {
        item_id: ITEM_ID_1,
        item_code_snapshot: 'VT001',
        item_name_snapshot: 'Vat tu A',
        unit_snapshot: 'kg',
        quantity_by_doc: 10,
        quantity_actual: 10,
        unit_price: 100,
      },
    ],
  };
}

function mockActiveWarehouse() {
  return { id: WAREHOUSE_ID, code: 'KHO01', name: 'Kho chinh', is_active: true };
}

function mockInactiveWarehouse() {
  return { id: WAREHOUSE_ID, code: 'KHO01', name: 'Kho chinh', is_active: false };
}

function mockItem() {
  return { id: ITEM_ID_1, code: 'VT001', name: 'Vat tu A', unit_name: 'kg' };
}

function mockVoucherRow(overrides: any = {}) {
  return {
    id: VOUCHER_ID,
    voucher_number: 'NK-001',
    voucher_date: '2026-04-29',
    warehouse_id: WAREHOUSE_ID,
    deliverer_name: 'Nguyen Van A',
    total_amount_numeric: '1000.0000',
    status: 'draft',
    replaced_from_id: null,
    ...overrides,
  };
}

// Setup
beforeEach(() => {
  jest.clearAllMocks();
  mockClient.query.mockResolvedValue({ rows: [] });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// TEMPLATE TESTS
describe('getVoucherTemplate', () => {
  it('0. should generate correct default template and format next number', async () => {
    const { pool } = require('../src/config/database');
    pool.query.mockResolvedValueOnce({ rows: [{ voucher_number: 'NK000045' }] });

    const result = await service.getVoucherTemplate();
    expect(result.voucher_number).toBe('NK000046');
    expect(result.details).toEqual([]);
    expect(mockClient.query).not.toHaveBeenCalled(); // using direct pool for select
  });

  it('0.1. should start from 000001 if no prior vouchers', async () => {
    const { pool } = require('../src/config/database');
    pool.query.mockResolvedValueOnce({ rows: [] });

    const result = await service.getVoucherTemplate();
    expect(result.voucher_number).toBe('NK000001');
  });
});

// CREATE TESTS
describe('createVoucher', () => {

  it('1. should create voucher with valid data', async () => {
    const dto = makeValidDto();
    // BEGIN
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] }) // findWarehouseById
      .mockResolvedValueOnce({ rows: [] }) // findVoucherByNumber (no duplicate)
      .mockResolvedValueOnce({ rows: [mockItem()] }) // findItemById
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // insertVoucher
      .mockResolvedValueOnce({ rows: [{ id: 'detail-1' }] }) // insertVoucherDetails
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await service.createVoucher(dto);
    expect(result.id).toBe(VOUCHER_ID);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('2. should fail when warehouse does not exist', async () => {
    const dto = makeValidDto();
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [] }); // findWarehouseById → not found

    await expect(service.createVoucher(dto)).rejects.toThrow(AppError);
    try { await service.createVoucher(dto); } catch (e: any) {
      // Reset mock for second call
    }
    // Use fresh mock for assertion
    mockClient.query.mockClear();
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK
    try {
      await service.createVoucher(dto);
    } catch (e: any) {
      expect(e).toBeInstanceOf(AppError);
      expect(e.code).toBe(ErrorCode.WAREHOUSE.NOT_FOUND);
    }
  });

  it('3. should fail when warehouse is inactive', async () => {
    const dto = makeValidDto();
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockInactiveWarehouse()] }) // inactive
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    try {
      await service.createVoucher(dto);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.WAREHOUSE.INACTIVE);
    }
  });

  it('4. should fail when item does not exist', async () => {
    const dto = makeValidDto();
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] })
      .mockResolvedValueOnce({ rows: [] }) // no duplicate
      .mockResolvedValueOnce({ rows: [] }) // findItemById → not found
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    try {
      await service.createVoucher(dto);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.ITEM.NOT_FOUND);
    }
  });

  it('5. should fail when voucher_number is duplicate', async () => {
    const dto = makeValidDto();
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] })
      .mockResolvedValueOnce({ rows: [{ id: 'existing-id' }] }) // duplicate found
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    try {
      await service.createVoucher(dto);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.VOUCHER.DUPLICATE_NUMBER);
    }
  });

  it('6. should fail when total_amount_numeric does not match sum of details', async () => {
    const dto = makeValidDto();
    dto.total_amount_numeric = 9999; // mismatch

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] })
      .mockResolvedValueOnce({ rows: [] }) // no duplicate
      .mockResolvedValueOnce({ rows: [mockItem()] }) // item exists
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    try {
      await service.createVoucher(dto);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.VALIDATION.FAILED);
      expect(e.errors[0].field).toBe('total_amount_numeric');
    }
  });

  it('7. should fail when creating voucher with empty details array', async () => {
    const dto = makeValidDto();
    dto.details = [];

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] });

    await expect(service.createVoucher(dto)).rejects.toThrow();
  });

  it('8. should rollback when detail insert fails', async () => {
    const dto = makeValidDto();
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] })
      .mockResolvedValueOnce({ rows: [] }) // no duplicate
      .mockResolvedValueOnce({ rows: [mockItem()] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // insert voucher ok
      .mockRejectedValueOnce(new Error('DB error on detail insert')) // detail fails
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    try {
      await service.createVoucher(dto);
      fail('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.COMMON.INTERNAL_ERROR);
    }
    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

// GET TESTS
describe('getVoucherById', () => {

  it('8. should return voucher with details', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // findVoucherById
      .mockResolvedValueOnce({ rows: [{ id: 'detail-1' }] }); // findVoucherDetailsById

    const result = await service.getVoucherById(VOUCHER_ID);
    expect(result.id).toBe(VOUCHER_ID);
    expect(result.details).toHaveLength(1);
  });

  it('9. should return voucher even if cancelled', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'cancelled' })] })
      .mockResolvedValueOnce({ rows: [{ id: 'detail-1' }] });

    const result = await service.getVoucherById(VOUCHER_ID);
    expect(result.status).toBe('cancelled');
  });
});

// LIST TESTS
describe('getVouchers', () => {
  it('10. should return paginated vouchers with default filter', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // COUNT
      .mockResolvedValueOnce({ rows: [mockVoucherRow(), mockVoucherRow({ id: 'v2' })] }); // data

    const result = await service.getVouchers({ page: 1, limit: 10 });
    expect(result.data).toHaveLength(2);
    expect(result.meta.total).toBe(2);
    expect(pool.query).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array)
    );
  });

  it('11. should apply search filter correctly', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] });

    await service.getVouchers({ page: 1, limit: 10, search: 'NK-001' });
    
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("voucher_number ILIKE $1 OR deliverer_name ILIKE $1"),
      expect.arrayContaining(['%NK-001%'])
    );
  });

  it('12. should apply status filter correctly', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'completed' })] });

    await service.getVouchers({ page: 1, limit: 10, status: 'completed' });
    
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = ANY($1)"),
      expect.arrayContaining([['completed']])
    );
  });

  it('13. should apply date range filter correctly', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] });

    await service.getVouchers({ 
      page: 1, 
      limit: 10, 
      from: '2026-01-01', 
      to: '2026-12-31' 
    });
    
    // In service: to is addDays(1) for date-only format
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("voucher_date >= $1 AND voucher_date < $2"),
      expect.arrayContaining([expect.stringContaining('2026-01-01'), expect.stringContaining('2027-01-01')])
    );
  });

  it('14. should apply sorting correctly', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] });

    await service.getVouchers({ 
      page: 1, 
      limit: 10, 
      sortBy: 'totalAmount', 
      sortOrder: 'asc' 
    });
    
    expect(pool.query).toHaveBeenLastCalledWith(
      expect.stringContaining("ORDER BY total_amount_numeric ASC"),
      expect.any(Array)
    );
  });

  it('15. should return empty when page exceeds total', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '2' }] })
      .mockResolvedValueOnce({ rows: [] }); // page 100 → empty

    const result = await service.getVouchers({ page: 100, limit: 10 });
    expect(result.data).toHaveLength(0);
    expect(result.meta.total).toBe(2);
  });

  it('15.1 should support multi-status filtering', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] });

    await service.getVouchers({ page: 1, limit: 10, status: 'draft,posted' });
    
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("status = ANY($1)"),
      expect.arrayContaining([['draft', 'posted']])
    );
  });

  it('15.2 should support hour-precision date-time filtering', async () => {
    const { pool } = require('../src/config/database');
    pool.query
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] });

    await service.getVouchers({ 
      page: 1, 
      limit: 10, 
      from: '2026-04-29T10:00:00', 
      to: '2026-04-29T20:00:00' 
    });
    
    // In service: when T is present, addMinutes(1) is used for 'to'
    expect(pool.query).toHaveBeenCalledWith(
      expect.stringContaining("voucher_date >= $1 AND voucher_date < $2"),
      expect.arrayContaining([expect.stringContaining('2026-04-29T10:00:00'), expect.stringContaining('2026-04-29T20:01:00')])
    );
  });
});

// UPDATE TESTS
describe('updateVoucher', () => {

  it('16. should update voucher with valid data', async () => {
    const dto = { deliverer_name: 'Updated Name' };
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ deliverer_name: 'Updated Name' })] }) // update
      .mockResolvedValueOnce({ rows: [{ id: 'detail-1' }] }) // findVoucherDetailsById
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await service.updateVoucher(VOUCHER_ID, dto);
    expect(result.deliverer_name).toBe('Updated Name');
  });

  it('17. should update with same number but changed data', async () => {
    const dto = { voucher_number: 'NK-001', unit_name: 'New Unit' };
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE (same number)
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ unit_name: 'New Unit' })] }) // update
      .mockResolvedValueOnce({ rows: [{ id: 'detail-1' }] }) // details
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const result = await service.updateVoucher(VOUCHER_ID, dto);
    expect(result.unit_name).toBe('New Unit');
  });

  it('18. should fail when updating posted voucher', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'posted' })] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(service.updateVoucher(VOUCHER_ID, { deliverer_name: 'X' })).rejects.toThrow();
  });

  it('19. should fail when update item does not exist', async () => {
    const dto = makeValidDto();
    dto.voucher_number = 'NK-002'; // changed number to trigger uniqueness check
    dto.details[0]!.item_id = 'nonexistent-id';

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] }) // findWarehouseById
      .mockResolvedValueOnce({ rows: [] }) // findVoucherByNumber (NK-002 not found)
      .mockResolvedValueOnce({ rows: [] }) // findItemById → not found
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(service.updateVoucher(VOUCHER_ID, dto)).rejects.toThrow();
  });

  it('20. should fail when update total does not match details', async () => {
    const dto = makeValidDto();
    dto.total_amount_numeric = 9999; // mismatch: details sum = 1000

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] }) // findWarehouseById (dto has warehouse_id)
      // voucher_number same → skip uniqueness check
      .mockResolvedValueOnce({ rows: [mockItem()] }) // findItemById
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(service.updateVoucher(VOUCHER_ID, dto)).rejects.toThrow();
  });

  it('21. should fail when update has empty details array', async () => {
    const dto = { details: [] as any[] };

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    try {
      await service.updateVoucher(VOUCHER_ID, dto);
      throw new Error('Should have thrown');
    } catch (e: any) {
      expect(e.code).toBe(ErrorCode.VALIDATION.FAILED);
      expect(e.errors[0].code).toBe(ErrorCode.VALIDATION.ARRAY_MIN);
    }
  });

  it('22. should rollback when detail insert fails mid-update', async () => {
    const dto = makeValidDto();

    jest.spyOn(model, 'insertVoucherDetails')
      .mockRejectedValue(new Error('COMMON.INTERNAL_ERROR'));

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] })
      .mockResolvedValueOnce({ rows: [mockItem()] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // updateVoucherFields
      .mockResolvedValueOnce({ rows: [] }) // deleteVoucherDetails
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(service.updateVoucher(VOUCHER_ID, dto))
      .rejects.toThrow('COMMON.INTERNAL_ERROR');

    expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

// STATUS & DELETE TESTS
describe('postVoucher', () => {
  it('23. should post a draft voucher', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // FOR UPDATE
      .mockResolvedValueOnce({ rows: [{ id: VOUCHER_ID }] }) // update status
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    await service.postVoucher(VOUCHER_ID);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('24. should fail to post if already posted', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'posted' })] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.postVoucher(VOUCHER_ID)).rejects.toThrow();
  });
});

describe('cancelVoucher', () => {
  it('25. should cancel a posted voucher', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'posted' })] })
      .mockResolvedValueOnce({ rows: [{ id: VOUCHER_ID }] })
      .mockResolvedValueOnce({ rows: [] });

    await service.cancelVoucher(VOUCHER_ID, 'Sai so lieu');
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('26. should fail to cancel if already cancelled', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'cancelled' })] })
      .mockResolvedValueOnce({ rows: [] });

    await expect(service.cancelVoucher(VOUCHER_ID, 'Reason')).rejects.toThrow();
  });
});

describe('replaceVoucher', () => {
  it('27. should replace a cancelled voucher', async () => {
    const dto = makeValidDto();
    dto.voucher_number = 'NK-NEW';

    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'cancelled' })] }) // old
      .mockResolvedValueOnce({ rows: [mockActiveWarehouse()] })
      .mockResolvedValueOnce({ rows: [] }) // no duplicate
      .mockResolvedValueOnce({ rows: [mockItem()] })
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ id: 'new-id', status: 'draft', replaced_from_id: VOUCHER_ID })] }) // insert
      .mockResolvedValueOnce({ rows: [{ id: 'detail' }] })
      .mockResolvedValueOnce({ rows: [] }); // COMMIT

    const res = await service.replaceVoucher(VOUCHER_ID, dto);
    expect(res.replaced_from_id).toBe(VOUCHER_ID);
    expect(res.status).toBe('draft');
  });

  it('28. should fail to replace if not cancelled', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'posted' })] }) // old 
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK

    await expect(service.replaceVoucher(VOUCHER_ID, makeValidDto())).rejects.toThrow();
  });
});

describe('deleteDraftVoucher', () => {
  it('29. should hard delete draft voucher', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow()] }) // find
      .mockResolvedValueOnce({ rows: [] }) // delete details
      .mockResolvedValueOnce({ rows: [{ id: VOUCHER_ID }] }) // delete voucher
      .mockResolvedValueOnce({ rows: [] }); // COMMIT
    
    await service.deleteDraftVoucher(VOUCHER_ID);
    expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
  });

  it('30. should fail to delete if posted', async () => {
    mockClient.query
      .mockResolvedValueOnce({ rows: [] }) // BEGIN
      .mockResolvedValueOnce({ rows: [mockVoucherRow({ status: 'posted' })] }) // find
      .mockResolvedValueOnce({ rows: [] }); // ROLLBACK
    
    await expect(service.deleteDraftVoucher(VOUCHER_ID)).rejects.toThrow();
  });
});
