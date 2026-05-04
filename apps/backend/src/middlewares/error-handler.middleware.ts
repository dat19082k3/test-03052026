import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '@repo/types';
import { AppError } from '../utils/app-error';
import { logger } from '../utils/logger';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  if (err instanceof AppError) {
    logger.error({ 
      jobId: (err as any).params?.jobId, 
      code: err.code, 
      statusCode: err.statusCode,
      message: err.message,
      errors: err.errors
    }, 'AppError caught in errorHandler');
    res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      ...(err.errors && err.errors.length > 0 && { errors: err.errors }),
    });
    return;
  }

  // Unknown / system error — log full details, expose nothing
  logger.error({ err }, 'Unhandled error');

  res.status(500).json({
    status: 'error',
    code: ErrorCode.COMMON.INTERNAL_ERROR,
  });
};
