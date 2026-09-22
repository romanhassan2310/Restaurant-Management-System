import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { Modifier } from './models/Modifier.js';
import { Order } from './models/Order.js';
import { Permission } from './models/Permission.js';
import { Product } from './models/Product.js';
import { Receipt } from './models/Receipt.js';
import { Role } from './models/Role.js';
import { RestaurantTable } from './models/RestaurantTable.js';
import { Unit } from './models/Unit.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';

const email = 'pos-admin@example.com';
const password = 'P@ssword123!';
let accessToken = '';
let productId = '';
let modifierId = '';
let customerId = '';
let tableId = '';
let waiterId = '';
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());

  const permissionKeys = ['pos.view', 'pos.create', 'pos.manage', 'pos.void', 'pos.refund', 'payment.create', 'payment.refund', 'shift.manage'];
  const permissions = await Permission.create(permissionKeys.map((key) => ({ key, description: key })));
  const role = await Role.create({ name: 'POS Admin', code: 'pos_admin', permissions: permissions.map((permission) => permission._id) });
  const waiter = await User.create({ firstName: 'Floor', lastName: 'Waiter', email: 'waiter@example.com', passwordHash: await hashPassword(password), roles: [role._id], isActive: true });
  waiterId = String(waiter._id);
  await User.create({ firstName: 'POS', lastName: 'Admin', email, passwordHash: await hashPassword(password), roles: [role._id], isActive: true });

  const category = await Category.create({ name: 'POS Food', code: 'POSFOOD' });
  const unit = await Unit.create({ name: 'Each', code: 'each' });
  const product = await Product.create({ name: 'POS Burger', sku: 'POS-BURGER', category: category._id, unit: unit._id, type: 'prepared', sellingPrice: 20, stockQuantity: 10 });
  productId = String(product._id);
  const modifier = await Modifier.create({ name: 'Extra Cheese', price: 2, product: product._id });
  modifierId = String(modifier._id);
  const customer = await Customer.create({ name: 'POS Customer', phone: '555-0001' });
  customerId = String(customer._id);
  const table = await RestaurantTable.create({ name: 'T1', capacity: 4 });
  tableId = String(table._id);

  const login = await request(app).post('/api/auth/login').send({ email, password });
  accessToken = login.body.data.accessToken;
  await request(app).post('/api/shifts/start').set('Authorization', `Bearer ${accessToken}`).send({ openingCash: 100 });
});

afterAll(async () => {
  await mongoose.connection.close();
  await replSet.stop();
});

describe('POS and order management', () => {
  it('creates an order with backend totals and deducts stock transactionally', async () => {
    const response = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        type: 'dine_in', customer: customerId, table: tableId, waiter: waiterId,
        items: [{ product: productId, quantity: 2, modifiers: [modifierId], notes: 'No onions' }],
        discountType: 'percentage', discountValue: 10, taxRate: 5, serviceChargeRate: 10,
      });

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe('open');
    expect(response.body.data.subtotal).toBe(44);
    expect(response.body.data.total).toBe(45.54);
    expect((await Product.findById(productId))?.stockQuantity).toBe(8);
  });

  it('pays an order, creates receipt history, and restores stock on refund', async () => {
    const order = await Order.findOne({ status: 'open' });
    expect(order).toBeTruthy();
    const paid = await request(app).post(`/api/pos/orders/${order!._id}/pay`).set('Authorization', `Bearer ${accessToken}`);
    const refunded = await request(app).post(`/api/pos/orders/${order!._id}/refund`).set('Authorization', `Bearer ${accessToken}`).send({ reason: 'Customer returned order' });

    expect(paid.status).toBe(200);
    expect(paid.body.data.receipt.receiptNumber).toBeTruthy();
    expect(refunded.status).toBe(200);
    expect(refunded.body.data.status).toBe('refunded');
    expect(await Receipt.countDocuments({ order: order!._id })).toBe(1);
    expect((await Product.findById(productId))?.stockQuantity).toBe(10);
  });

  it('edits an open order while preserving transactional stock', async () => {
    const created = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${accessToken}`).send({ type: 'take_away', items: [{ product: productId, quantity: 1 }] });
    expect(created.status).toBe(201);
    expect((await Product.findById(productId))?.stockQuantity).toBe(9);

    const edited = await request(app).patch(`/api/pos/orders/${created.body.data._id}`).set('Authorization', `Bearer ${accessToken}`).send({ type: 'take_away', items: [{ product: productId, quantity: 2 }] });
    expect(edited.status).toBe(200);
    expect(edited.body.data.items[0].quantity).toBe(2);
    expect((await Product.findById(productId))?.stockQuantity).toBe(8);

    await request(app).post(`/api/pos/orders/${created.body.data._id}/void`).set('Authorization', `Bearer ${accessToken}`).send({ reason: 'Test cleanup' });
    expect((await Product.findById(productId))?.stockQuantity).toBe(10);
  });

  it('holds without deduction, resumes with deduction, and voids with restoration', async () => {
    const held = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${accessToken}`).send({ type: 'take_away', items: [{ product: productId, quantity: 1 }], hold: true });
    expect(held.status).toBe(201);
    expect((await Product.findById(productId))?.stockQuantity).toBe(10);

    const resumed = await request(app).post(`/api/pos/orders/${held.body.data._id}/resume`).set('Authorization', `Bearer ${accessToken}`);
    expect(resumed.status).toBe(200);
    expect((await Product.findById(productId))?.stockQuantity).toBe(9);

    const voided = await request(app).post(`/api/pos/orders/${held.body.data._id}/void`).set('Authorization', `Bearer ${accessToken}`).send({ reason: 'Customer cancelled' });
    expect(voided.status).toBe(200);
    expect(voided.body.data.status).toBe('voided');
    expect((await Product.findById(productId))?.stockQuantity).toBe(10);
  });

  it('rejects invalid financial values and unauthenticated access', async () => {
    const invalid = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${accessToken}`).send({ type: 'take_away', items: [{ product: productId, quantity: 1 }], discountType: 'fixed', discountValue: 999 });
    const unauthenticated = await request(app).get('/api/pos/orders');

    expect(invalid.status).toBe(400);
    expect(unauthenticated.status).toBe(401);
  });
});
