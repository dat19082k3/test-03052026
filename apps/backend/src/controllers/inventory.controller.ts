import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/app-error';
import {
  ErrorCode,
} from '@repo/types';
import * as inventoryService from '../services/inventory.service';

export class InventoryController {

  public async getVoucherTemplate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getVoucherTemplate();
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async createVoucher(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.createVoucher(req.body);
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async getVouchers(req: Request, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(500, Math.max(1, parseInt(req.query.limit as string) || 10));
      const search = req.query.search as string;
      const status = req.query.status as string;
      const from = req.query.from as string;
      const to = req.query.to as string;
      const tz = req.query.tz as string;
      const sortBy = req.query.sortBy as string;
      const sortOrder = req.query.sortOrder as 'asc' | 'desc';

      const result = await inventoryService.getVouchers({
        page,
        limit,
        search,
        status,
        from,
        to,
        tz,
        sortBy,
        sortOrder,
      });
      res.status(200).json({ status: 'success', ...result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async getVoucherById(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getVoucherById(req.params.id);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async updateVoucher(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.updateVoucher(req.params.id, req.body);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async deleteVoucher(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      await inventoryService.deleteDraftVoucher(req.params.id);
      res.status(200).json({ status: 'success', data: null });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async postVoucher(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      await inventoryService.postVoucher(req.params.id);
      res.status(200).json({ status: 'success', data: null });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async cancelVoucher(req: Request<{ id: string }, any, { reason: string }>, res: Response, next: NextFunction) {
    try {
      // Typically cancelled_by would come from req.user.id if auth is enabled
      await inventoryService.cancelVoucher(req.params.id, req.body.reason);
      res.status(200).json({ status: 'success', data: null });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async replaceVoucher(req: Request<{ id: string }>, res: Response, next: NextFunction) {
    try {
      // Uses the same dto as create
      const result = await inventoryService.replaceVoucher(req.params.id, req.body);
      res.status(201).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async exportVouchers(
    req: Request<any, any, {
      mode?: 'list_all' | 'list_selected' | 'forms_selected' | 'form_single';
      voucherIds?: string[];
      voucherId?: string;
      templatePath?: string;
    }>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const body = req.body || {};
      const result = await inventoryService.enqueueVoucherExport({
        mode: body.mode || (req.query.mode as any),
        voucherIds: body.voucherIds,
        voucherId: body.voucherId || (req.query.voucherId as string),
        status: body.mode ? undefined : req.query.status as string,
        startDate: body.mode ? undefined : req.query.startDate as string,
        endDate: body.mode ? undefined : req.query.endDate as string,
        templatePath: body.templatePath,
      });
      res.status(202).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async importVouchers(req: Request<any, any, { filePath: string }>, res: Response, next: NextFunction) {
    try {
      if (!req.body.filePath) {
        throw new AppError(ErrorCode.VALIDATION.REQUIRED, 400, [
          { field: 'filePath', code: ErrorCode.VALIDATION.REQUIRED },
        ]);
      }

      const result = await inventoryService.enqueueVoucherImport({
        filePath: req.body.filePath,
      });
      res.status(202).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }

  public async getExcelJob(req: Request<{ jobId: string }>, res: Response, next: NextFunction) {
    try {
      const result = await inventoryService.getInventoryExcelJob(req.params.jobId);
      res.status(200).json({ status: 'success', data: result });
    } catch (error) {
      next(error instanceof AppError ? error : new AppError(ErrorCode.COMMON.INTERNAL_ERROR, 500));
    }
  }
}

export const inventoryController = new InventoryController();
