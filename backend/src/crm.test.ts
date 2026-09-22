import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import app from './app.js';
import { User } from './models/User.js';
import { Role } from './models/Role.js';
import { Customer } from './models/Customer.js';
import { CustomerGroup } from './models/CustomerGroup.js';
import { Promotion } from './models/Promotion.js';
import { LoyaltyLevel } from './models/LoyaltyLevel.js';
import { LoyaltyReward } from './models/LoyaltyReward.js';
import { GiftCard } from './models/GiftCard.js';
import { Category } from './models/Category.js';
import { Unit } from './models/Unit.js';
import { Product } from './models/Product.js';
import { Shift } from './models/Shift.js';
import { Order } from './models/Order.js';

let replSet: MongoMemoryReplSet;
let authToken: string;
let userId: string;
let productId: string;
let customerId: string;
let groupId: string;
let giftCardCode: string;

beforeAll(async () => {
  replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(replSet.getUri());

  // Setup Role & User for auth
  const role = await Role.create({ name: 'Admin', code: 'admin', permissions: [] });
  const user = await User.create({
    firstName: 'CRM',
    lastName: 'Admin',
    name: 'CRM Admin',
    email: 'admin@crm.com',
    passwordHash: 'hashedpassword',
    roles: [role._id],
    isActive: true,
  });
  userId = String(user._id);

  const { signAccessToken } = await import('./utils/jwt.js');
  authToken = signAccessToken({
    sub: userId,
    email: 'admin@crm.com',
    roleIds: [String(role._id)],
    permissionKeys: ['pos.create', 'pos.view', 'pos.manage', 'payment.create', 'payment.view', '*'],
  });

  // Setup Product & Shift for POS tests
  const category = await Category.create({ name: 'CRM Food', code: 'CRMF' });
  const unit = await Unit.create({ name: 'Piece', code: 'pcs' });
  const product = await Product.create({ name: 'Burger', sku: 'BURGER-01', category: category._id, unit: unit._id, type: 'retail', sellingPrice: 20, stockQuantity: 50 });
  productId = String(product._id);
  await Shift.create({ user: userId, openingCash: 100, status: 'open' });
});

afterAll(async () => {
  await mongoose.connection.close();
  await replSet.stop();
});

describe('CRM, Loyalty & Gift Cards API', () => {
  it('creates and manages customer groups and promotions', async () => {
    // 1. Create Group
    const groupRes = await request(app)
      .post('/api/crm/groups')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'VIP Club', discountPercentage: 10 });
    expect(groupRes.status).toBe(201);
    groupId = groupRes.body._id;

    // 2. Create Promotion
    const promoRes = await request(app)
      .post('/api/crm/promotions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Summer Sale',
        code: 'SUMMER20',
        discountType: 'percentage',
        discountValue: 20,
        minOrderAmount: 10,
      });
    expect(promoRes.status).toBe(201);

    // Validate Promo Code
    const valRes = await request(app)
      .post('/api/crm/promotions/validate')
      .send({ code: 'SUMMER20', orderAmount: 50 });
    expect(valRes.status).toBe(200);
    expect(valRes.body.valid).toBe(true);
    expect(valRes.body.discountAmount).toBe(10);
  });

  it('creates customers, manages credit balance and auto-segmentation', async () => {
    // 1. Create Customer
    const custRes = await request(app)
      .post('/api/crm/customers')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        customerGroup: groupId,
      });
    expect(custRes.status).toBe(201);
    customerId = custRes.body._id;

    // 2. Add Store Credit
    const creditRes = await request(app)
      .post(`/api/crm/customers/${customerId}/credit`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ amount: 100, type: 'deposit', notes: 'Welcome Deposit' });
    expect(creditRes.status).toBe(200);
    expect(creditRes.body.customer.creditBalance).toBe(100);

    // 3. Fetch Customer History
    const histRes = await request(app)
      .get(`/api/crm/customers/${customerId}/history`)
      .set('Authorization', `Bearer ${authToken}`);
    expect(histRes.status).toBe(200);
    expect(histRes.body.creditTransactions.length).toBe(1);
  });

  it('configures loyalty tiers and rewards catalog', async () => {
    // 1. Create Tier
    const tierRes = await request(app)
      .post('/api/loyalty/levels')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ name: 'Gold', minSpend: 50, pointsMultiplier: 2.0 });
    expect(tierRes.status).toBe(201);

    // 2. Create Reward
    const rewardRes = await request(app)
      .post('/api/loyalty/rewards')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: '$5 Off Voucher',
        pointsRequired: 50,
        rewardType: 'discount_fixed',
        rewardValue: 5,
      });
    expect(rewardRes.status).toBe(201);
  });

  it('issues gift cards and handles balance lookup & redemption', async () => {
    // 1. Issue Gift Card
    const gcRes = await request(app)
      .post('/api/gift-cards/issue')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ initialBalance: 50, recipientName: 'Alice' });
    expect(gcRes.status).toBe(201);
    giftCardCode = gcRes.body.giftCard.code;

    // 2. Lookup Gift Card
    const lookupRes = await request(app).get(`/api/gift-cards/lookup/${giftCardCode}`);
    expect(lookupRes.status).toBe(200);
    expect(lookupRes.body.currentBalance).toBe(50);
  });

  it('integrates store credit, gift cards, and loyalty points earning with POS orders', async () => {
    // 1. Create POS order for customer
    const orderRes = await request(app)
      .post('/api/pos/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        type: 'take_away',
        customer: customerId,
        items: [{ product: productId, quantity: 2 }], // Subtotal: 40
      });
    expect(orderRes.status).toBe(201);
    const orderId = orderRes.body.data?._id || orderRes.body._id;

    // 2. Pay using Store Credit ($20) and Gift Card ($20)
    const payRes = await request(app)
      .post(`/api/payments/orders/${orderId}/payments`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        payments: [
          { method: 'store_credit', amount: 20 },
          { method: 'gift_card', amount: 20, reference: giftCardCode },
        ],
      });
    expect(payRes.status).toBe(200);
    expect(payRes.body.data.order.status).toBe('completed');

    // 3. Verify Customer Store Credit was deducted
    const updatedCust = await Customer.findById(customerId);
    expect(updatedCust?.creditBalance).toBe(80); // Started with 100 - 20 = 80
    expect(updatedCust?.loyaltyPoints).toBeGreaterThan(0); // Points earned on completed order

    // 4. Verify Gift Card balance was deducted
    const updatedGC = await GiftCard.findOne({ code: giftCardCode });
    expect(updatedGC?.currentBalance).toBe(30); // 50 - 20 = 30
  });
});
