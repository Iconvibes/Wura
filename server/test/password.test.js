'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB, createAdminUser, login, resetLoginLimits } from './helpers.js';

beforeAll(async () => {
  await startTestDB();
  await createAdminUser();
});
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await createAdminUser();
  resetLoginLimits();
});

function changePassword(token, body) {
  return request(app)
    .post('/api/admin/change-password')
    .set('Authorization', `Bearer ${token}`)
    .send(body);
}

describe('admin change-password', () => {
  it('requires a valid admin token', async () => {
    await request(app).post('/api/admin/change-password').send({}).expect(401);
  });

  it('rejects a wrong current password', async () => {
    const token = await login();
    const res = await changePassword(token, { current_password: 'nope-nope', new_password: 'BrandNew-2026' });
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/incorrect/i);
  });

  it('rejects a too-short new password', async () => {
    const token = await login();
    const res = await changePassword(token, { current_password: 'admin123', new_password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/8–128/i);
  });

  it('rejects reusing the current password', async () => {
    const token = await login();
    const res = await changePassword(token, { current_password: 'admin123', new_password: 'admin123' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/different/i);
  });

  it('rotates the password: old one stops working, new one signs in', async () => {
    const token = await login();
    await changePassword(token, { current_password: 'admin123', new_password: 'FreshPass-2026' }).expect(200);

    // Old password is dead.
    await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123', access_code: 'WURA-1962' })
      .expect(401);

    // New password works (and returns a usable token).
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'FreshPass-2026', access_code: 'WURA-1962' })
      .expect(200);
    expect(res.body.token).toBeTruthy();

    await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${res.body.token}`)
      .expect(200);
  });
});
