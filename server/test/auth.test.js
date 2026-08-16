'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB, createAdminUser, login, resetLoginLimits } from './helpers.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await createAdminUser();
  resetLoginLimits();
});

describe('POST /api/admin/login', () => {
  it('returns a token for valid credentials + access code', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123', access_code: 'WURA-1962' })
      .expect(200);
    expect(res.body.token).toBeTruthy();
    expect(res.body.user.username).toBe('admin');
  });

  it('rejects a wrong password with 401', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrong', access_code: 'WURA-1962' })
      .expect(401);
    expect(res.body.error).toBeTruthy();
  });

  it('rejects an unknown user with 401', async () => {
    await request(app)
      .post('/api/admin/login')
      .send({ username: 'ghost', password: 'admin123', access_code: 'WURA-1962' })
      .expect(401);
  });

  it('rejects a missing or wrong staff access code', async () => {
    const missing = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123' })
      .expect(401);
    expect(missing.body.error).toMatch(/access code/i);

    const wrong = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123', access_code: 'nope' })
      .expect(401);
    expect(wrong.body.error).toMatch(/access code/i);
  });
});

describe('POST /api/admin/verify-code', () => {
  it('accepts the correct staff access code', async () => {
    await request(app)
      .post('/api/admin/verify-code')
      .send({ access_code: 'WURA-1962' })
      .expect(204);
  });

  it('rejects a missing or wrong staff access code', async () => {
    const missing = await request(app)
      .post('/api/admin/verify-code')
      .send({})
      .expect(401);
    expect(missing.body.error).toMatch(/access code/i);

    const wrong = await request(app)
      .post('/api/admin/verify-code')
      .send({ access_code: 'nope' })
      .expect(401);
    expect(wrong.body.error).toMatch(/access code/i);
  });

  it('gates only the form — it never issues a session token', async () => {
    await request(app)
      .post('/api/admin/verify-code')
      .send({ access_code: 'WURA-1962' })
      .expect(204);
    // A verified code must NOT grant access by itself.
    await request(app).get('/api/admin/me').expect(401);
  });
});

describe('protected admin routes', () => {
  it('rejects requests without a token (401)', async () => {
    await request(app).get('/api/admin/me').expect(401);
    await request(app).get('/api/admin/bookings').expect(401);
    await request(app).get('/api/admin/front-desk').expect(401);
  });

  it('rejects a malformed token (401)', async () => {
    await request(app).get('/api/admin/me').set('Authorization', 'Bearer not.a.jwt').expect(401);
    await request(app).get('/api/admin/me').set('Authorization', 'Bearer ').expect(401);
  });

  it('accepts a valid token and returns the session user', async () => {
    const token = await login();
    const res = await request(app).get('/api/admin/me').set('Authorization', `Bearer ${token}`).expect(200);
    expect(res.body.user.username).toBe('admin');
  });
});

describe('login rate limiting', () => {
  it('blocks after 10 failed attempts with 429', async () => {
    resetLoginLimits();
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/admin/login')
        .send({ username: 'admin', password: 'wrong', access_code: 'WURA-1962' })
        .expect(401);
    }
    const blocked = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'wrong', access_code: 'WURA-1962' })
      .expect(429);
    expect(blocked.body.error).toMatch(/too many login attempts/i);
  });
});
