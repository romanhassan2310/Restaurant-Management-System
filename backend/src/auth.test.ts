import request from 'supertest';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './app.js';
import { Role } from './models/Role.js';
import { Permission } from './models/Permission.js';
import { User } from './models/User.js';
import { hashPassword } from './utils/password.js';

const email = 'phase2-admin@example.com';
const password = 'P@ssword123!';

beforeAll(async () => {
  const memoryServer = await MongoMemoryServer.create();
  await mongoose.connect(memoryServer.getUri());
  await Permission.deleteMany({});
  await Role.deleteMany({});
  await User.deleteMany({});

  const permission = await Permission.create({ key: 'users.view', description: 'View users' });
  const role = await Role.create({
    name: 'Super Admin',
    code: 'super_admin',
    permissions: [permission._id],
  });

  await User.create({
    firstName: 'Phase',
    lastName: 'Admin',
    email,
    passwordHash: await hashPassword(password),
    roles: [role._id],
    isActive: true,
  });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Authentication and authorization', () => {
  it('logs in a valid user and returns access and refresh tokens', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.accessToken).toBeTruthy();
    expect(response.body.data.refreshToken).toBeTruthy();
  });

  it('rejects invalid credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'wrongpassword' });

    expect(response.status).toBe(401);
    expect(response.body.success).toBe(false);
  });

  it('requires authentication for a protected route', async () => {
    const response = await request(app).get('/api/users/me');
    expect(response.status).toBe(401);
  });
});
