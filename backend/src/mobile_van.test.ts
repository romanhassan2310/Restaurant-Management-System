import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { User } from './models/User.js';
import { Product } from './models/Product.js';
import { Category } from './models/Category.js';
import { Unit } from './models/Unit.js';
import { Customer } from './models/Customer.js';
import { Van } from './models/Van.js';
import { VanInventory } from './models/VanInventory.js';
import { VanSession } from './models/VanSession.js';
import { Order } from './models/Order.js';
import { StockMovement } from './models/StockMovement.js';
import { hashPassword } from './utils/password.js';

const email = 'mobilevan-admin@example.com';
const password = 'P@ssword123!';
let accessToken = '';
let replSet: MongoMemoryReplSet;

let productId = '';
let customerId = '';
let vanId = '';
let sessionId = '';

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());

  await User.create({
    firstName: 'Van',
    lastName: 'Agent',
    email,
    passwordHash: await hashPassword(password),
    isActive: true,
  });

  const login = await request(app).post('/api/auth/login').send({ email, password });
  accessToken = login.body.data.accessToken;

  const category = await Category.create({ name: 'Van Products', code: 'VANPROD' });
  const unit = await Unit.create({ name: 'Box', code: 'box' });
  const product = await Product.create({
    name: 'Van Cold Juice',
    sku: 'VAN-JUICE-01',
    category: category._id,
    unit: unit._id,
    type: 'prepared',
    sellingPrice: 15,
    stockQuantity: 100,
  });
  productId = String(product._id);

  const customer = await Customer.create({ name: 'Van Customer 1', phone: '01700000000' });
  customerId = String(customer._id);
});

afterAll(async () => {
  await mongoose.connection.close();
  await replSet.stop();
});

describe('Mobile / Van Sales Management System', () => {
  it('creates and lists fleet vans', async () => {
    const res = await request(app)
      .post('/api/mobile-van/vans')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        vanNumber: 'VAN-101',
        plateNumber: 'DHAKA-METRO-11-2233',
        modelName: 'Toyota HiAce Delivery',
        capacity: 500,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.vanNumber).toBe('VAN-101');
    vanId = String(res.body.data._id);

    const listRes = await request(app).get('/api/mobile-van/vans').set('Authorization', `Bearer ${accessToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.length).toBeGreaterThan(0);
  });

  it('starts a van sales shift session', async () => {
    const res = await request(app)
      .post('/api/mobile-van/sessions/start')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        van: vanId,
        startOdometer: 12500,
        startingCash: 500,
        notes: 'Morning shift start',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('active');
    sessionId = String(res.body.data._id);

    const activeRes = await request(app).get('/api/mobile-van/sessions/active').set('Authorization', `Bearer ${accessToken}`);
    expect(activeRes.status).toBe(200);
    expect(activeRes.body.data._id).toBe(sessionId);
  });

  it('transfers stock from main warehouse to van', async () => {
    const res = await request(app)
      .post('/api/mobile-van/inventory/transfer')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        van: vanId,
        product: productId,
        quantity: 30,
        notes: 'Loading 30 juice boxes to VAN-101',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.quantity).toBe(30);

    const mainProd = await Product.findById(productId);
    expect(mainProd?.stockQuantity).toBe(70);

    const vanInv = await VanInventory.findOne({ van: vanId, product: productId });
    expect(vanInv?.quantity).toBe(30);

    const movements = await StockMovement.find({ product: productId });
    expect(movements.length).toBe(2);
  });

  it('creates mobile van POS order and updates van inventory stock', async () => {
    const res = await request(app)
      .post('/api/mobile-van/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        vanId,
        sessionId,
        customer: customerId,
        items: [{ product: productId, quantity: 5, unitPrice: 15 }],
        discountType: 'fixed',
        discountValue: 5,
        taxRate: 5,
        payments: [{ method: 'cash', amount: 73.5 }],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.order.type).toBe('mobile_van');
    expect(res.body.data.order.total).toBe(73.5);

    const vanInv = await VanInventory.findOne({ van: vanId, product: productId });
    expect(vanInv?.quantity).toBe(25);

    const session = await VanSession.findById(sessionId);
    expect(session?.totalSales).toBe(73.5);
    expect(session?.totalOrdersCount).toBe(1);
  });

  it('syncs offline-created orders batch seamlessly', async () => {
    const offlineOrderData = {
      offlineId: 'OFFLINE-TEST-999',
      vanId,
      sessionId,
      customer: customerId,
      items: [{ product: productId, quantity: 2, unitPrice: 15 }],
      payments: [{ method: 'cash', amount: 30 }],
    };

    const res = await request(app)
      .post('/api/mobile-van/sync-offline-orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ orders: [offlineOrderData] });

    expect(res.status).toBe(200);
    expect(res.body.data.syncedCount).toBe(1);
    expect(res.body.data.results[0].success).toBe(true);

    const vanInv = await VanInventory.findOne({ van: vanId, product: productId });
    expect(vanInv?.quantity).toBe(23);
  });

  it('closes daily mobile sales session and generates summary report', async () => {
    const res = await request(app)
      .post(`/api/mobile-van/sessions/${sessionId}/close`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        endOdometer: 12580,
        endingCashCollected: 603.5, // 500 start + 73.5 + 30 = 603.5
        notes: 'End of day closing, zero variance',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('closed');
    expect(res.body.data.cashVariance).toBe(0);

    const summaryRes = await request(app).get(`/api/mobile-van/summary/${sessionId}`).set('Authorization', `Bearer ${accessToken}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.ordersCount).toBe(2);
    expect(summaryRes.body.data.paymentBreakdown.cash).toBe(103.5);
  });
});
