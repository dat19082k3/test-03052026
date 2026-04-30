// Determine which .env file to load
const nodeEnv = process.env.NODE_ENV || 'development';

export const config = {
  nodeEnv,
  logLevel: process.env.LOG_LEVEL || (nodeEnv === 'development' ? 'debug' : 'info'),
  apiUrl: process.env.API_URL || 'http://localhost:4000/api/v1',
};
