import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import winston from 'winston';
import { Pool } from 'pg';

const app = express();
const port = process.env.PORT || 4000;

// Set up winston logger
export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
});

// Create Postgres connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/test_db',
});

// Middlewares
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan('combined', {
  stream: { write: (message: string) => logger.info(message.trim()) }
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use(limiter);

// Routes
app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Welcome to the API' });
});

app.get('/health', async (req: Request, res: Response) => {
  try {
    const dbRes = await pool.query('SELECT NOW()');
    res.json({ status: 'ok', time: dbRes.rows[0].now });
  } catch (error) {
    logger.error('Database connection failed', error);
    res.status(500).json({ status: 'error', message: 'Database connection failed' });
  }
});

// Start Server
if (require.main === module) {
  app.listen(port, () => {
    logger.info(`Server running on port ${port}`);
  });
}

export default app;
