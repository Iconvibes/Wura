'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app, startTestDB, stopTestDB, clearDB, resetRateLimits, makeRoom, makeBooking, bookingPayload,
} from './helpers.js';
import { today, addDays } from '../lib.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  resetRateLimits(); // bookings share a token bucket per IP — start clean each test
});

describe('POST /api/bookings', () => {
  it('creates an unpaid booking with a checkout url', async () => {
    const room = await makeRoom({ price: 100, room_number: '1204', floor: 12 });
    const res = await request(app).post('/api/bookings').send(bookingPayload(room._id)).expect(201);

    expect(res.body.booking).toMatchObject({
      room_name: 'Test Room',
      room_number: '1204',
      room_floor: 12,
      guest_name: 'Jane Doe',
      total: 200, // 2 nights × $100
      status: 'confirmed',
      payment_status: 'unpaid',
    });
    expect(res.body.booking.ref).toMatch(/^WU[A-Z2-9]{6}$/);
    expect(res.body.checkout_url).toContain('/mock-checkout/');
  });

  it('rejects overlapping bookings for the same room (409)', async () => {
    const room = await makeRoom();
    await request(app).post('/api/bookings').send(bookingPayload(room._id)).expect(201);

    const overlap = await request(app)
      .post('/api/bookings')
      .send(bookingPayload(room._id, { check_in: addDays(today(), 1), check_out: addDays(today(), 3) }))
      .expect(409);
    expect(overlap.body.error).toMatch(/no longer available/i);

    // Same room, clearly non-overlapping dates → allowed.
    await request(app)
      .post('/api/bookings')
      .send(bookingPayload(room._id, { check_in: addDays(today(), 10), check_out: addDays(today(), 12) }))
      .expect(201);
  });

  it('allows a different room for the same dates', async () => {
    const a = await makeRoom({ name: 'Room A' });
    const b = await makeRoom({ name: 'Room B' });
    await request(app).post('/api/bookings').send(bookingPayload(a._id)).expect(201);
    await request(app).post('/api/bookings').send(bookingPayload(b._id)).expect(201);
  });

  it('validates dates, email, guests and capacity', async () => {
    const room = await makeRoom({ capacity: 2 });
    // Each request uses its own IP so the shared rate-limit bucket never trips.
    let ip = 1;
    const send = (body) => request(app)
      .post('/api/bookings')
      .set('x-forwarded-for', `10.1.0.${ip++}`)
      .send(body);

    // Invalid date format
    await send(bookingPayload(room._id, { check_in: 'bad', check_out: addDays(today(), 2) })).expect(400);

    // Check-out before check-in
    await send(bookingPayload(room._id, { check_in: today(), check_out: today() })).expect(400);

    // Check-in in the past
    await send(bookingPayload(room._id, { check_in: addDays(today(), -3), check_out: addDays(today(), -1) })).expect(400);

    // Missing email / bad email
    await send(bookingPayload(room._id, { guest_email: '' })).expect(400);
    await send(bookingPayload(room._id, { guest_email: 'not-an-email' })).expect(400);

    // Guests must be >= 1
    await send(bookingPayload(room._id, { guests: 0 })).expect(400);

    // Guests exceed room capacity
    await send(bookingPayload(room._id, { guests: 4 })).expect(400);
  });

  it('404s for an unknown or malformed room id', async () => {
    await request(app).post('/api/bookings')
      .send(bookingPayload('000000000000000000000000'))
      .expect(404);
    await request(app).post('/api/bookings')
      .send(bookingPayload('nope'))
      .expect(404);
  });
});

describe('rate limiting on POST /api/bookings', () => {
  it('allows 5 requests then rejects with 429', async () => {
    // Invalid bodies still consume a token (the limiter runs before validation).
    for (let i = 0; i < 5; i++) {
      const res = await request(app).post('/api/bookings').send({});
      expect([400, 201, 404]).toContain(res.status);
    }
    const blocked = await request(app).post('/api/bookings').send({}).expect(429);
    expect(blocked.body.error).toMatch(/too many/i);
  });

  it('uses separate buckets per client ip (x-forwarded-for)', async () => {
    resetRateLimits();
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/bookings').set('x-forwarded-for', '203.0.113.7').send({}).expect(400);
    }
    // The 6th request from the same IP is blocked…
    await request(app).post('/api/bookings').set('x-forwarded-for', '203.0.113.7').send({}).expect(429);
    // …but a different IP is unaffected.
    await request(app).post('/api/bookings').set('x-forwarded-for', '203.0.113.99').send({}).expect(400);
  });
});

describe('GET /api/bookings/:ref', () => {
  it('finds a booking by reference, case-insensitively', async () => {
    const room = await makeRoom({ name: 'Lookup Room' });
    const created = await request(app).post('/api/bookings').send(bookingPayload(room._id)).expect(201);
    const ref = created.body.booking.ref;

    const res = await request(app).get(`/api/bookings/${ref.toLowerCase()}`).expect(200);
    expect(res.body.booking).toMatchObject({
      ref,
      room_name: 'Lookup Room',
      payment_status: 'unpaid',
    });
  });

  it('404s for unknown refs and treats regex metacharacters as literals', async () => {
    await request(app).get('/api/bookings/NOPE123').expect(404);
    // A crafted ref must not widen the regex match.
    await request(app).get('/api/bookings/%2A').expect(404);
    await request(app).get('/api/bookings/.*').expect(404);
  });
});
