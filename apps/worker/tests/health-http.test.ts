import http from 'http';
import { createHealthHttpServer } from '../src/health/http-server';

jest.mock('../src/health/run-checks', () => ({
  runHealthChecks: jest.fn(),
}));

import { runHealthChecks } from '../src/health/run-checks';

describe('health HTTP server', () => {
  it('responds 200 when runHealthChecks ok', async () => {
    jest.mocked(runHealthChecks).mockResolvedValue({
      ok: true,
      checks: { database: 'ok', redis: 'ok', s3: 'skipped' },
    });

    const server = createHealthHttpServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };

    const body = await new Promise<string>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${addr.port}/health`, (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => resolve(data));
          expect(res.statusCode).toBe(200);
        })
        .on('error', reject);
    });

    expect(JSON.parse(body).ok).toBe(true);
    server.close();
  });

  it('responds 503 when runHealthChecks not ok', async () => {
    jest.mocked(runHealthChecks).mockResolvedValue({
      ok: false,
      checks: { database: 'fail', redis: 'ok', s3: 'skipped' },
    });

    const server = createHealthHttpServer();
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const addr = server.address() as { port: number };

    await new Promise<void>((resolve, reject) => {
      http
        .get(`http://127.0.0.1:${addr.port}/health`, (res) => {
          expect(res.statusCode).toBe(503);
          res.resume();
          res.on('end', resolve);
        })
        .on('error', reject);
    });

    server.close();
  });
});
