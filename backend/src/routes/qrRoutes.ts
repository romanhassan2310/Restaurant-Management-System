import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validation.js';
import { getQrMenu, getQrOrderStatus, submitQrOrder } from '../services/qrService.js';

const router = Router();
const id = z.string().min(1);
const itemSchema = z.object({ product: id, variant: id.optional(), quantity: z.number().positive(), modifiers: z.array(id).optional(), notes: z.string().max(500).optional() });
const orderSchema = z.object({
  customerName: z.string().min(2).max(100),
  customerPhone: z.string().min(5).max(30),
  customerEmail: z.string().email().optional(),
  guestCount: z.number().int().positive().optional(),
  items: z.array(itemSchema).min(1),
  notes: z.string().max(500).optional(),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  serviceChargeRate: z.number().min(0).max(100).optional(),
  paymentMethod: z.enum(['cash', 'card', 'qr', 'mobile_payment']).optional(),
});

router.get('/:token/menu', async (req, res, next) => {
  try { res.json({ success: true, data: await getQrMenu(String(req.params.token)) }); } catch (error) { next(error); }
});
router.post('/:token/orders', validateBody(orderSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await submitQrOrder(String(req.params.token), req.body) }); } catch (error) { next(error); }
});
router.get('/:token/orders/:orderId', async (req, res, next) => {
  try { res.json({ success: true, data: await getQrOrderStatus(String(req.params.token), String(req.params.orderId)) }); } catch (error) { next(error); }
});

export default router;
