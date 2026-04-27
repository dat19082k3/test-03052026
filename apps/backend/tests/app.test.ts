import request from 'supertest';
import app from '../src/app';
import { pool } from '../src/config/database';

// Mock the pg Pool
jest.mock('../src/config/database', () => {
  const mPool = {
    query: jest.fn(),
  };
  return { pool: mPool };
});

describe('API Routes', () => {
  it('GET / should return Welcome to the API', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'Welcome to the API' });
  });

  it('GET /health should return status ok when db is reachable', async () => {
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
