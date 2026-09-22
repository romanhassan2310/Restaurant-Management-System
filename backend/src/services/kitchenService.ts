import mongoose, { type ClientSession } from 'mongoose';
import { AppError } from '../middleware/errorHandler.js';
import { AuditLog } from '../models/AuditLog.js';
import { KitchenOrder, type IKitchenOrder, type KitchenOrderStatus } from '../models/KitchenOrder.js';
import { Order } from '../models/Order.js';
import { emitKitchenOrderCreated, emitKitchenStatusChanged } from '../realtime/socket.js';

const transitions: Record<KitchenOrderStatus, KitchenOrderStatus[]> = {
  new: ['pending', 'preparing', 'cancelled'],
  pending: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['served', 'cancelled'],
  served: ['completed'],
  completed: [],
  cancelled: [],
};

export async function createKitchenOrder(orderId: string, session?: ClientSession) {
  const order = await Order.findById(orderId).session(session ?? null);
  if (!order) throw new AppError('Order not found', 404);
  const existing = await KitchenOrder.findOne({ order: order._id }).session(session ?? null);
  if (existing) return existing;
  const [kitchenOrder] = await KitchenOrder.create([{
    order: order._id,
    orderNumber: order.orderNumber,
    orderType: order.type,
    status: 'new',
    priority: 50,
    items: order.items.map((item) => ({
      product: item.product,
      variant: item.variant,
      name: item.name,
      quantity: item.quantity,
      modifiers: item.modifiers.map((modifier) => modifier.name),
      notes: item.notes,
    })),
    customer: order.customer,
    table: order.table,
    waiter: order.waiter,
  }], { session });
  if (!session) emitKitchenOrderCreated(kitchenOrder);
  return kitchenOrder;
}

export async function publishKitchenOrder(kitchenOrderId: string) {
  const kitchenOrder = await KitchenOrder.findOne({ $or: [{ _id: kitchenOrderId }, { order: kitchenOrderId }] }).populate('order customer table waiter').lean();
  if (kitchenOrder) emitKitchenOrderCreated(kitchenOrder);
  return kitchenOrder;
}

export async function listKitchenOrders(status?: KitchenOrderStatus) {
  const query = status ? { status } : {};
  return KitchenOrder.find(query).populate('order customer table waiter').sort({ priority: -1, receivedAt: 1 }).lean();
}

export async function getKitchenOrder(id: string) {
  const order = await KitchenOrder.findById(id).populate('order customer table waiter').lean();
  if (!order) throw new AppError('Kitchen order not found', 404);
  return order;
}

export async function updateKitchenStatus(id: string, status: KitchenOrderStatus, userId: string, priority?: number) {
  const session = await mongoose.startSession();
  try {
    let result!: IKitchenOrder;
    await session.withTransaction(async () => {
      const order = await KitchenOrder.findById(id).session(session);
      if (!order) throw new AppError('Kitchen order not found', 404);
      if (order.status !== status && !transitions[order.status].includes(status)) {
        throw new AppError(`Cannot move kitchen order from ${order.status} to ${status}`, 409);
      }
      const now = new Date();
      if (status === 'preparing' && !order.startedAt) order.startedAt = now;
      if (status === 'ready') {
        order.readyAt = now;
        order.preparationSeconds = Math.max(0, Math.floor((now.getTime() - order.receivedAt.getTime()) / 1000));
      }
      if (status === 'completed') order.completedAt = now;
      if (status === 'cancelled') order.cancelledAt = now;
      order.status = status;
      if (priority !== undefined) {
        if (!Number.isInteger(priority) || priority < 0 || priority > 100) throw new AppError('Priority must be between 0 and 100', 400);
        order.priority = priority;
      }
      await order.save({ session });
      await AuditLog.create([{
        user: userId,
        action: 'kitchen_status_changed',
        module: 'kitchen',
        entity: 'KitchenOrder',
        entityId: String(order._id),
        after: { status, priority: order.priority },
      }], { session });
      result = order;
    });
    const published = await KitchenOrder.findById(result._id).populate('order customer table waiter').lean();
    if (published) emitKitchenStatusChanged(published);
    return published;
  } finally {
    await session.endSession();
  }
}

export async function setKitchenPriority(id: string, priority: number, userId: string) {
  const order = await KitchenOrder.findById(id);
  if (!order) throw new AppError('Kitchen order not found', 404);
  return updateKitchenStatus(id, order.status, userId, priority);
}
