import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './app.js';
import { Category } from './models/Category.js';
import { Permission } from './models/Permission.js';
import { Product } from './models/Product.js';
import { Role } from './models/Role.js';
import { Unit } from './models/Unit.js';
import { User } from './models/User.js';
import { StockMovement } from './models/StockMovement.js';
import { hashPassword } from './utils/password.js';

const email = 'inventory-admin@example.com';
const password = 'P@ssword123!';
let accessToken = '';
let categoryId = '';
let unitId = '';
let ingredientId = '';
let preparedId = '';

beforeAll(async () => {
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  const permissionKeys = ['inventory.view', 'inventory.manage', 'inventory.adjust', 'inventory.transfer', 'inventory.audit'];
  const permissions = await Permission.create(permissionKeys.map((key) => ({ key, description: key })));
  const role = await Role.create({ name: 'Inventory Admin', code: 'inventory_admin', permissions: permissions.map((permission) => permission._id) });
  await User.create({ firstName: 'Inventory', lastName: 'Admin', email, passwordHash: await hashPassword(password), roles: [role._id], isActive: true });

  const login = await request(app).post('/api/auth/login').send({ email, password });
  accessToken = login.body.data.accessToken;
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Inventory management', () => {
  it('creates catalog records and increases stock on purchase', async () => {
    const category = await request(app).post('/api/inventory/categories').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Ingredients', code: 'ING' });
    categoryId = category.body.data._id;
    const unit = await request(app).post('/api/inventory/units').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Kilogram', code: 'kg' });
    unitId = unit.body.data._id;

    const ingredient = await request(app).post('/api/inventory/products').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Flour', sku: 'FLOUR-001', category: categoryId, unit: unitId, type: 'raw_material', costPrice: 2, reorderLevel: 8 });
    ingredientId = ingredient.body.data._id;
    const purchase = await request(app).post('/api/inventory/purchase').set('Authorization', `Bearer ${accessToken}`).send({ productId: ingredientId, quantity: 10 });

    expect(category.status).toBe(201);
    expect(unit.status).toBe(201);
    expect(ingredient.status).toBe(201);
    expect(purchase.status).toBe(201);
    expect((await Product.findById(ingredientId))?.stockQuantity).toBe(10);
  });

  it('deducts recipe ingredients when a prepared product is sold', async () => {
    const prepared = await request(app).post('/api/inventory/products').set('Authorization', `Bearer ${accessToken}`).send({ name: 'Bread', sku: 'BREAD-001', category: categoryId, unit: unitId, type: 'prepared', reorderLevel: 1 });
    preparedId = prepared.body.data._id;
    const recipe = await request(app).post('/api/inventory/recipes').set('Authorization', `Bearer ${accessToken}`).send({ product: preparedId, yieldQuantity: 2, yieldUnit: unitId, items: [{ product: ingredientId, quantity: 3, unit: unitId }] });
    const sale = await request(app).post('/api/inventory/sale').set('Authorization', `Bearer ${accessToken}`).send({ productId: preparedId, quantity: 2 });

    expect(recipe.status).toBe(201);
    expect(sale.status).toBe(201);
    expect((await Product.findById(ingredientId))?.stockQuantity).toBe(7);
    expect(await StockMovement.countDocuments({ type: 'sale', referenceType: 'RecipeSale' })).toBe(1);
  });

  it('records transfer movements and reports low stock', async () => {
    const transfer = await request(app).post('/api/inventory/transfers').set('Authorization', `Bearer ${accessToken}`).send({ fromLocation: 'Main', toLocation: 'Kitchen', items: [{ product: ingredientId, quantity: 2 }] });
    const lowStock = await request(app).get('/api/inventory/low-stock').set('Authorization', `Bearer ${accessToken}`);
    const valuation = await request(app).get('/api/inventory/valuation').set('Authorization', `Bearer ${accessToken}`);

    expect(transfer.status).toBe(201);
    expect(lowStock.status).toBe(200);
    expect(lowStock.body.data.some((product: { _id: string }) => product._id === ingredientId)).toBe(true);
    expect(valuation.body.data.totalValue).toBe(14);
    expect(await StockMovement.countDocuments({ referenceType: 'StockTransfer' })).toBe(2);
  });

  it('protects inventory APIs from unauthenticated callers', async () => {
    const response = await request(app).get('/api/inventory/products');
    expect(response.status).toBe(401);
  });
});
