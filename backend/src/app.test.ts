import request from 'supertest';
import { describe, expect, it } from 'vitest';
import app from './app.js';

describe('Phase 1 foundation smoke tests', () => {
  it('returns health status', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe('ok');
  });

  it('returns API metadata', async () => {
    const response = await request(app).get('/api');
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.name).toBe('Restaurant Management System API');
  });
});
