import { Router } from 'express';
import { z } from 'zod';
import mongoose from 'mongoose';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validateBody } from '../middleware/validation.js';
import { AppError } from '../middleware/errorHandler.js';
import { Van } from '../models/Van.js';
import { VanSession } from '../models/VanSession.js';
import { VanInventory } from '../models/VanInventory.js';
import { Order, type IOrderItem } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { Customer } from '../models/Customer.js';
import { Payment } from '../models/Payment.js';
import { StockMovement } from '../models/StockMovement.js';
import { AuditLog } from '../models/AuditLog.js';

const router = Router();
router.use(requireAuth);

function userId(req: AuthenticatedRequest): string {
  return req.user!.id;
}

// Schemas
const vanSchema = z.object({
  vanNumber: z.string().min(1),
  plateNumber: z.string().min(1),
  modelName: z.string().optional(),
  driver: z.string().optional(),
  assignedSalesperson: z.string().optional(),
  status: z.enum(['active', 'maintenance', 'inactive']).optional(),
  capacity: z.number().min(0).optional(),
  notes: z.string().optional(),
});

const startSessionSchema = z.object({
  van: z.string().min(1),
  startOdometer: z.number().min(0).optional(),
  startingCash: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const closeSessionSchema = z.object({
  endOdometer: z.number().min(0).optional(),
  endingCashCollected: z.number().min(0),
  notes: z.string().optional(),
});

const transferStockSchema = z.object({
  van: z.string().min(1),
  product: z.string().min(1),
  variant: z.string().optional(),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

const mobileOrderItemSchema = z.object({
  product: z.string().min(1),
  variant: z.string().optional(),
  name: z.string().optional(),
  sku: z.string().optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  modifiers: z.array(z.object({ modifier: z.string(), name: z.string(), price: z.number() })).optional(),
  notes: z.string().optional(),
});

const paymentItemSchema = z.object({
  method: z.enum(['cash', 'card', 'digital_wallet', 'customer_account']),
  amount: z.number().positive(),
  reference: z.string().optional(),
});

const mobileOrderSchema = z.object({
  vanId: z.string().min(1),
  sessionId: z.string().optional(),
  customer: z.string().optional(),
  items: z.array(mobileOrderItemSchema).min(1),
  discountType: z.enum(['fixed', 'percentage']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).default(0),
  payments: z.array(paymentItemSchema).min(1),
  notes: z.string().optional(),
  offlineId: z.string().optional(),
});

const batchSyncSchema = z.object({
  orders: z.array(mobileOrderSchema).min(1),
});

// --- Van Fleet Management ---

router.get('/vans', async (_req, res, next) => {
  try {
    const vans = await Van.find().populate('driver', 'firstName lastName email').populate('assignedSalesperson', 'firstName lastName email').sort({ createdAt: -1 }).lean();
    res.json({ success: true, data: vans });
  } catch (error) {
    next(error);
  }
});

router.post('/vans', validateBody(vanSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const van = await Van.create(req.body);
    await AuditLog.create({
      user: userId(req),
      action: 'van.create',
      module: 'mobile_van',
      entity: 'Van',
      entityId: String(van._id),
      after: van.toObject(),
    });
    res.status(201).json({ success: true, data: van });
  } catch (error) {
    next(error);
  }
});

router.put('/vans/:id', validateBody(vanSchema.partial()), async (req: AuthenticatedRequest, res, next) => {
  try {
    const van = await Van.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!van) throw new AppError('Van not found', 404);
    await AuditLog.create({
      user: userId(req),
      action: 'van.update',
      module: 'mobile_van',
      entity: 'Van',
      entityId: String(van._id),
      after: van.toObject(),
    });
    res.json({ success: true, data: van });
  } catch (error) {
    next(error);
  }
});

router.delete('/vans/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const van = await Van.findByIdAndDelete(req.params.id);
    if (!van) throw new AppError('Van not found', 404);
    await AuditLog.create({
      user: userId(req),
      action: 'van.delete',
      module: 'mobile_van',
      entity: 'Van',
      entityId: String(van._id),
    });
    res.json({ success: true, data: { message: 'Van deleted successfully' } });
  } catch (error) {
    next(error);
  }
});

// --- Van Sessions ---

