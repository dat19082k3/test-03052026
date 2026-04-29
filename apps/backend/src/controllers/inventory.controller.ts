import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { AppError } from '../utils/app-error';
import {
  ApiSuccessResponse,
  ApiErrorResponse,
  PaginatedResponse,
  InventoryVoucher,
  ErrorCode,
} from '@repo/types';

/**
 * Controller for Inventory API endpoints.
 * Uses AppError for business errors — never exposes raw messages.
 */
export class InventoryController {

  public async createVoucher(
    req: Request,
    res: Response<ApiSuccessResponse<InventoryVoucher>>,
    next: NextFunction,
  ) {
    try {
      // TODO: Implement create logic, transaction with voucher & details
      res.status(201).json({
        status: 'success',
        data: {} as InventoryVoucher,
      });
    } catch (error) {
      logger.error({ err: error }, 'Error creating inventory voucher');
      next(new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async getVouchers(
    req: Request,
    res: Response<PaginatedResponse<InventoryVoucher>>,
    next: NextFunction,
  ) {
    try {
      // TODO: Implement pagination and filtering logic
      res.status(200).json({
        status: 'success',
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      });
    } catch (error) {
      logger.error({ err: error }, 'Error fetching inventory vouchers');
      next(new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async getVoucherById(
    req: Request<{ id: string }>,
    res: Response<ApiSuccessResponse<InventoryVoucher>>,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      // TODO: Retrieve voucher, throw AppError if not found
      // throw new AppError(ErrorCode.VOUCHER.NOT_FOUND, 404);
      res.status(200).json({
        status: 'success',
        data: {} as InventoryVoucher,
      });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      logger.error({ err: error }, 'Error fetching inventory voucher');
      next(new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async updateVoucher(
    req: Request<{ id: string }>,
    res: Response<ApiSuccessResponse<InventoryVoucher>>,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      // TODO: Update voucher logic
      res.status(200).json({
        status: 'success',
        data: {} as InventoryVoucher,
      });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      logger.error({ err: error }, 'Error updating inventory voucher');
      next(new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async deleteVoucher(
    req: Request<{ id: string }>,
    res: Response<ApiSuccessResponse<null>>,
    next: NextFunction,
  ) {
    try {
      const { id } = req.params;
      // TODO: Soft delete voucher logic
      res.status(200).json({
        status: 'success',
        data: null,
      });
    } catch (error) {
      if (error instanceof AppError) return next(error);
      logger.error({ err: error }, 'Error deleting inventory voucher');
      next(new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }
}

export const inventoryController = new InventoryController();
