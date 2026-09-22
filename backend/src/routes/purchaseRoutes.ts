import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requirePermission, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { Supplier } from '../models/Supplier.js';
import { GoodsReceipt } from '../models/GoodsReceipt.js';
import { PurchaseInvoice } from '../models/PurchaseInvoice.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { PurchaseRequest } from '../models/PurchaseRequest.js';
import { PurchaseReturn } from '../models/PurchaseReturn.js';
import { SupplierPayment } from '../models/SupplierPayment.js';
import { AuditLog } from '../models/AuditLog.js';
import { createPurchaseInvoice, createPurchaseOrder, createPurchaseRequest, createPurchaseReturn, createSupplier, getSupplierHistory, listPurchaseReports, listSuppliers, paySupplier, receiveGoods, updatePurchaseRequest } from '../services/purchaseService.js';

const router = Router();
router.use(requireAuth);
const id = z.string().min(1);
const supplierSchema = z.object({ name: z.string().min(2), code: z.string().min(1), contactPerson: z.string().optional(), email: z.string().email().optional(), phone: z.string().optional(), address: z.object({ line1: z.string().optional(), line2: z.string().optional(), city: z.string().optional(), state: z.string().optional(), postalCode: z.string().optional(), country: z.string().optional() }).optional(), paymentTermsDays: z.number().int().min(0).optional() });
const itemSchema = z.object({ product: id, variant: id.optional(), quantity: z.number().positive(), notes: z.string().optional() });
const requestSchema = z.object({ supplier: id.optional(), items: z.array(itemSchema).min(1), notes: z.string().optional() });
const orderItemSchema = z.object({ product: id, variant: id.optional(), quantity: z.number().positive(), unitCost: z.number().min(0) });
const orderSchema = z.object({ supplier: id, request: id.optional(), items: z.array(orderItemSchema).min(1), taxTotal: z.number().min(0).optional(), expectedDate: z.coerce.date().optional(), notes: z.string().optional() });
const receiveSchema = z.object({ purchaseOrder: id, items: z.array(z.object({ product: id, variant: id.optional(), quantity: z.number().positive() })).min(1), notes: z.string().optional() });
const invoiceSchema = z.object({ supplier: id, purchaseOrder: id.optional(), goodsReceipt: id.optional(), subtotal: z.number().min(0), taxTotal: z.number().min(0).optional(), dueDate: z.coerce.date().optional(), notes: z.string().optional() });
const returnSchema = z.object({ supplier: id, purchaseOrder: id.optional(), items: z.array(z.object({ product: id, variant: id.optional(), quantity: z.number().positive(), unitCost: z.number().min(0) })).min(1), reason: z.string().min(2) });
const paymentSchema = z.object({ supplier: id, invoice: id.optional(), amount: z.number().positive(), method: z.enum(['cash', 'card', 'bank', 'mobile_payment']), reference: z.string().optional(), notes: z.string().optional() });
function userId(req: AuthenticatedRequest): string { return req.user!.id; }

router.get('/suppliers', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await listSuppliers() }); } catch (error) { next(error); } });
router.post('/suppliers', requirePermission('purchase.manage'), validateBody(supplierSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createSupplier(req.body, userId(req)) }); } catch (error) { next(error); } });
router.get('/suppliers/:id/history', requirePermission('purchase.view'), async (req, res, next) => { try { res.json({ success: true, data: await getSupplierHistory(String(req.params.id)) }); } catch (error) { next(error); } });

router.get('/requests', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await PurchaseRequest.find({}).populate('supplier items.product').sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); } });
router.post('/requests', requirePermission('purchase.manage'), validateBody(requestSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createPurchaseRequest(req.body, userId(req)) }); } catch (error) { next(error); } });
router.patch('/requests/:id/status', requirePermission('purchase.approve'), validateBody(z.object({ status: z.enum(['submitted', 'approved', 'cancelled']) })), async (req: AuthenticatedRequest, res, next) => { try { res.json({ success: true, data: await updatePurchaseRequest(String(req.params.id), req.body.status, userId(req)) }); } catch (error) { next(error); } });

router.get('/orders', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await PurchaseOrder.find({}).populate('supplier request items.product').sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); } });
router.post('/orders', requirePermission('purchase.manage'), validateBody(orderSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createPurchaseOrder(req.body, userId(req)) }); } catch (error) { next(error); } });
router.patch('/orders/:id/status', requirePermission('purchase.manage'), validateBody(z.object({ status: z.enum(['sent', 'approved', 'cancelled']) })), async (req, res, next) => { try { const order = await PurchaseOrder.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }); res.json({ success: true, data: order }); } catch (error) { next(error); } });

router.get('/receipts', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await GoodsReceipt.find({}).populate('supplier purchaseOrder items.product').sort({ receivedAt: -1 }).lean() }); } catch (error) { next(error); } });
router.post('/receipts', requirePermission('purchase.receive'), validateBody(receiveSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await receiveGoods(req.body, userId(req)) }); } catch (error) { next(error); } });
router.get('/invoices', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await PurchaseInvoice.find({}).populate('supplier purchaseOrder goodsReceipt').sort({ invoiceDate: -1 }).lean() }); } catch (error) { next(error); } });
router.post('/invoices', requirePermission('purchase.manage'), validateBody(invoiceSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createPurchaseInvoice(req.body, userId(req)) }); } catch (error) { next(error); } });
router.get('/returns', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await PurchaseReturn.find({}).populate('supplier purchaseOrder items.product').sort({ createdAt: -1 }).lean() }); } catch (error) { next(error); } });
router.post('/returns', requirePermission('purchase.return'), validateBody(returnSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await createPurchaseReturn(req.body, userId(req)) }); } catch (error) { next(error); } });
router.get('/payments', requirePermission('purchase.view'), async (_req, res, next) => { try { res.json({ success: true, data: await SupplierPayment.find({}).populate('supplier invoice').sort({ paidAt: -1 }).lean() }); } catch (error) { next(error); } });
router.post('/payments', requirePermission('supplier.payment'), validateBody(paymentSchema), async (req: AuthenticatedRequest, res, next) => { try { res.status(201).json({ success: true, data: await paySupplier(req.body, userId(req)) }); } catch (error) { next(error); } });
router.get('/reports', requirePermission('purchase.report'), async (_req, res, next) => { try { res.json({ success: true, data: await listPurchaseReports() }); } catch (error) { next(error); } });
router.get('/audit', requirePermission('purchase.report'), async (_req, res, next) => { try { res.json({ success: true, data: await AuditLog.find({ module: 'purchasing' }).sort({ createdAt: -1 }).limit(200).lean() }); } catch (error) { next(error); } });

export default router;
