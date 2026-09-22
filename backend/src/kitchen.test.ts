import { createServer, type Server as HttpServer } from 'http';
import request from 'supertest';
import { io as connectSocket, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { initializeSocket, getSocketServer } from './realtime/socket.js';
import { Category } from './models/Category.js';
import { KitchenOrder } from './models/KitchenOrder.js';
import { Permission } from './models/Permission.js';
import { Product } from './models/Product.js';
import { Role } from './models/Role.js';
import { Unit } from './models/Unit.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';

const email = 'kitchen-admin@example.com';
const password = 'P@ssword123!';
let token = '';
let productId = '';
let httpServer: HttpServer;
let port = 0;
let replSet: MongoMemoryReplSet;

function waitForEvent<T>(socket: Socket, event: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Timed out waiting for ${event}`)), 5000);
    socket.once(event, (payload: T) => { clearTimeout(timeout); resolve(payload); });
  });
}

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  const permissions = await Permission.create(['pos.create', 'kitchen.view', 'kitchen.manage'].map((key) => ({ key, description: key })));
  const role = await Role.create({ name: 'Kitchen Admin', code: 'kitchen_admin', permissions: permissions.map((item) => item._id) });
  await User.create({ firstName: 'Kitchen', lastName: 'Admin', email, passwordHash: await hashPassword(password), roles: [role._id], isActive: true });
  const category = await Category.create({ name: 'Kitchen Food', code: 'KITCHEN' });
  const unit = await Unit.create({ name: 'Each', code: 'kitchen_each' });
  const product = await Product.create({ name: 'Kitchen Dish', sku: 'KITCHEN-DISH', category: category._id, unit: unit._id, type: 'retail', sellingPrice: 12, stockQuantity: 5 });
  productId = String(product._id);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  token = login.body.data.accessToken;

  httpServer = createServer(app);
  initializeSocket(httpServer, 'http://localhost:5173');
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', () => resolve()));
  port = (httpServer.address() as { port: number }).port;
});

afterAll(async () => {
  getSocketServer()?.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
  await mongoose.connection.close();
  await replSet.stop();
});

describe('Kitchen display synchronization', () => {
  it('creates a KDS ticket from POS and broadcasts status changes to the kitchen room', async () => {
    const socket = connectSocket(`http://127.0.0.1:${port}`, { auth: { token } });
    await waitForEvent(socket, 'connect');
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Timed out joining kitchen room')), 5000);
      socket.emit('join:kitchen', () => { clearTimeout(timeout); resolve(); });
    });

    const createdEvent = waitForEvent<{ orderNumber: string; status: string }>(socket, 'kitchen:order-created');
    const orderResponse = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${token}`).send({ type: 'take_away', items: [{ product: productId, quantity: 1 }] });
    const created = await createdEvent;
    const kitchenOrder = await KitchenOrder.findOne({ order: orderResponse.body.data._id });

    expect(orderResponse.status).toBe(201);
    expect(kitchenOrder?.status).toBe('new');
    expect(created.orderNumber).toBe(orderResponse.body.data.orderNumber);
    expect(created.status).toBe('new');

    const statusEvent = waitForEvent<{ status: string; orderId: string }>(socket, 'kitchen:status-changed');
    const statusResponse = await request(app).patch(`/api/kitchen/orders/${kitchenOrder!._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'preparing' });
    const changed = await statusEvent;

    expect(statusResponse.status).toBe(200);
    expect(changed.status).toBe('preparing');
    expect(changed.orderId).toBe(orderResponse.body.data._id);
    socket.disconnect();
  });

  it('rejects invalid kitchen status transitions', async () => {
    const order = await KitchenOrder.findOne({});
    const response = await request(app).patch(`/api/kitchen/orders/${order!._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'completed' });
    expect(response.status).toBe(409);
  });
});
