import type { HealthCheckResult } from '../src/health/run-checks';

describe('runHealthChecks', () => {
  const mockQuery = jest.fn();
  const mockPing = jest.fn();
  const mockReadS3 = jest.fn();

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    mockQuery.mockResolvedValue({ rows: [{ '?column?': 1 }] });
    mockPing.mockResolvedValue('PONG');
    mockReadS3.mockReturnValue(null);
  });

  function loadRunHealthChecks(): typeof import('../src/health/run-checks').runHealthChecks {
    jest.doMock('../src/config/database', () => ({
      pool: { query: mockQuery },
    }));
    jest.doMock('../src/config/redis', () => ({
      redisConnection: { ping: mockPing },
    }));
    jest.doMock('@repo/storage', () => ({
      readS3ConfigFromEnv: mockReadS3,
      createS3Client: jest.fn(),
      checkS3BucketReachable: jest.fn(),
    }));
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('../src/health/run-checks').runHealthChecks;
  }

  it('returns ok when database and redis succeed and S3 is not configured', async () => {
    const runHealthChecks = loadRunHealthChecks();
    const result: HealthCheckResult = await runHealthChecks();
    expect(result.ok).toBe(true);
    expect(result.checks.database).toBe('ok');
    expect(result.checks.redis).toBe('ok');
    expect(result.checks.s3).toBe('skipped');
  });

  it('returns not ok when database fails', async () => {
    mockQuery.mockRejectedValue(new Error('connection refused'));
    const runHealthChecks = loadRunHealthChecks();
    const result = await runHealthChecks();
    expect(result.ok).toBe(false);
    expect(result.checks.database).toBe('fail');
  });

  it('returns not ok when redis fails', async () => {
    mockPing.mockRejectedValue(new Error('NOAUTH'));
    const runHealthChecks = loadRunHealthChecks();
    const result = await runHealthChecks();
    expect(result.ok).toBe(false);
    expect(result.checks.redis).toBe('fail');
  });

  it('validates S3 when configured', async () => {
    const checkS3BucketReachable = jest.fn().mockResolvedValue(undefined);
    const createS3Client = jest.fn().mockReturnValue({});
    mockReadS3.mockReturnValue({ bucket: 'b', region: 'r' });

    jest.doMock('../src/config/database', () => ({
      pool: { query: mockQuery },
    }));
    jest.doMock('../src/config/redis', () => ({
      redisConnection: { ping: mockPing },
    }));
    jest.doMock('@repo/storage', () => ({
      readS3ConfigFromEnv: mockReadS3,
      createS3Client,
      checkS3BucketReachable,
    }));

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { runHealthChecks } = require('../src/health/run-checks') as typeof import('../src/health/run-checks');
    const result = await runHealthChecks();
    expect(result.ok).toBe(true);
    expect(result.checks.s3).toBe('ok');
    expect(checkS3BucketReachable).toHaveBeenCalled();
  });
});
