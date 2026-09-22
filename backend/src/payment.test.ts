import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { Category } from './models/Category.js';
import { Invoice } from './models/Invoice.js';
import { Order } from './models/Order.js';
import { Payment } from './models/Payment.js';
import { PaymentAudit } from './models/PaymentAudit.js';
import { Permission } from './models/Permission.js';
import { Product } from './models/Product.js';
import { Receipt } from './models/Receipt.js';
import { Role } from './models/Role.js';
import { Shift } from './models/Shift.js';
import { Unit } from './models/Unit.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';

const email = 'finance-admin@example.com';
const password = 'P@ssword123!';
let token = '';
let productId = '';
let orderId = '';
let shiftId = '';
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  const keys = ['pos.view', 'pos.create', 'payment.view', 'payment.create', 'payment.refund', 'receipt.view', 'receipt.print', 'receipt.manage', 'invoice.view', 'shift.view', 'shift.manage', 'shift.close'];
  const permissions = await Permission.create(keys.map((key) => ({ key, description: key })));
  const role = await Role.create({ name: 'Finance Admin', code: 'finance_admin', permissions: permissions.map((item) => item._id) });
  await User.create({ firstName: 'Finance', lastName: 'Admin', email, passwordHash: await hashPassword(password), roles: [role._id], isActive: true });
  const category = await Category.create({ name: 'Finance Food', code: 'FINFOOD' });
  const unit = await Unit.create({ name: 'Piece', code: 'pc' });
  const product = await Product.create({ name: 'Finance Meal', sku: 'FIN-MEAL', category: category._id, unit: unit._id, type: 'retail', sellingPrice: 100, stockQuantity: 10 });
  productId = String(product._id);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  token = login.body.data.accessToken;
  const shift = await request(app).post('/api/shifts/start').set('Authorization', `Bearer ${token}`).send({ openingCash: 50 });
  shiftId = shift.body.data._id;
  const order = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${token}`).send({ type: 'take_away', items: [{ product: productId, quantity: 1 }] });
  orderId = order.body.data._id;
});

afterAll(async () => {
  await mongoose.connection.close();
  await replSet.stop();
});

describe('Payments, receipts, invoices, and shifts', () => {
  it('supports mixed partial payment and calculates expected cash correctly', async () => {
    const response = await request(app).post(`/api/payments/orders/${orderId}/payments`).set('Authorization', `Bearer ${token}`).send({ payments: [{ method: 'cash', amount: 40 }, { method: 'card', amount: 30 }] });
    const current = await request(app).get('/api/shifts/current').set('Authorization', `Bearer ${token}`);
    const order = await Order.findById(orderId);

    expect(response.status).toBe(200);
    expect(response.body.data.paid).toBe(70);
    expect(response.body.data.due).toBe(30);
    expect(order?.paymentStatus).toBe('partially_paid');
    expect(current.body.data.expectedCash).toBe(90);
    expect(await Payment.countDocuments({ order: orderId })).toBe(2);
  });

  it('completes payment and issues a receipt and invoice', async () => {
    const response = await request(app).post(`/api/payments/orders/${orderId}/payments`).set('Authorization', `Bearer ${token}`).send({ payments: [{ method: 'qr', amount: 30 }] });
    expect(response.status).toBe(200);
    expect(response.body.data.order.status).toBe('completed');
    expect(response.body.data.receipt.receiptNumber).toMatch(/^RCT-/);
    expect(response.body.data.invoice.invoiceNumber).toMatch(/^INV-/);
    expect(await Receipt.countDocuments({ order: orderId })).toBe(1);
    expect(await Invoice.countDocuments({ order: orderId })).toBe(1);
  });

  it('supports partial refund, audits it, and updates cash reconciliation', async () => {
    const response = await request(app).post(`/api/payments/orders/${orderId}/refunds`).set('Authorization', `Bearer ${token}`).send({ amount: 25, reason: 'Partial customer refund' });
    const summary = await request(app).get(`/api/shifts/${shiftId}/summary`).set('Authorization', `Bearer ${token}`);
    expect(response.status).toBe(200);
    expect(response.body.data.remaining).toBe(75);
    expect(response.body.data.order.paymentStatus).toBe('partially_refunded');
    expect(summary.body.data.totals.expectedCash).toBe(65);
    expect(await PaymentAudit.countDocuments({ action: 'payment_refunded' })).toBe(1);
  });

  it('closes the shift with actual cash and records the difference', async () => {
    const response = await request(app).post(`/api/shifts/${shiftId}/close`).set('Authorization', `Bearer ${token}`).send({ actualCash: 60, notes: 'Counted drawer' });
    expect(response.status).toBe(200);
    expect(response.body.data.reconciliation.difference).toBe(-5);
    expect((await Shift.findById(shiftId))?.status).toBe('closed');
  });

  it('rejects payment after the shift closes and rejects overpayment', async () => {
    const overpaymentOrder = await request(app).post('/api/pos/orders').set('Authorization', `Bearer ${token}`).send({ type: 'take_away', items: [{ product: productId, quantity: 1 }] });
    const response = await request(app).post(`/api/payments/orders/${overpaymentOrder.body.data._id}/payments`).set('Authorization', `Bearer ${token}`).send({ payments: [{ method: 'cash', amount: 101 }] });
    expect(response.status).toBe(409);
  });
});
