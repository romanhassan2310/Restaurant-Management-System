import mongoose, { type ClientSession, type Types } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { Customer } from '../models/Customer.js';
import { Modifier } from '../models/Modifier.js';
import { Order, type IOrder, type IOrderItem, type OrderType } from '../models/Order.js';
import { Product } from '../models/Product.js';
import { ProductVariant } from '../models/ProductVariant.js';
import { Receipt } from '../models/Receipt.js';
import { RestaurantTable } from '../models/RestaurantTable.js';
import { KitchenOrder } from '../models/KitchenOrder.js';
import { User } from '../models/User.js';
import { recordSale, restoreSale } from './inventoryService.js';
import { createKitchenOrder, publishKitchenOrder, updateKitchenStatus } from './kitchenService.js';
import { emitTableUpdated } from '../realtime/socket.js';

export interface OrderItemInput {
  product: string;
  variant?: string;
  quantity: number;
  modifiers?: string[];
  notes?: string;
}

export interface OrderInput {
  type: OrderType;
  source?: 'pos' | 'qr' | 'waiter';
  items: OrderItemInput[];
  customer?: string;
  table?: string;
  waiter?: string;
  guestCount?: number;
  notes?: string;
  discountType?: 'fixed' | 'percentage';
  discountValue?: number;
  taxRate?: number;
  serviceChargeRate?: number;
  hold?: boolean;
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function assertRate(value: number, field: string, maximum = 100): void {
  if (!Number.isFinite(value) || value < 0 || value > maximum) {
    throw new AppError(`${field} must be between 0 and ${maximum}`, 400);
  }
}

async function withTransaction<T>(callback: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    let result!: T;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
}

function generateOrderNumber(): string {
  return `ORD-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

function generateReceiptNumber(): string {
  return `RCT-${Date.now()}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
}

async function buildOrderData(input: OrderInput, userId: string | undefined, session: ClientSession) {
  if (!input.items.length) throw new AppError('Order requires at least one item', 400);
  if (input.type === 'dine_in' && !input.table) throw new AppError('Dine-in orders require a table', 400);

  if (input.customer && !(await Customer.exists({ _id: input.customer, isActive: true }).session(session))) {
    throw new AppError('Customer not found', 404);
  }
  if (input.table && !(await RestaurantTable.exists({ _id: input.table, isActive: true }).session(session))) {
    throw new AppError('Table not found', 404);
  }
  if (input.table) {
    const table = await RestaurantTable.findById(input.table).session(session);
    if (!table) throw new AppError('Table not found', 404);
    if (input.guestCount && input.guestCount > table.capacity) throw new AppError('Guest count exceeds table capacity', 400);
    if (table.status === 'occupied' && table.currentOrder && input.type === 'dine_in' && input.source !== 'qr') throw new AppError('Table is already occupied', 409);
  }
  if (input.waiter && !(await User.exists({ _id: input.waiter, isActive: true }).session(session))) {
    throw new AppError('Waiter not found', 404);
  }

  const items: IOrderItem[] = [];
  for (const item of input.items) {
    if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new AppError('Item quantity must be greater than zero', 400);
    const product = await Product.findOne({ _id: item.product, isActive: true }).session(session);
    if (!product) throw new AppError('Product not found', 404);

    let variant;
    if (item.variant) {
      variant = await ProductVariant.findOne({ _id: item.variant, product: item.product, isActive: true }).session(session);
      if (!variant) throw new AppError('Product variant not found', 404);
    }

    const modifiers = item.modifiers?.length
      ? await Modifier.find({ _id: { $in: item.modifiers }, isActive: true }).session(session)
      : [];
    if (modifiers.length !== (item.modifiers?.length ?? 0)) throw new AppError('One or more modifiers are invalid', 400);

    const unitPrice = variant?.sellingPrice ?? product.sellingPrice;
    const modifierTotal = modifiers.reduce((total, modifier) => total + modifier.price, 0);
    const lineTotal = roundCurrency(item.quantity * (unitPrice + modifierTotal));
    items.push({
      product: product._id,
      variant: variant?._id,
      name: variant ? `${product.name} - ${variant.name}` : product.name,
      sku: variant?.sku ?? product.sku,
      quantity: item.quantity,
      unitPrice,
      modifiers: modifiers.map((modifier) => ({ modifier: modifier._id, name: modifier.name, price: modifier.price })),
      notes: item.notes,
      lineTotal,
    });
  }

  const subtotal = roundCurrency(items.reduce((total, item) => total + item.lineTotal, 0));
  const discountValue = input.discountValue ?? 0;
  const discountType = input.discountType;
  if (discountValue < 0) throw new AppError('Discount cannot be negative', 400);
  if (discountType === 'percentage') assertRate(discountValue, 'Discount percentage');
  if (discountType === 'fixed' && discountValue > subtotal) throw new AppError('Discount cannot exceed subtotal', 400);
  const discountTotal = roundCurrency(discountType === 'percentage' ? subtotal * discountValue / 100 : discountValue);
  const taxableAmount = roundCurrency(subtotal - discountTotal);
  const taxRate = input.taxRate ?? 0;
  const serviceChargeRate = input.serviceChargeRate ?? 0;
  assertRate(taxRate, 'Tax rate');
  assertRate(serviceChargeRate, 'Service charge rate');
  const taxTotal = roundCurrency(taxableAmount * taxRate / 100);
  const serviceChargeTotal = roundCurrency(taxableAmount * serviceChargeRate / 100);

  return {
    orderNumber: generateOrderNumber(),
    type: input.type,
    source: input.source ?? 'pos',
    status: input.hold ? 'held' as const : 'open' as const,
    paymentStatus: 'unpaid' as const,
    items,
    customer: input.customer,
    table: input.table,
    waiter: input.waiter,
    guestCount: input.guestCount ?? (input.type === 'dine_in' ? 1 : undefined),
    notes: input.notes,
    discountType,
    discountValue,
    taxRate,
    serviceChargeRate,
    subtotal,
    discountTotal,
    taxTotal,
    serviceChargeTotal,
    total: roundCurrency(taxableAmount + taxTotal + serviceChargeTotal),
    createdBy: userId,
  };
}

async function consumeOrderItems(order: Pick<IOrder, 'items'>, userId: string | undefined, session: ClientSession) {
  for (const item of order.items) {
    await recordSale(String(item.product), item.quantity, userId, item.variant ? String(item.variant) : undefined, session);
  }
}

async function restoreOrderItems(order: Pick<IOrder, 'items'>, userId: string | undefined, session: ClientSession) {
  for (const item of order.items) {
    await restoreSale(String(item.product), item.quantity, userId, item.variant ? String(item.variant) : undefined, session);
  }
}

export async function createOrder(input: OrderInput, userId?: string) {
  const order = await withTransaction(async (session) => {
    const data = await buildOrderData(input, userId, session);
    const [order] = await Order.create([data], { session });
    if (!input.hold) await consumeOrderItems(order, userId, session);
    if (!input.hold) await createKitchenOrder(String(order._id), session);
    if (data.table) {
      await RestaurantTable.findByIdAndUpdate(data.table, { status: 'occupied', guestCount: data.guestCount ?? 0, assignedWaiter: data.waiter, currentOrder: order._id }, { new: true, session });
    }
    return order;
  });
  if (order.table) {
    const table = await RestaurantTable.findById(order.table);
    if (table) emitTableUpdated(table);
  }
  if (!input.hold) await publishKitchenOrder(String(order._id));
  return order;
}

export async function updateOrder(orderId: string, input: OrderInput, userId?: string) {
  return withTransaction(async (session) => {
    const existing = await Order.findOne({ _id: orderId, status: { $in: ['held', 'open'] } }).session(session);
    if (!existing) throw new AppError('Only held or open orders can be edited', 409);
    const wasOpen = existing.status === 'open';
    if (wasOpen) await restoreOrderItems(existing, userId, session);
    const data = await buildOrderData({ ...input, hold: !wasOpen }, userId, session);
    Object.assign(existing, data, { orderNumber: existing.orderNumber });
    await existing.save({ session });
    if (wasOpen) await consumeOrderItems(existing, userId, session);
    return existing;
  });
}

export async function resumeOrder(orderId: string, userId?: string) {
  const order = await withTransaction(async (session) => {
    const order = await Order.findOne({ _id: orderId, status: 'held' }).session(session);
    if (!order) throw new AppError('Held order not found', 404);
    await consumeOrderItems(order, userId, session);
    await createKitchenOrder(String(order._id), session);
    order.status = 'open';
    await order.save({ session });
    return order;
  });
  await publishKitchenOrder(String(order._id));
  return order;
}

export async function completeOrder(orderId: string, userId?: string) {
  return withTransaction(async (session) => {
    const order = await Order.findOne({ _id: orderId, status: 'open' }).session(session);
    if (!order) throw new AppError('Open order not found', 404);
    order.status = 'completed';
    order.paymentStatus = 'paid';
    await order.save({ session });
    const [receipt] = await Receipt.create([{ receiptNumber: generateReceiptNumber(), order: order._id, total: order.total, issuedBy: userId }], { session });
    return { order, receipt };
  });
}

export async function voidOrder(orderId: string, reason: string, userId?: string) {
  const order = await withTransaction(async (session) => {
    const order = await Order.findOne({ _id: orderId, status: 'open' }).session(session);
    if (!order) throw new AppError('Only open orders can be voided', 409);
    await restoreOrderItems(order, userId, session);
    order.status = 'voided';
    order.voidReason = reason;
    await order.save({ session });
    return order;
  });
  const kitchenOrder = await KitchenOrder.findOne({ order: order._id });
  if (kitchenOrder && !['completed', 'cancelled'].includes(kitchenOrder.status)) await updateKitchenStatus(String(kitchenOrder._id), 'cancelled', userId ?? String(order.createdBy));
  return order;
}

export async function refundOrder(orderId: string, reason: string, userId?: string) {
  return withTransaction(async (session) => {
    const order = await Order.findOne({ _id: orderId, status: 'completed' }).session(session);
    if (!order) throw new AppError('Only completed orders can be refunded', 409);
    await restoreOrderItems(order, userId, session);
    order.status = 'refunded';
    order.paymentStatus = 'refunded';
    order.refundReason = reason;
    await order.save({ session });
    return order;
  });
}

export async function getOrder(orderId: string) {
  const order = await Order.findById(orderId).populate('customer table waiter').lean();
  if (!order) throw new AppError('Order not found', 404);
  return order;
}

export async function listOrders(filters: { status?: string; type?: string; search?: string }) {
  const query: Record<string, unknown> = {};
  if (filters.status) query.status = filters.status;
  if (filters.type) query.type = filters.type;
  if (filters.search) query.orderNumber = { $regex: filters.search, $options: 'i' };
  return Order.find(query).populate('customer table waiter').sort({ createdAt: -1 }).limit(100).lean();
}

export async function listReceipts() {
  return Receipt.find({}).populate('order').sort({ issuedAt: -1 }).limit(100).lean();
}

export async function listCustomers(search?: string) {
  return Customer.find(search ? { $text: { $search: search }, isActive: true } : { isActive: true }).sort({ name: 1 }).limit(100).lean();
}

export async function listTables() {
  return RestaurantTable.find({ isActive: true }).sort({ name: 1 }).lean();
}

export async function listProductsForPos(search?: string, category?: string) {
  const query: Record<string, unknown> = { isActive: true };
  if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { sku: { $regex: search, $options: 'i' } }, { barcode: search }];
  if (category) query.category = category;
  return Product.find(query).populate('category').sort({ name: 1 }).limit(100).lean();
}
