import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { Customer } from '../models/Customer.js';
import { Modifier } from '../models/Modifier.js';
import { RestaurantTable } from '../models/RestaurantTable.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { recordPayments, refundPayment } from '../services/paymentService.js';
import { startShift } from '../services/shiftService.js';
import {
  completeOrder,
  createOrder,
  getOrder,
  listCustomers,
  listOrders,
  listProductsForPos,
  listReceipts,
  listTables,
  refundOrder,
  resumeOrder,
  updateOrder,
  voidOrder,
  type OrderInput,
} from '../services/orderService.js';

const router = Router();
router.use(requireAuth);

const id = z.string().min(1);
const customerSchema = z.object({ name: z.string().min(2), phone: z.string().optional(), email: z.string().email().optional(), notes: z.string().optional() });
const tableSchema = z.object({ name: z.string().min(1), capacity: z.number().int().positive(), section: z.string().optional() });
const modifierSchema = z.object({ name: z.string().min(1), price: z.number().min(0), product: id.optional() });
const orderItemSchema = z.object({ product: id, variant: id.optional(), quantity: z.number().positive(), modifiers: z.array(id).optional(), notes: z.string().optional() });
const orderSchema = z.object({
  type: z.enum(['dine_in', 'take_away', 'delivery', 'mobile_van']),
  items: z.array(orderItemSchema).min(1),
  customer: id.optional(), table: id.optional(), waiter: id.optional(), guestCount: z.number().int().positive().optional(), notes: z.string().optional(),
  discountType: z.enum(['fixed', 'percentage']).optional(), discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(), serviceChargeRate: z.number().min(0).max(100).optional(), hold: z.boolean().optional(),
});
const reasonSchema = z.object({ reason: z.string().min(2) });

function userId(req: AuthenticatedRequest): string {
  return req.user!.id;
}

router.get('/products', requirePermission('pos.view'), async (req, res, next) => {
  try {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    res.json({ success: true, data: await listProductsForPos(search, category) });
  } catch (error) { next(error); }
});
router.get('/variants', requirePermission('pos.view'), async (_req, res, next) => {
  try {
    const { ProductVariant } = await import('../models/ProductVariant.js');
    res.json({ success: true, data: await ProductVariant.find({ isActive: true }).sort({ name: 1 }).lean() });
  } catch (error) { next(error); }
});

router.get('/customers', requirePermission('pos.view'), async (req, res, next) => {
  try { res.json({ success: true, data: await listCustomers(typeof req.query.search === 'string' ? req.query.search : undefined) }); } catch (error) { next(error); }
});
router.post('/customers', requirePermission('pos.manage'), validateBody(customerSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Customer.create(req.body) }); } catch (error) { next(error); }
});

router.get('/tables', requirePermission('pos.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await listTables() }); } catch (error) { next(error); }
});
router.post('/tables', requirePermission('pos.manage'), validateBody(tableSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await RestaurantTable.create(req.body) }); } catch (error) { next(error); }
});
router.get('/waiters', requirePermission('pos.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await User.find({ isActive: true }).select('firstName lastName email').sort({ firstName: 1 }).lean() }); } catch (error) { next(error); }
});
router.patch('/tables/:id/status', requirePermission('pos.manage'), validateBody(z.object({ status: z.enum(['available', 'occupied', 'reserved', 'cleaning', 'inactive']) })), async (req, res, next) => {
  try { const table = await RestaurantTable.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true }); if (!table) throw new AppError('Table not found', 404); res.json({ success: true, data: table }); } catch (error) { next(error); }
});

router.get('/modifiers', requirePermission('pos.view'), async (req, res, next) => {
  try { const query = typeof req.query.product === 'string' ? { product: req.query.product, isActive: true } : { isActive: true }; res.json({ success: true, data: await Modifier.find(query).sort({ name: 1 }).lean() }); } catch (error) { next(error); }
});
router.post('/modifiers', requirePermission('pos.manage'), validateBody(modifierSchema), async (req, res, next) => {
  try { res.status(201).json({ success: true, data: await Modifier.create(req.body) }); } catch (error) { next(error); }
});

router.post('/orders', requirePermission('pos.create'), validateBody(orderSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.status(201).json({ success: true, data: await createOrder(req.body as OrderInput, userId(req)) }); } catch (error) { next(error); }
});
router.get('/orders', requirePermission('pos.view'), async (req, res, next) => {
  try { res.json({ success: true, data: await listOrders({ status: typeof req.query.status === 'string' ? req.query.status : undefined, type: typeof req.query.type === 'string' ? req.query.type : undefined, search: typeof req.query.search === 'string' ? req.query.search : undefined }) }); } catch (error) { next(error); }
});
router.get('/orders/:id', requirePermission('pos.view'), async (req, res, next) => {
  try { res.json({ success: true, data: await getOrder(String(req.params.id)) }); } catch (error) { next(error); }
});
router.patch('/orders/:id', requirePermission('pos.manage'), validateBody(orderSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await updateOrder(String(req.params.id), req.body as OrderInput, userId(req)) }); } catch (error) { next(error); }
});
router.post('/orders/:id/resume', requirePermission('pos.create'), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await resumeOrder(String(req.params.id), userId(req)) }); } catch (error) { next(error); }
});
router.post('/orders/:id/pay', requirePermission('pos.create'), async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await getOrder(String(req.params.id));
    const paid = await Payment.aggregate([{ $match: { order: order._id, status: { $ne: 'voided' } } }, { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$refundedAmount'] } } } }]);
    const remaining = Number((order.total - (paid[0]?.total ?? 0)).toFixed(2));
    res.json({ success: true, data: await recordPayments(String(req.params.id), [{ method: 'cash', amount: remaining }], userId(req)) });
  } catch (error) { next(error); }
});
router.post('/orders/:id/void', requirePermission('pos.void'), validateBody(reasonSchema), async (req: AuthenticatedRequest, res, next) => {
  try { res.json({ success: true, data: await voidOrder(String(req.params.id), req.body.reason, userId(req)) }); } catch (error) { next(error); }
});
router.post('/orders/:id/refund', requirePermission('pos.refund'), validateBody(reasonSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const order = await getOrder(String(req.params.id));
    const payments = await Payment.aggregate([{ $match: { order: order._id, status: { $ne: 'voided' } } }, { $group: { _id: null, total: { $sum: { $subtract: ['$amount', '$refundedAmount'] } } } }]);
    const result = await refundPayment(String(req.params.id), payments[0]?.total ?? order.total, req.body.reason, userId(req));
    res.json({ success: true, data: result.order });
  } catch (error) { next(error); }
});

router.get('/receipts', requirePermission('pos.view'), async (_req, res, next) => {
  try { res.json({ success: true, data: await listReceipts() }); } catch (error) { next(error); }
});

export default router;
