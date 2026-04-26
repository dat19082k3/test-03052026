import request from 'supertest';
import app, { pool } from './index';

// Mock the pg Pool using pg-mem if needed or simply mock the query method
jest.mock('pg', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('API Routes', () => {
  afterAll(async () => {
    // any cleanup
  });

  it('GET / should return Welcome to the API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Welcome to the API' });
  });

  it('GET /health should return status ok when db is reachable', async () => {
    // Mock the specific pg pool instance method
    (pool.query as jest.Mock).mockResolvedValueOnce({ rows: [{ now: '2026-05-03T00:00:00.000Z' }] });
    
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', time: '2026-05-03T00:00:00.000Z' });
  });

  it('GET /health should return status error when db query fails', async () => {
    (pool.query as jest.Mock).mockRejectedValueOnce(new Error('Connection Failed'));

    const res = await request(app).get('/health');
    expect(res.status).toBe(500);
    expect(res.body).toEqual({ status: 'error', message: 'Database connection failed' });
  });
});
