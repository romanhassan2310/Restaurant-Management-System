import request from 'supertest';
import { createServer, type Server as HttpServer } from 'http';
import { io as connectSocket, type Socket } from 'socket.io-client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { Floor } from './models/Floor.js';
import { Permission } from './models/Permission.js';
import { Product } from './models/Product.js';
import { Role } from './models/Role.js';
import { RestaurantTable } from './models/RestaurantTable.js';
import { Unit } from './models/Unit.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';
import { initializeSocket, getSocketServer } from './realtime/socket.js';

const email = 'table-admin@example.com';
const password = 'P@ssword123!';
let token = '';
let floorId = '';
let tableA = '';
let tableB = '';
let tableC = '';
let customerId = '';
let productId = '';
let replSet: MongoMemoryReplSet;
let httpServer: HttpServer;
let socketPort = 0;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  const permissions = await Permission.create(['table.view', 'table.manage', 'table.assign', 'reservation.view', 'reservation.manage', 'pos.view', 'pos.create'].map((key) => ({ key, description: key })));
  const role = await Role.create({ name: 'Table Admin', code: 'table_admin', permissions: permissions.map((item) => item._id) });
  const user = await User.create({ firstName: 'Table', lastName: 'Admin', email, passwordHash: await hashPassword(password), roles: [role._id], isActive: true });
  const waiter = await User.create({ firstName: 'Floor', lastName: 'Waiter', email: 'floor-waiter@example.com', passwordHash: await hashPassword(password), roles: [role._id], isActive: true });
  const customer = await Customer.create({ name: 'Walk-in Guest' });
  customerId = String(customer._id);
  const floor = await Floor.create({ name: 'Main Floor', code: 'MAIN' });
  floorId = String(floor._id);
  const tableOne = await RestaurantTable.create({ name: 'A1', capacity: 4, floor: floor._id });
  const tableTwo = await RestaurantTable.create({ name: 'A2', capacity: 4, floor: floor._id });
  const tableThree = await RestaurantTable.create({ name: 'A3', capacity: 4, floor: floor._id });
  tableA = String(tableOne._id); tableB = String(tableTwo._id); tableC = String(tableThree._id);
  const category = await Category.create({ name: 'Table Food', code: 'TABLEFOOD' });
  const unit = await Unit.create({ name: 'Each', code: 'table_each' });
  const product = await Product.create({ name: 'Table Meal', sku: 'TABLE-MEAL', category: category._id, unit: unit._id, type: 'retail', sellingPrice: 10, stockQuantity: 10 });
  productId = String(product._id);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  token = login.body.data.accessToken;
  void user; void waiter;
  httpServer = createServer(app);
  initializeSocket(httpServer, 'http://localhost:5173');
  await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', () => resolve()));
  socketPort = (httpServer.address() as { port: number }).port;
});

afterAll(async () => { getSocketServer()?.close(); await new Promise<void>((resolve) => httpServer.close(() => resolve())); await mongoose.connection.close(); await replSet.stop(); });

describe('Table, waiter, and reservation management', () => {
  it('assigns a table and creates a walk-in reservation', async () => {
    const waiter = await User.findOne({ email: 'floor-waiter@example.com' });
    const assigned = await request(app).post(`/api/tables/${tableA}/assign`).set('Authorization', `Bearer ${token}`).send({ waiterId: String(waiter!._id), guestCount: 3 });
    const reservation = await request(app).post('/api/tables/reservations').set('Authorization', `Bearer ${token}`).send({ customer: customerId, date: '2026-09-24T00:00:00.000Z', time: '19:00', guestCount: 2, table: tableB });
    expect(assigned.status).toBe(200);
    expect(assigned.body.data.status).toBe('occupied');
    expect(reservation.status).toBe(201);
  });

  it('rejects reservation conflicts and supports transfer and merge', async () => {
    const conflict = await request(app).post('/api/tables/reservations').set('Authorization', `Bearer ${token}`).send({ customer: customerId, date: '2026-09-24T00:00:00.000Z', time: '19:00', guestCount: 2, table: tableB });
    const order = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${token}`).send({ type: 'dine_in', table: tableA, guestCount: 2, items: [{ product: productId, quantity: 1 }] });
    const transfer = await request(app).post(`/api/tables/${tableA}/transfer`).set('Authorization', `Bearer ${token}`).send({ toTableId: tableC });
    const merge = await request(app).post('/api/tables/merge').set('Authorization', `Bearer ${token}`).send({ tableIds: [tableA, tableC] });
    expect(conflict.status).toBe(409);
    expect(order.status).toBe(201);
    expect(transfer.status).toBe(200);
    expect(merge.status).toBe(200);
  });

  it('creates dine-in orders with guest counts and table assignment', async () => {
    const order = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${token}`).send({ type: 'dine_in', table: tableA, guestCount: 2, items: [{ product: productId, quantity: 1 }] });
    expect(order.status).toBe(201);
    const table = await RestaurantTable.findById(tableA);
    expect(table?.status).toBe('occupied');
    expect(table?.guestCount).toBe(2);
    expect(String(table?.currentOrder)).toBe(order.body.data._id);
  });

  it('broadcasts table changes to connected floor clients', async () => {
    const socket: Socket = connectSocket(`http://127.0.0.1:${socketPort}`, { auth: { token } });
    await new Promise<void>((resolve) => socket.once('connect', () => resolve()));
    const event = new Promise<{ tableId: string; status: string }>((resolve) => socket.once('table:updated', resolve));
    const response = await request(app).patch(`/api/tables/${tableB}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'cleaning' });
    const updated = await event;
    expect(response.status).toBe(200);
    expect(updated.tableId).toBe(tableB);
    expect(updated.status).toBe('cleaning');
    socket.disconnect();
  });
});
