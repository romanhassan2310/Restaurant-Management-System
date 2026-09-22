import mongoose, { type ClientSession } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { GoodsReceipt } from '../models/GoodsReceipt.js';
import { Product } from '../models/Product.js';
import { PurchaseInvoice } from '../models/PurchaseInvoice.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { PurchaseRequest } from '../models/PurchaseRequest.js';
import { PurchaseReturn } from '../models/PurchaseReturn.js';
import { Supplier } from '../models/Supplier.js';
import { SupplierPayment } from '../models/SupplierPayment.js';
import { createStockMovement, recordPurchase } from './inventoryService.js';

function money(value: number) { return Math.round((value + Number.EPSILON) * 100) / 100; }
function number(prefix: string) { return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`; }
async function audit(action: string, entity: string, entityId: string, userId: string, after: Record<string, unknown>, session?: ClientSession) {
  await AuditLog.create([{ user: userId, action, module: 'purchasing', entity, entityId, after }], { session });
}
async function transaction<T>(callback: (session: ClientSession) => Promise<T>) {
  const session = await mongoose.startSession();
  try { let result!: T; await session.withTransaction(async () => { result = await callback(session); }); return result; } finally { await session.endSession(); }
}

export async function createSupplier(input: Record<string, unknown>, userId: string) {
  const supplier = await Supplier.create(input);
  await audit('supplier_created', 'Supplier', String(supplier._id), userId, { name: supplier.name, code: supplier.code });
  return supplier;
}
export async function listSuppliers() { return Supplier.find({}).sort({ name: 1 }).lean(); }
export async function getSupplierHistory(supplierId: string) {
  const [orders, receipts, invoices, payments, returns] = await Promise.all([
    PurchaseOrder.find({ supplier: supplierId }).sort({ createdAt: -1 }).lean(),
    GoodsReceipt.find({ supplier: supplierId }).sort({ receivedAt: -1 }).lean(),
    PurchaseInvoice.find({ supplier: supplierId }).sort({ invoiceDate: -1 }).lean(),
    SupplierPayment.find({ supplier: supplierId }).sort({ paidAt: -1 }).lean(),
    PurchaseReturn.find({ supplier: supplierId }).sort({ createdAt: -1 }).lean(),
  ]);
  return { orders, receipts, invoices, payments, returns };
}

export async function createPurchaseRequest(input: { supplier?: string; items: Array<{ product: string; variant?: string; quantity: number; notes?: string }>; notes?: string }, userId: string) {
  const request = await PurchaseRequest.create({ ...input, requestNumber: number('PR'), requestedBy: userId });
  await audit('purchase_request_created', 'PurchaseRequest', String(request._id), userId, { requestNumber: request.requestNumber });
  return request;
}
export async function updatePurchaseRequest(id: string, status: 'submitted' | 'approved' | 'cancelled', userId: string) {
  const request = await PurchaseRequest.findById(id);
  if (!request) throw new AppError('Purchase request not found', 404);
  if (request.status === 'cancelled' || request.status === 'converted') throw new AppError('Purchase request cannot be changed', 409);
  request.status = status;
  if (status === 'approved') request.approvedBy = userId as unknown as typeof request.approvedBy;
  await request.save();
  await audit('purchase_request_status_changed', 'PurchaseRequest', id, userId, { status });
  return request;
}

export async function createPurchaseOrder(input: { supplier: string; request?: string; items: Array<{ product: string; variant?: string; quantity: number; unitCost: number }>; taxTotal?: number; expectedDate?: Date; notes?: string }, userId: string) {
  const supplier = await Supplier.findOne({ _id: input.supplier, isActive: true });
  if (!supplier) throw new AppError('Supplier not found', 404);
  const items = input.items.map((item) => ({ ...item, receivedQuantity: 0, lineTotal: money(item.quantity * item.unitCost) }));
  const subtotal = money(items.reduce((sum, item) => sum + item.lineTotal, 0));
  const taxTotal = input.taxTotal ?? 0;
  const order = await PurchaseOrder.create({ ...input, orderNumber: number('PO'), items, subtotal, taxTotal, total: money(subtotal + taxTotal), createdBy: userId });
  if (input.request) await PurchaseRequest.findByIdAndUpdate(input.request, { status: 'converted' });
  await audit('purchase_order_created', 'PurchaseOrder', String(order._id), userId, { orderNumber: order.orderNumber, total: order.total });
  return order;
}

export async function receiveGoods(input: { purchaseOrder: string; items: Array<{ product: string; variant?: string; quantity: number }>; notes?: string }, userId: string) {
  return transaction(async (session) => {
    const order = await PurchaseOrder.findById(input.purchaseOrder).session(session);
    if (!order || order.status === 'cancelled') throw new AppError('Purchase order not found or cancelled', 404);
    const receiptItems = [];
    for (const inputItem of input.items) {
      const line = order.items.find((item) => String(item.product) === inputItem.product && String(item.variant ?? '') === String(inputItem.variant ?? ''));
      if (!line) throw new AppError('Goods receipt item is not on the purchase order', 400);
      const remaining = line.quantity - line.receivedQuantity;
      if (inputItem.quantity <= 0 || inputItem.quantity > remaining) throw new AppError('Received quantity exceeds outstanding purchase quantity', 400);
      line.receivedQuantity += inputItem.quantity;
      await recordPurchase(inputItem.product, inputItem.quantity, line.unitCost, userId, inputItem.variant, session, String(order._id));
      receiptItems.push({ product: inputItem.product, variant: inputItem.variant, quantity: inputItem.quantity, unitCost: line.unitCost });
    }
    const total = money(receiptItems.reduce((sum, item) => sum + item.quantity * item.unitCost, 0));
    const [receipt] = await GoodsReceipt.create([{ receiptNumber: number('GRN'), purchaseOrder: order._id, supplier: order.supplier, items: receiptItems, total, receivedBy: userId, notes: input.notes }], { session });
    const allReceived = order.items.every((item) => item.receivedQuantity >= item.quantity);
    order.status = allReceived ? 'received' : 'partially_received';
    await order.save({ session });
    await audit('goods_received', 'GoodsReceipt', String(receipt._id), userId, { purchaseOrder: String(order._id), total, items: receiptItems }, session);
    return receipt;
  });
}

export async function createPurchaseInvoice(input: { supplier: string; purchaseOrder?: string; goodsReceipt?: string; subtotal: number; taxTotal?: number; dueDate?: Date; notes?: string }, userId: string) {
  return transaction(async (session) => {
    const supplier = await Supplier.findOne({ _id: input.supplier, isActive: true }).session(session);
    if (!supplier) throw new AppError('Supplier not found', 404);
    const taxTotal = input.taxTotal ?? 0;
    const invoice = await PurchaseInvoice.create([{ ...input, invoiceNumber: number('PINV'), taxTotal, total: money(input.subtotal + taxTotal), createdBy: userId }], { session });
    supplier.balance = money(supplier.balance + invoice[0].total);
    await supplier.save({ session });
    await audit('purchase_invoice_created', 'PurchaseInvoice', String(invoice[0]._id), userId, { total: invoice[0].total, supplier: input.supplier }, session);
    return invoice[0];
  });
}

export async function createPurchaseReturn(input: { supplier: string; purchaseOrder?: string; items: Array<{ product: string; variant?: string; quantity: number; unitCost: number }>; reason: string }, userId: string) {
  return transaction(async (session) => {
    const supplier = await Supplier.findOne({ _id: input.supplier, isActive: true }).session(session);
    if (!supplier) throw new AppError('Supplier not found', 404);
    const total = money(input.items.reduce((sum, item) => sum + item.quantity * item.unitCost, 0));
    const [purchaseReturn] = await PurchaseReturn.create([{ ...input, returnNumber: number('PRET'), total, returnedBy: userId }], { session });
    for (const item of input.items) await createStockMovement({ productId: item.product, variantId: item.variant, delta: -item.quantity, type: 'return_out', referenceType: 'PurchaseReturn', referenceId: String(purchaseReturn._id), performedBy: userId }, session);
    await audit('purchase_return_created', 'PurchaseReturn', String(purchaseReturn._id), userId, { total }, session);
    return purchaseReturn;
  });
}

export async function paySupplier(input: { supplier: string; invoice?: string; amount: number; method: 'cash' | 'card' | 'bank' | 'mobile_payment'; reference?: string; notes?: string }, userId: string) {
  return transaction(async (session) => {
    const supplier = await Supplier.findOne({ _id: input.supplier, isActive: true }).session(session);
    if (!supplier) throw new AppError('Supplier not found', 404);
    if (input.amount <= 0 || input.amount > supplier.balance) throw new AppError('Supplier payment exceeds balance', 400);
    const [payment] = await SupplierPayment.create([{ ...input, paidBy: userId }], { session });
    supplier.balance = money(supplier.balance - input.amount);
    await supplier.save({ session });
    if (input.invoice) {
      const invoice = await PurchaseInvoice.findById(input.invoice).session(session);
      if (!invoice || String(invoice.supplier) !== input.supplier) throw new AppError('Supplier invoice not found', 404);
      invoice.paidAmount = money(invoice.paidAmount + input.amount);
      invoice.status = invoice.paidAmount >= invoice.total ? 'paid' : 'partially_paid';
      await invoice.save({ session });
    }
    await audit('supplier_payment_created', 'SupplierPayment', String(payment._id), userId, { amount: input.amount, supplier: input.supplier }, session);
    return payment;
  });
}

export async function listPurchaseReports() {
  const [supplierBalances, purchaseTotals, receivedTotals] = await Promise.all([
    Supplier.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, totalBalance: { $sum: '$balance' }, supplierCount: { $sum: 1 } } }]),
    PurchaseInvoice.aggregate([{ $match: { status: { $ne: 'cancelled' } } }, { $group: { _id: null, totalInvoiced: { $sum: '$total' }, totalPaid: { $sum: '$paidAmount' } } }]),
    GoodsReceipt.aggregate([{ $group: { _id: null, totalReceived: { $sum: '$total' }, receiptCount: { $sum: 1 } } }]),
  ]);
  return { suppliers: supplierBalances[0] ?? { totalBalance: 0, supplierCount: 0 }, invoices: purchaseTotals[0] ?? { totalInvoiced: 0, totalPaid: 0 }, receipts: receivedTotals[0] ?? { totalReceived: 0, receiptCount: 0 } };
}
