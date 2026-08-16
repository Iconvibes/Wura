'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB, createAdminUser, login, resetLoginLimits } from './helpers.js';
import { __resetAccessCodeCache } from '../routes/admin.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await createAdminUser();
  resetLoginLimits();
  __resetAccessCodeCache(); // fresh DB → re-read the (absent) Setting row
});

const ORIGINAL_RESET_SECRET = process.env.ADMIN_RESET_SECRET;

beforeEach(() => {
  process.env.ADMIN_RESET_SECRET = ORIGINAL_RESET_SECRET; // restore between tests
});

describe('POST /api/admin/recover-access-code', () => {
  it('is disabled when ADMIN_RESET_SECRET is not set', async () => {
    delete process.env.ADMIN_RESET_SECRET;
    await request(app)
      .post('/api/admin/recover-access-code')
      .send({ reset_secret: 'anything', code: 'STAFF-2026' })
      .expect(403);
  });

  it('rejects a wrong recovery secret', async () => {
    process.env.ADMIN_RESET_SECRET = 'correct-horse-battery-staple';
    await request(app)
      .post('/api/admin/recover-access-code')
      .send({ reset_secret: 'wrong-secret', code: 'STAFF-2026' })
      .expect(401);
  });

  it('rejects a too-short replacement code', async () => {
    process.env.ADMIN_RESET_SECRET = 'correct-horse-battery-staple';
    await request(app)
      .post('/api/admin/recover-access-code')
      .send({ reset_secret: 'correct-horse-battery-staple', code: 'abc' })
      .expect(400);
  });

  it('rotates the code with only the recovery secret (no login, no DB access)', async () => {
    process.env.ADMIN_RESET_SECRET = 'correct-horse-battery-staple';
    await request(app)
      .post('/api/admin/recover-access-code')
      .send({ reset_secret: 'correct-horse-battery-staple', code: 'RECOVERED-26' })
      .expect(200);

    // Old code is dead, recovered code works at both gates.
    await request(app).post('/api/admin/verify-code').send({ access_code: 'WURA-1962' }).expect(401);
    await request(app).post('/api/admin/verify-code').send({ access_code: 'RECOVERED-26' }).expect(204);
    const ok = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123', access_code: 'RECOVERED-26' })
      .expect(200);
    expect(ok.body.token).toBeTruthy();
  });

  it('rejects setting the same code that is already in force', async () => {
    process.env.ADMIN_RESET_SECRET = 'correct-horse-battery-staple';
    await request(app)
      .post('/api/admin/recover-access-code')
      .send({ reset_secret: 'correct-horse-battery-staple', code: 'WURA-1962' })
      .expect(400);
  });
});

describe('POST /api/admin/access-code', () => {
  it('requires a signed-in admin', async () => {
    await request(app)
      .post('/api/admin/access-code')
      .send({ current_code: 'WURA-1962', code: 'NEW-CODE-77' })
      .expect(401);
  });

  it('rejects a code that is too short', async () => {
    const token = await login();
    const res = await request(app)
      .post('/api/admin/access-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_code: 'WURA-1962', code: 'abc' })
      .expect(400);
    expect(res.body.error).toMatch(/6–64/);
  });

  it('rejects a wrong current code', async () => {
    const token = await login();
    await request(app)
      .post('/api/admin/access-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_code: 'WRONG-0000', code: 'NEW-CODE-77' })
      .expect(401);
  });

  it('rejects setting the same code again', async () => {
    const token = await login();
    const res = await request(app)
      .post('/api/admin/access-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_code: 'WURA-1962', code: 'WURA-1962' })
      .expect(400);
    expect(res.body.error).toMatch(/different/);
  });

  it('rotates the code: new code works, old one stops', async () => {
    const token = await login();
    await request(app)
      .post('/api/admin/access-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_code: 'WURA-1962', code: 'STAFF-2026' })
      .expect(200);

    // verify-code gate now accepts the new code only.
    await request(app).post('/api/admin/verify-code').send({ access_code: 'WURA-1962' }).expect(401);
    await request(app).post('/api/admin/verify-code').send({ access_code: 'STAFF-2026' }).expect(204);

    // login follows suit.
    await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123', access_code: 'WURA-1962' })
      .expect(401);
    const ok = await request(app)
      .post('/api/admin/login')
      .send({ username: 'admin', password: 'admin123', access_code: 'STAFF-2026' })
      .expect(200);
    expect(ok.body.token).toBeTruthy();
  });

  it('persists across changes (cache invalidated after rotation)', async () => {
    const token = await login();
    await request(app)
      .post('/api/admin/access-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_code: 'WURA-1962', code: 'STAFF-2026' })
      .expect(200);
    // A second rotation uses the NEW code as the current one.
    await request(app)
      .post('/api/admin/access-code')
      .set('Authorization', `Bearer ${token}`)
      .send({ current_code: 'STAFF-2026', code: 'STAFF-2027' })
      .expect(200);
    await request(app).post('/api/admin/verify-code').send({ access_code: 'STAFF-2027' }).expect(204);
  });

  it('falls back to the default code when no setting exists', async () => {
    await request(app).post('/api/admin/verify-code').send({ access_code: 'WURA-1962' }).expect(204);
    await request(app).post('/api/admin/verify-code').send({ access_code: 'nope' }).expect(401);
  });
});
