import pino from 'pino';
import { config } from './config';

const isDevelopment = config.nodeEnv !== 'production';

export const logger = pino({
  level: config.logLevel,
  ...(isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});
