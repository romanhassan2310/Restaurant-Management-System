import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { Category } from './models/Category.js';
import { Customer } from './models/Customer.js';
import { KitchenOrder } from './models/KitchenOrder.js';
import { Order } from './models/Order.js';
import { Product } from './models/Product.js';
import { RestaurantTable } from './models/RestaurantTable.js';
import { Unit } from './models/Unit.js';

let replSet: MongoMemoryReplSet;
let token = 'table-qr-secret';
let productId = '';
let tableId = '';

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());
  const category = await Category.create({ name: 'QR Menu', code: 'QRMENU' });
  const unit = await Unit.create({ name: 'QR Each', code: 'qr_each' });
  const product = await Product.create({ name: 'QR Noodles', sku: 'QR-NOODLES', category: category._id, unit: unit._id, type: 'retail', sellingPrice: 15, stockQuantity: 10 });
  productId = String(product._id);
  const table = await RestaurantTable.create({ name: 'QR-1', capacity: 4, qrToken: token, qrEnabled: true, status: 'available' });
  tableId = String(table._id);
});

afterAll(async () => { await mongoose.connection.close(); await replSet.stop(); });

describe('QR self ordering', () => {
  it('loads a table-specific menu and rejects invalid table QR tokens', async () => {
    const menu = await request(app).get(`/api/qr/${token}/menu`);
    const invalid = await request(app).get('/api/qr/invalid-token/menu');
    expect(menu.status).toBe(200);
    expect(menu.body.data.table.name).toBe('QR-1');
    expect(menu.body.data.products.some((product: { _id: string }) => product._id === productId)).toBe(true);
    expect(invalid.status).toBe(404);
  });

  it('submits a customer order into CRM, POS, and KDS projections', async () => {
    const response = await request(app).post(`/api/qr/${token}/orders`).send({ customerName: 'QR Guest', customerPhone: '555-QR-01', items: [{ product: productId, quantity: 2 }] });
    const orderId = response.body.data.order._id;
    const order = await Order.findById(orderId);
    const kitchenOrder = await KitchenOrder.findOne({ order: orderId });
    const customer = await Customer.findOne({ phone: '555-QR-01' });
    expect(response.status).toBe(201);
    expect(order?.source).toBe('qr');
    expect(String(order?.table)).toBe(tableId);
    expect(kitchenOrder?.orderNumber).toBe(order?.orderNumber);
    expect(customer?.name).toBe('QR Guest');
  });

  it('rejects QR ordering for inactive tables', async () => {
    await RestaurantTable.findByIdAndUpdate(tableId, { isActive: false });
    const response = await request(app).post(`/api/qr/${token}/orders`).send({ customerName: 'Blocked Guest', customerPhone: '555-BLOCKED', items: [{ product: productId, quantity: 1 }] });
    expect(response.status).toBe(404);
  });
});
