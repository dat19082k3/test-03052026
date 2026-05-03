import request from 'supertest';
import app from '../src/app';
import * as inventoryService from '../src/services/inventory.service';

describe('Inventory Excel HTTP API', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('POST /vouchers/export returns 202 with X-Excel-Client-Id and list_all', async () => {
    jest.spyOn(inventoryService, 'enqueueVoucherExport').mockResolvedValue({
      jobId: 'job-export-1',
      state: 'waiting',
    } as never);

    const res = await request(app)
      .post('/api/v1/inventory/vouchers/export')
      .set('X-Excel-Client-Id', 'excel-client-test-1')
      .send({ mode: 'list_all' })
      .expect(202);

    expect(res.body.status).toBe('success');
    expect(res.body.data.jobId).toBe('job-export-1');
    expect(inventoryService.enqueueVoucherExport).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'list_all',
        excelClientId: 'excel-client-test-1',
      }),
    );
  });

  it('POST /vouchers/export returns 400 without excel client id', async () => {
    const res = await request(app)
      .post('/api/v1/inventory/vouchers/export')
      .send({ mode: 'list_all' })
      .expect(400);

    expect(res.body.status).toBe('error');
    expect(res.body.code).toBeDefined();
  });

  it('POST /vouchers/import returns 202 with multipart file and header', async () => {
    jest.spyOn(inventoryService, 'enqueueVoucherImportFromUpload').mockResolvedValue({
      jobId: 'job-import-1',
      state: 'waiting',
    } as never);

    const buf = Buffer.from('fake-xlsx', 'utf8');

    const res = await request(app)
      .post('/api/v1/inventory/vouchers/import')
      .set('X-Excel-Client-Id', 'excel-client-test-2')
      .attach('file', buf, {
        filename: 'vouchers.xlsx',
        contentType:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      .expect(202);

    expect(res.body.status).toBe('success');
    expect(res.body.data.jobId).toBe('job-import-1');
    expect(inventoryService.enqueueVoucherImportFromUpload).toHaveBeenCalled();
    const call = (inventoryService.enqueueVoucherImportFromUpload as jest.Mock).mock.calls[0];
    expect(call[1]).toBe('excel-client-test-2');
    expect(call[0]).toMatchObject({ fieldname: 'file', originalname: 'vouchers.xlsx' });
  });

  it('GET /excel-jobs/:id/download proxies to streamInventoryExcelDownload', async () => {
    jest
      .spyOn(inventoryService, 'streamInventoryExcelDownload')
      .mockImplementation(async (_jobId, res) => {
        res.status(200);
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.send(Buffer.from([80, 75]));
      });

    await request(app)
      .get('/api/v1/inventory/excel-jobs/abc/download')
      .expect(200)
      .expect('Content-Type', /spreadsheet/);

    expect(inventoryService.streamInventoryExcelDownload).toHaveBeenCalledWith(
      'abc',
      expect.anything(),
    );
  });
});
