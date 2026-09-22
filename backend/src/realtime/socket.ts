import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.js';

let io: Server | undefined;

export function initializeSocket(httpServer: HttpServer, clientUrl: string): Server {
  io = new Server(httpServer, {
    cors: { origin: clientUrl, credentials: true },
  });

  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      if (token) socket.data.user = verifyAccessToken(token);
      else if (!socket.handshake.auth?.qrToken) return next(new Error('Authentication required'));
      socket.data.qrToken = socket.handshake.auth?.qrToken;
      next();
    } catch (error) {
      next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.user.sub}`);
    socket.on('join:kitchen', (ack?: () => void) => { socket.join('kitchen'); ack?.(); });
    socket.on('join:order', (orderId: string, ack?: () => void) => { socket.join(`order:${orderId}`); ack?.(); });
    socket.on('join:waiter', (waiterId: string, ack?: () => void) => { socket.join(`waiter:${waiterId}`); ack?.(); });
    socket.on('join:customer', (customerId: string, ack?: () => void) => { socket.join(`customer:${customerId}`); ack?.(); });
    socket.on('join:qr-order', async (orderId: string, qrToken: string, ack?: (error?: string) => void) => {
      try {
        const { getQrOrderStatus } = await import('../services/qrService.js');
        await getQrOrderStatus(qrToken, orderId);
        socket.join(`qr-order:${orderId}`);
        ack?.();
      } catch (error) {
        ack?.(error instanceof Error ? error.message : 'QR order access denied');
      }
    });
  });

  return io;
}

export function getSocketServer(): Server | undefined {
  return io;
}

export function emitKitchenOrderCreated(order: { _id: unknown; order?: unknown; waiter?: unknown; customer?: unknown }) {
  if (!io) return;
  const sourceOrder = order.order && typeof order.order === 'object' && '_id' in order.order ? (order.order as { _id: unknown })._id : order.order;
  const customerId = order.customer && typeof order.customer === 'object' && '_id' in order.customer ? (order.customer as { _id: unknown })._id : order.customer;
  const waiterId = order.waiter && typeof order.waiter === 'object' && '_id' in order.waiter ? (order.waiter as { _id: unknown })._id : order.waiter;
  const orderId = String(sourceOrder ?? order._id);
  io.to('kitchen').emit('kitchen:order-created', order);
  io.to(`order:${orderId}`).emit('kitchen:order-created', order);
  io.to(`qr-order:${orderId}`).emit('kitchen:order-created', order);
  if (waiterId) io.to(`waiter:${String(waiterId)}`).emit('kitchen:order-created', order);
  if (customerId) io.to(`customer:${String(customerId)}`).emit('kitchen:order-created', order);
}

export function emitKitchenStatusChanged(order: { _id: unknown; order?: unknown; waiter?: unknown; customer?: unknown; status?: string }) {
  if (!io) return;
  const sourceOrder = order.order && typeof order.order === 'object' && '_id' in order.order
    ? (order.order as { _id: unknown })._id
    : order.order;
  const orderId = String(sourceOrder ?? order._id);
  const event = { ...order, orderId };
  io.to('kitchen').emit('kitchen:status-changed', event);
  io.to(`order:${orderId}`).emit('kitchen:status-changed', event);
  io.to(`qr-order:${orderId}`).emit('kitchen:status-changed', event);
  const waiterId = order.waiter && typeof order.waiter === 'object' && '_id' in order.waiter ? (order.waiter as { _id: unknown })._id : order.waiter;
  const customerId = order.customer && typeof order.customer === 'object' && '_id' in order.customer ? (order.customer as { _id: unknown })._id : order.customer;
  if (waiterId) io.to(`waiter:${String(waiterId)}`).emit('kitchen:status-changed', event);
  if (customerId) io.to(`customer:${String(customerId)}`).emit('kitchen:status-changed', event);
}

export function emitTableUpdated(table: { _id: unknown; assignedWaiter?: unknown; currentOrder?: unknown }) {
  if (!io) return;
  const source = typeof (table as { toObject?: () => Record<string, unknown> }).toObject === 'function'
    ? (table as unknown as { toObject: () => Record<string, unknown> }).toObject()
    : table;
  const event = { ...source, tableId: String(table._id) };
  io.emit('table:updated', event);
  if (table.assignedWaiter) io.to(`waiter:${String(table.assignedWaiter)}`).emit('table:updated', event);
  if (table.currentOrder) io.to(`order:${String(table.currentOrder)}`).emit('table:updated', event);
}
