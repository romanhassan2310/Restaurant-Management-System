import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { User } from './models/User.js';
import { Role } from './models/Role.js';
import { Permission } from './models/Permission.js';
import { Customer } from './models/Customer.js';
import { Product } from './models/Product.js';
import { Category } from './models/Category.js';
import { Unit } from './models/Unit.js';
import { signAccessToken } from './utils/jwt.js';

let replSet: MongoMemoryReplSet;
let adminToken: string;
let customerId: string;
let productId: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());

  const permissions = [
    'expense.view',
    'expense.manage',
    'catering.view',
    'catering.manage',
    'quotation.view',
    'quotation.manage',
  ];

  const permDocs = await Promise.all(
    permissions.map((p) => Permission.create({ key: p, description: `Permission ${p}` }))
  );

  const adminRole = await Role.create({
    name: 'Admin',
    code: 'ADMIN',
    permissions: permDocs.map((p) => p._id),
  });

  const adminUser = await User.create({
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@test.com',
    passwordHash: 'hashed',
    roles: [adminRole._id],
    isActive: true,
  });

  adminToken = signAccessToken({
    sub: String(adminUser._id),
    email: adminUser.email,
    roleIds: [String(adminRole._id)],
    permissionKeys: permissions,
  });

  const customer = await Customer.create({
    name: 'Corporation Inc',
    phone: '555-12345',
    email: 'events@corp.com',
    address: '100 Tech Blvd',
  });
  customerId = customer._id.toString();

  const category = await Category.create({ name: 'Catering Goods', code: 'CAT_GOODS' });
  const unit = await Unit.create({ name: 'Package', code: 'pkg' });

  const product = await Product.create({
    name: 'Buffet Package Special',
    sku: 'CAT-BUFF-01',
    category: category._id,
    unit: unit._id,
    type: 'prepared',
    sellingPrice: 45.0,
    costPrice: 20.0,
  });
  productId = product._id.toString();
});

afterAll(async () => {
  await mongoose.connection.close();
  await replSet.stop();
});

describe('Phase 12 - Expense Management, Catering & Quotations API', () => {
  describe('Expense Management', () => {
    let expenseId: string;

    it('creates a new pending expense entry', async () => {
      const res = await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          category: 'Utilities',
          amount: 250.75,
          date: '2026-09-22',
          description: 'Electricity & Gas bill for main kitchen',
          paymentMethod: 'bank_transfer',
          vendor: 'City Power & Gas Co.',
          receiptAttachment: 'https://example.com/receipts/bill-sept.pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvalStatus).toBe('pending');
      expect(res.body.data.amount).toBe(250.75);
      expenseId = res.body.data._id;
    });

    it('fetches expense list and summary', async () => {
      const listRes = await request(app)
        .get('/api/expenses')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      expect(listRes.body.data.length).toBeGreaterThan(0);

      const summaryRes = await request(app)
        .get('/api/expenses/summary')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(summaryRes.status).toBe(200);
      expect(summaryRes.body.data.totalPending).toBe(250.75);
    });

    it('approves a pending expense', async () => {
      const res = await request(app)
        .post(`/api/expenses/${expenseId}/approve`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.approvalStatus).toBe('approved');
    });
  });

  describe('Catering & Bulk Sales', () => {
    let cateringId: string;

    it('creates a bulk catering order', async () => {
      const res = await request(app)
        .post('/api/catering')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer: customerId,
          customerName: 'Corporation Inc',
          customerPhone: '555-12345',
          customerEmail: 'events@corp.com',
          eventName: 'Annual Gala Banquet',
          eventDate: '2026-10-15T18:00:00.000Z',
          guestCount: 150,
          venueAddress: 'Grand Ballroom, Plaza Hotel',
          menuItems: [
            {
              product: productId,
              name: 'Buffet Package Special',
              quantity: 150,
              unitPrice: 45.0,
              notes: 'Include vegetarian station',
            },
          ],
          deliveryFee: 150.0,
          taxAmount: 200.0,
          discountAmount: 100.0,
          depositPaid: 2000.0,
          notes: 'Deliver setup by 4:00 PM',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cateringNumber).toBeDefined();
      expect(res.body.data.status).toBe('confirmed'); // since depositPaid > 0
      expect(res.body.data.subtotal).toBe(6750.0);
      expect(res.body.data.totalAmount).toBe(7000.0);
      expect(res.body.data.balanceDue).toBe(5000.0);

      cateringId = res.body.data._id;
    });

    it('records additional payment towards balance due', async () => {
      const res = await request(app)
        .post(`/api/catering/${cateringId}/payments`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ amount: 3000.0 });

      expect(res.status).toBe(200);
      expect(res.body.data.depositPaid).toBe(5000.0);
      expect(res.body.data.balanceDue).toBe(2000.0);
    });

    it('updates catering status to delivered', async () => {
      const res = await request(app)
        .patch(`/api/catering/${cateringId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'delivered' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('delivered');
    });
  });

  describe('Quotations & Automated Conversion', () => {
    let quotationId: string;

    it('creates a draft price quotation', async () => {
      const res = await request(app)
        .post('/api/quotations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          customer: customerId,
          customerName: 'Corporation Inc',
          customerPhone: '555-12345',
          customerEmail: 'events@corp.com',
          items: [
            {
              product: productId,
              description: 'Buffet Package Special',
              quantity: 50,
              unitPrice: 40.0,
              discount: 100.0,
              taxRate: 5.0,
            },
          ],
          validUntil: '2026-10-01',
          notes: 'Valid for 10 days only',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotationNumber).toBeDefined();
      expect(res.body.data.status).toBe('draft');
      expect(res.body.data.grandTotal).toBeGreaterThan(0);

      quotationId = res.body.data._id;
    });

    it('updates quotation status to accepted', async () => {
      const res = await request(app)
        .patch(`/api/quotations/${quotationId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'accepted' });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('accepted');
    });

    it('converts accepted quotation into a Catering Order', async () => {
      const res = await request(app)
        .post(`/api/quotations/${quotationId}/convert`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          conversionType: 'catering_order',
          eventName: 'Autumn Corporate Seminar',
          guestCount: 50,
          venueAddress: 'Conference Center B',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.quotation.status).toBe('converted');
      expect(res.body.data.cateringOrder).toBeDefined();
      expect(res.body.data.cateringOrder.guestCount).toBe(50);
      expect(res.body.data.cateringOrder.status).toBe('confirmed');
    });
  });
});
