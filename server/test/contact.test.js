'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB } from './helpers.js';
import { __resetContactLimits } from '../routes/public.js';
import Message from '../models/Message.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await Message.deleteMany({});
  __resetContactLimits();
});

const valid = {
  name: 'Amara Okafor',
  email: 'amara@example.com',
  subject: 'Reservation enquiry',
  message: 'Two nights in the Deluxe Garden, please.',
};

describe('POST /api/contact', () => {
  it('accepts a valid enquiry', async () => {
    const res = await request(app).post('/api/contact').send(valid).expect(200);
    expect(res.body.ok).toBe(true);
  });

  it('rejects missing name, email or message', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'A', email: 'a@b.com' })
      .expect(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('rejects a malformed email', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, email: 'not-an-email' })
      .expect(400);
    expect(res.body.error).toMatch(/valid email/i);
  });

  it('rejects an overlong message', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, message: 'x'.repeat(5000) })
      .expect(400);
    expect(res.body.error).toMatch(/too long/i);
  });

  it('silently drops submissions with a filled honeypot field', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, website: 'http://spam.example' })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(await Message.countDocuments()).toBe(0);
  });

  it('silently drops submissions faster than a human can type', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, started_at: Date.now() })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(await Message.countDocuments()).toBe(0);
  });

  it('accepts submissions with a human-speed started_at', async () => {
    const res = await request(app)
      .post('/api/contact')
      .send({ ...valid, started_at: Date.now() - 5000 })
      .expect(200);
    expect(res.body.ok).toBe(true);
    expect(await Message.countDocuments()).toBe(1);
  });

  it('rate-limits enquiries to 5 per window per IP', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/contact').send(valid).expect(200);
    }
    const blocked = await request(app).post('/api/contact').send(valid).expect(429);
    expect(blocked.body.error).toMatch(/too many messages/i);
  });
});
