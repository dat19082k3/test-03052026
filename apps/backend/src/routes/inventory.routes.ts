import { Router } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { validate } from '../middlewares/validate.middleware';
import { createVoucherSchema, updateVoucherSchema } from '@repo/types';

const router = Router();

router.post('/vouchers', validate(createVoucherSchema), inventoryController.createVoucher);

router.get('/vouchers', inventoryController.getVouchers);

router.get('/vouchers/template', inventoryController.getVoucherTemplate);

router.get('/vouchers/:id', inventoryController.getVoucherById);

router.put('/vouchers/:id', validate(updateVoucherSchema), inventoryController.updateVoucher);

router.delete('/vouchers/:id', inventoryController.deleteVoucher);

router.post('/vouchers/:id/post', inventoryController.postVoucher);
router.post('/vouchers/:id/cancel', inventoryController.cancelVoucher);
router.post('/vouchers/:id/replace', validate(createVoucherSchema), inventoryController.replaceVoucher);

export default router;
