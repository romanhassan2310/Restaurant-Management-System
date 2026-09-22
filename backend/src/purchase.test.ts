import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { Category } from './models/Category.js';
import { Permission } from './models/Permission.js';
import { Product } from './models/Product.js';
import { PurchaseOrder } from './models/PurchaseOrder.js';
import { Role } from './models/Role.js';
import { StockMovement } from './models/StockMovement.js';
import { Supplier } from './models/Supplier.js';
import { Unit } from './models/Unit.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';

const email = 'purchasing-admin@example.com';
const password = 'P@ssword123!';
let token = '';
let supplierId = '';
let productId = '';
let replSet: MongoMemoryReplSet;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  const keys = ['purchase.view', 'purchase.manage', 'purchase.approve', 'purchase.receive', 'purchase.return', 'purchase.report', 'supplier.payment'];
  const permissions = await Permission.create(keys.map((key) => ({ key, description: key })));
  const role = await Role.create({ name: 'Purchasing Admin', code: 'purchasing_admin', permissions: permissions.map((item) => item._id) });
  await User.create({ firstName: 'Purchasing', lastName: 'Admin', email, passwordHash: await hashPassword(password), roles: [role._id], isActive: true });
  const supplier = await Supplier.create({ name: 'Fresh Foods', code: 'FRESH', paymentTermsDays: 30 });
  supplierId = String(supplier._id);
  const category = await Category.create({ name: 'Purchase Goods', code: 'PURCHASE' });
  const unit = await Unit.create({ name: 'Purchase Each', code: 'purchase_each' });
  const product = await Product.create({ name: 'Tomatoes', sku: 'TOMATO-001', category: category._id, unit: unit._id, type: 'raw_material', costPrice: 2, stockQuantity: 0 });
  productId = String(product._id);
  const login = await request(app).post('/api/auth/login').send({ email, password });
  token = login.body.data.accessToken;
});

afterAll(async () => { await mongoose.connection.close(); await replSet.stop(); });

describe('Purchase and supplier consistency', () => {
  it('runs request to purchase order without changing stock', async () => {
    const requestResponse = await request(app).post('/api/purchases/requests').set('Authorization', `Bearer ${token}`).send({ supplier: supplierId, items: [{ product: productId, quantity: 10 }] });
    const approve = await request(app).patch(`/api/purchases/requests/${requestResponse.body.data._id}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'approved' });
    const orderResponse = await request(app).post('/api/purchases/orders').set('Authorization', `Bearer ${token}`).send({ supplier: supplierId, request: requestResponse.body.data._id, items: [{ product: productId, quantity: 10, unitCost: 2 }] });
    expect(requestResponse.status).toBe(201);
    expect(approve.status).toBe(200);
    expect(orderResponse.status).toBe(201);
    expect((await Product.findById(productId))?.stockQuantity).toBe(0);
  });

  it('increases stock exactly once when goods are received', async () => {
    const order = await PurchaseOrder.findOne({ supplier: supplierId });
    const receipt = await request(app).post('/api/purchases/receipts').set('Authorization', `Bearer ${token}`).send({ purchaseOrder: String(order!._id), items: [{ product: productId, quantity: 6 }] });
    const duplicate = await request(app).post('/api/purchases/receipts').set('Authorization', `Bearer ${token}`).send({ purchaseOrder: String(order!._id), items: [{ product: productId, quantity: 6 }] });
    expect(receipt.status).toBe(201);
    expect(duplicate.status).toBe(400);
    expect((await Product.findById(productId))?.stockQuantity).toBe(6);
    expect(await StockMovement.countDocuments({ referenceType: 'GoodsReceipt' })).toBe(1);
  });

  it('updates supplier balance through invoice and payment without changing stock', async () => {
    const invoice = await request(app).post('/api/purchases/invoices').set('Authorization', `Bearer ${token}`).send({ supplier: supplierId, subtotal: 12, taxTotal: 1.2 });
    const payment = await request(app).post('/api/purchases/payments').set('Authorization', `Bearer ${token}`).send({ supplier: supplierId, invoice: invoice.body.data._id, amount: 5, method: 'bank' });
    const supplier = await Supplier.findById(supplierId);
    expect(invoice.status).toBe(201);
    expect(payment.status).toBe(201);
    expect(supplier?.balance).toBe(8.2);
    expect((await Product.findById(productId))?.stockQuantity).toBe(6);
  });

  it('decreases stock for purchase return and exposes reports/audit logs', async () => {
    const returned = await request(app).post('/api/purchases/returns').set('Authorization', `Bearer ${token}`).send({ supplier: supplierId, items: [{ product: productId, quantity: 2, unitCost: 2 }], reason: 'Damaged goods' });
    const reports = await request(app).get('/api/purchases/reports').set('Authorization', `Bearer ${token}`);
    const audit = await request(app).get('/api/purchases/audit').set('Authorization', `Bearer ${token}`);
    expect(returned.status).toBe(201);
    expect((await Product.findById(productId))?.stockQuantity).toBe(4);
    expect(reports.status).toBe(200);
    expect(audit.status).toBe(200);
    expect(audit.body.data.some((item: { action: string }) => item.action === 'goods_received')).toBe(true);
  });
});