router.post('/sessions/start', validateBody(startSessionSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const currentUserId = userId(req);
    const existingVanActive = await VanSession.findOne({ van: req.body.van, status: 'active' });
    if (existingVanActive) {
      throw new AppError('This van already has an active sales session', 400);
    }

    const session = await VanSession.create({
      van: req.body.van,
      assignedTo: currentUserId,
      startOdometer: req.body.startOdometer,
      startingCash: req.body.startingCash,
      notes: req.body.notes,
      status: 'active',
      startTime: new Date(),
    });

    await AuditLog.create({
      user: currentUserId,
      action: 'van_session.start',
      module: 'mobile_van',
      entity: 'VanSession',
      entityId: String(session._id),
      after: session.toObject(),
    });

    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

router.get('/sessions/active', async (req: AuthenticatedRequest, res, next) => {
  try {
    const currentUserId = userId(req);
    const vanId = typeof req.query.vanId === 'string' ? req.query.vanId : undefined;
    const query: Record<string, unknown> = { status: 'active' };
    if (vanId) {
      query.van = vanId;
    } else {
      query.assignedTo = currentUserId;
    }

    const session = await VanSession.findOne(query).populate('van').populate('assignedTo', 'firstName lastName email').sort({ createdAt: -1 });
    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

router.post('/sessions/:id/close', validateBody(closeSessionSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const session = await VanSession.findById(req.params.id);
    if (!session) throw new AppError('Session not found', 404);
    if (session.status === 'closed') throw new AppError('Session is already closed', 400);

    // Calculate expected cash from orders in this session
    const orders = await Order.find({ notes: new RegExp(String(session._id)), status: 'completed' });
    let totalCashSales = 0;

    for (const order of orders) {
      const payments = await Payment.find({ order: order._id, method: 'cash', status: 'completed' });
      for (const p of payments) {
        totalCashSales += p.amount;
      }
    }

    const expectedCash = session.startingCash + totalCashSales;
    const cashVariance = req.body.endingCashCollected - expectedCash;

    session.status = 'closed';
    session.endTime = new Date();
    session.endOdometer = req.body.endOdometer;
    session.endingCashCollected = req.body.endingCashCollected;
    session.expectedCash = expectedCash;
    session.cashVariance = cashVariance;
    session.closedBy = new mongoose.Types.ObjectId(userId(req));
    if (req.body.notes) session.notes = (session.notes ? session.notes + ' | ' : '') + req.body.notes;

    await session.save();

    await AuditLog.create({
      user: userId(req),
      action: 'van_session.close',
      module: 'mobile_van',
      entity: 'VanSession',
      entityId: String(session._id),
      after: session.toObject(),
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
});

// --- Van Inventory Management ---

router.get('/inventory/:vanId', async (req, res, next) => {
  try {
    const inventory = await VanInventory.find({ van: req.params.vanId })
      .populate({ path: 'product', select: 'name sku sellingPrice image category type unit stockQuantity' })
      .populate('variant', 'name sku price')
      .sort({ updatedAt: -1 })
      .lean();
    res.json({ success: true, data: inventory });
  } catch (error) {
    next(error);
  }
});

router.post('/inventory/transfer', validateBody(transferStockSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { van: vanId, product: productId, variant: variantId, quantity, notes } = req.body;
    const currentUserId = userId(req);

    // Check main warehouse product stock
    const product = await Product.findById(productId);
    if (!product) throw new AppError('Product not found', 404);
    if (product.stockQuantity < quantity) {
      throw new AppError(`Insufficient warehouse stock for ${product.name}. Available: ${product.stockQuantity}`, 400);
    }

    // Deduct main stock
    product.stockQuantity -= quantity;
    await product.save();

    // Upsert van inventory
    let vanInv = await VanInventory.findOne({ van: vanId, product: productId, variant: variantId || null });
    if (!vanInv) {
      vanInv = new VanInventory({ van: vanId, product: productId, variant: variantId || null, quantity: 0 });
    }
    vanInv.quantity += quantity;
    vanInv.lastSyncedAt = new Date();
    await vanInv.save();

    // Log movements
    await StockMovement.create({
      product: productId,
      variant: variantId || undefined,
      type: 'transfer_out',
      quantity,
      balanceAfter: product.stockQuantity,
      fromLocation: 'Warehouse',
      toLocation: `Van:${vanId}`,
      notes: notes || 'Stock transfer to mobile sales van',
      performedBy: currentUserId,
    });

    await StockMovement.create({
      product: productId,
      variant: variantId || undefined,
      type: 'transfer_in',
      quantity,
      balanceAfter: vanInv.quantity,
      fromLocation: 'Warehouse',
      toLocation: `Van:${vanId}`,
      notes: notes || 'Stock received in van',
      performedBy: currentUserId,
    });

    await AuditLog.create({
      user: currentUserId,
      action: 'van_inventory.transfer',
      module: 'mobile_van',
      entity: 'VanInventory',
      entityId: String(vanInv._id),
      after: { vanId, productId, quantity, vanStock: vanInv.quantity, mainStock: product.stockQuantity },
    });

    res.json({ success: true, data: vanInv });
  } catch (error) {
    next(error);
  }
});

// Helper for Order creation
async function processMobileOrder(body: z.infer<typeof mobileOrderSchema>, currentUserId: string) {
  const van = await Van.findById(body.vanId);
  if (!van) throw new AppError('Van not found', 404);

  // Validate items and van inventory
  const parsedItems: IOrderItem[] = [];
  let subtotal = 0;

  for (const item of body.items) {
    const product = await Product.findById(item.product);
    if (!product) throw new AppError(`Product ${item.product} not found`, 404);

    const vanInv = await VanInventory.findOne({ van: body.vanId, product: item.product, variant: item.variant || null });
    if (!vanInv || vanInv.quantity < item.quantity) {
      const avail = vanInv ? vanInv.quantity : 0;
      throw new AppError(`Insufficient van stock for "${product.name}". Available on van: ${avail}, Requested: ${item.quantity}`, 400);
    }

    const lineTotal = Number((item.quantity * item.unitPrice).toFixed(2));
    subtotal += lineTotal;

    parsedItems.push({
      product: product._id as mongoose.Types.ObjectId,
      variant: item.variant ? (new mongoose.Types.ObjectId(item.variant) as unknown as mongoose.Types.ObjectId) : undefined,
      name: item.name || product.name,
      sku: item.sku || product.sku,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      modifiers: (item.modifiers || []).map((m) => ({ modifier: new mongoose.Types.ObjectId(m.modifier), name: m.name, price: m.price })),
      notes: item.notes,
      lineTotal,
    });

    // Deduct stock from VanInventory
    vanInv.quantity -= item.quantity;
    vanInv.lastSyncedAt = new Date();
    await vanInv.save();
  }

  // Calculate totals
  let discountTotal = 0;
  if (body.discountType === 'fixed') {
    discountTotal = Math.min(subtotal, body.discountValue || 0);
  } else if (body.discountType === 'percentage') {
    discountTotal = Number(((subtotal * (body.discountValue || 0)) / 100).toFixed(2));
  }

  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxTotal = Number(((taxableAmount * (body.taxRate || 0)) / 100).toFixed(2));
  const total = Number((taxableAmount + taxTotal).toFixed(2));

  // Payment sum validation
  const paymentSum = body.payments.reduce((acc, p) => acc + p.amount, 0);
  if (Math.abs(paymentSum - total) > 0.05) {
    throw new AppError(`Payment total (${paymentSum}) must match order total (${total})`, 400);
  }

  const orderNumber = `MVS-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

  let customerRef: mongoose.Types.ObjectId | undefined;
  if (body.customer) {
    const cust = await Customer.findById(body.customer);
    if (cust) {
      customerRef = cust._id as mongoose.Types.ObjectId;
      cust.totalSpent = (cust.totalSpent || 0) + total;
      cust.visitCount = (cust.visitCount || 0) + 1;
      await cust.save();
    }
  }

  const notesText = [
    `Van: ${van.vanNumber} (${van.plateNumber})`,
    body.sessionId ? `SessionRef: ${body.sessionId}` : null,
    body.offlineId ? `OfflineID: ${body.offlineId}` : null,
    body.notes,
  ]
    .filter(Boolean)
    .join(' | ');

  const order = await Order.create({
    orderNumber,
    type: 'mobile_van',
    source: 'pos',
    status: 'completed',
    paymentStatus: 'paid',
    items: parsedItems,
    customer: customerRef,
    subtotal,
    discountType: body.discountType,
    discountValue: body.discountValue || 0,
    discountTotal,
    taxRate: body.taxRate || 0,
    taxTotal,
    serviceChargeRate: 0,
    serviceChargeTotal: 0,
    total,
    notes: notesText,
    createdBy: new mongoose.Types.ObjectId(currentUserId),
  });

  // Record Payments
  const recordedPayments = [];
  for (const p of body.payments) {
    const payment = await Payment.create({
      order: order._id,
      amount: p.amount,
      method: p.method,
      status: 'completed',
      reference: p.reference || orderNumber,
      createdBy: new mongoose.Types.ObjectId(currentUserId),
    });
    recordedPayments.push(payment);
  }

  // Update session totals if provided
  if (body.sessionId) {
    const session = await VanSession.findById(body.sessionId);
    if (session && session.status === 'active') {
      session.totalSales += total;
      session.totalOrdersCount += 1;
      await session.save();
    }
  }

  await AuditLog.create({
    user: currentUserId,
    action: 'mobile_van_order.create',
    module: 'mobile_van',
    entity: 'Order',
    entityId: String(order._id),
    after: { orderNumber, total, vanId: body.vanId, offlineId: body.offlineId },
  });

  return { order, payments: recordedPayments };
}

// Order APIs
router.post('/orders', validateBody(mobileOrderSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await processMobileOrder(req.body, userId(req));
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

router.post('/sync-offline-orders', validateBody(batchSyncSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const currentUserId = userId(req);
    const results = [];
    const errors = [];

    for (const orderData of req.body.orders) {
      try {
        const result = await processMobileOrder(orderData, currentUserId);
        results.push({ offlineId: orderData.offlineId, success: true, orderId: result.order._id, orderNumber: result.order.orderNumber });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to sync offline order';
        errors.push({ offlineId: orderData.offlineId, success: false, error: message });
      }
    }

    res.json({ success: true, data: { syncedCount: results.length, errorCount: errors.length, results, errors } });
  } catch (error) {
    next(error);
  }
});

router.get('/orders', async (req, res, next) => {
  try {
    const { vanId, sessionId, search } = req.query;
    const query: Record<string, unknown> = { type: 'mobile_van' };

    if (vanId) {
      query.notes = new RegExp(`Van: .*`);
    }
    if (sessionId) {
      query.notes = new RegExp(`SessionRef: ${sessionId}`);
    }
    if (search && typeof search === 'string') {
      query.orderNumber = new RegExp(search, 'i');
    }

    const orders = await Order.find(query).populate('customer', 'name phone email').populate('createdBy', 'firstName lastName').sort({ createdAt: -1 }).limit(100).lean();
    res.json({ success: true, data: orders });
  } catch (error) {
    next(error);
  }
});

// Daily Closing Summary Report
router.get('/summary/:sessionId', async (req, res, next) => {
  try {
    const session = await VanSession.findById(req.params.sessionId).populate('van').populate('assignedTo', 'firstName lastName email').lean();
    if (!session) throw new AppError('Session not found', 404);

    const vanId = String(session.van._id);
    const vanInventory = await VanInventory.find({ van: vanId }).populate('product', 'name sku sellingPrice unit').lean();

    const orders = await Order.find({ notes: new RegExp(`SessionRef: ${session._id}`), status: 'completed' }).lean();

    let totalCash = 0;
    let totalCard = 0;
    let totalDigitalWallet = 0;
    let totalCustomerAccount = 0;

    const orderIds = orders.map((o) => o._id);
    const payments = await Payment.find({ order: { $in: orderIds }, status: 'completed' }).lean();

    for (const p of payments) {
      if (p.method === 'cash') totalCash += p.amount;
      else if (p.method === 'card') totalCard += p.amount;
      else if (p.method === 'digital_wallet') totalDigitalWallet += p.amount;
      else if (p.method === 'customer_account') totalCustomerAccount += p.amount;
    }

    res.json({
      success: true,
      data: {
        session,
        vanInventory,
        ordersCount: orders.length,
        totalSales: session.totalSales,
        paymentBreakdown: {
          cash: totalCash,
          card: totalCard,
          digitalWallet: totalDigitalWallet,
          customerAccount: totalCustomerAccount,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
