import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { validate } from '../middlewares/validate.middleware';
import { createVoucherSchema, updateVoucherSchema } from '@repo/types';
import { inventoryImportUpload } from '../middlewares/inventory-import-upload.middleware';

const router = Router();

router.post('/vouchers', validate(createVoucherSchema), inventoryController.createVoucher);

router.get('/vouchers', inventoryController.getVouchers);

router.post('/vouchers/export', inventoryController.exportVouchers);

router.post(
  '/vouchers/import',
  inventoryImportUpload.single('file'),
  inventoryController.importVouchers,
);

router.get('/excel-jobs/:jobId/download', inventoryController.downloadExcelJob);

router.get('/excel-jobs/:jobId', inventoryController.getExcelJob);

router.get('/vouchers/template', inventoryController.getVoucherTemplate);

router.get('/vouchers/:id', inventoryController.getVoucherById);

router.put('/vouchers/:id', validate(updateVoucherSchema), inventoryController.updateVoucher);

router.delete('/vouchers/:id', inventoryController.deleteVoucher);

router.post('/vouchers/:id/post', inventoryController.postVoucher);
router.post('/vouchers/:id/cancel', inventoryController.cancelVoucher);
router.post('/vouchers/:id/replace', validate(createVoucherSchema), inventoryController.replaceVoucher);

export default router;
