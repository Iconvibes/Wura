'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app, startTestDB, stopTestDB, clearDB, createAdminUser, login, makeRoom, makeBooking, bookingPayload,
} from './helpers.js';
import { today, addDays } from '../lib.js';

let token;

beforeAll(async () => {
  await startTestDB();
  await createAdminUser();
  token = await login();
});
afterAll(stopTestDB);
beforeEach(clearDB);

describe('GET /overview dashboard data', () => {
  it('returns the chart-ready series for the dashboard', async () => {
    // Two rooms; one Deluxe booking tomorrow, one Suite booking starting today.
    const deluxe = await makeRoom({ name: 'Deluxe A', type: 'Deluxe' });
    const suite = await makeRoom({ name: 'Suite A', type: 'Suite' });
    await makeBooking(deluxe._id, { check_in: addDays(today(), 1), check_out: addDays(today(), 3), total: 400 });
    await makeBooking(suite._id, { check_in: today(), check_out: addDays(today(), 2), total: 300 });

    const res = await request(app)
      .get('/api/admin/overview')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const { stats } = res.body;

    // Series align: 30 daily points each for occupancy and revenue.
    expect(stats.occupancy).toHaveLength(30);
    expect(stats.revenueSeries).toHaveLength(30);
    // Revenue by check-in date: 300 today, 400 tomorrow.
    expect(stats.revenueSeries[0].amount).toBe(300);
    expect(stats.revenueSeries[1].amount).toBe(400);
    // Occupancy counts the overlapping nights.
    expect(stats.occupancy[0].pct).toBe(50); // only the Suite covers today
    expect(stats.occupancy[1].pct).toBe(100); // both rooms cover tomorrow

    expect(stats.byType).toEqual({ Deluxe: 1, Suite: 1 });
    expect(stats.byPayment).toMatchObject({ paid: expect.any(Number), unpaid: expect.any(Number) });
    expect(typeof stats.inHouse).toBe('number');
    expect(typeof stats.revenueMonth).toBe('number');
  });
});

describe('rooms CRUD', () => {
  it('lists rooms for an authenticated admin', async () => {
    await makeRoom({ name: 'Listed Room' });
    const res = await request(app)
      .get('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.rooms).toHaveLength(1);
    expect(res.body.rooms[0].name).toBe('Listed Room');
  });

  it('creates a room with generated art', async () => {
    const res = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Panorama Suite',
        type: 'Suite',
        description: 'Glass corner suite',
        price: 450,
        capacity: 4,
        size_sqm: 70,
        amenities: ['Skyline views', 'Espresso bar'],
      })
      .expect(201);
    expect(res.body.room).toMatchObject({ name: 'Panorama Suite', price: 450, status: 'active' });
    expect(res.body.room.art).toContain('data:image/svg+xml');
  });

  it('validates required room fields', async () => {
    const res = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No Price' })
      .expect(400);
    expect(res.body.error).toMatch(/required/i);
  });

  it('patches a room (price change)', async () => {
    const room = await makeRoom({ name: 'Patchable', price: 120 });
    const res = await request(app)
      .patch(`/api/admin/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 180, status: 'maintenance' })
      .expect(200);
    expect(res.body.room.price).toBe(180);
    expect(res.body.room.status).toBe('maintenance');
  });

  it('404s on malformed room ids for patch/delete', async () => {
    await request(app)
      .patch('/api/admin/rooms/not-an-id')
      .set('Authorization', `Bearer ${token}`)
      .send({ price: 1 })
      .expect(404);
    await request(app)
      .delete('/api/admin/rooms/not-an-id')
      .set('Authorization', `Bearer ${token}`)
      .expect(404);
  });

  it('refuses to delete a room with upcoming bookings (409)', async () => {
    const room = await makeRoom({ name: 'Busy' });
    await makeBooking(room._id, { check_in: today(), check_out: addDays(today(), 2) });

    const res = await request(app)
      .delete(`/api/admin/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(409);
    expect(res.body.error).toMatch(/upcoming bookings/i);
  });

  it('deletes a room with no upcoming bookings', async () => {
    const room = await makeRoom({ name: 'Free' });
    // Historical booking only — should not block deletion.
    await makeBooking(room._id, { check_in: addDays(today(), -5), check_out: addDays(today(), -3) });

    await request(app)
      .delete(`/api/admin/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
  });
});

describe('bookings admin endpoints', () => {
  it('lists bookings and filters by payment status', async () => {
    const room = await makeRoom();
    const paid = await makeBooking(room._id, { ref: 'WUPAID01', payment_status: 'paid' });
    await makeBooking(room._id, { ref: 'WUUNPAID1', payment_status: 'unpaid' });

    const all = await request(app)
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(all.body.bookings).toHaveLength(2);

    const paidRes = await request(app)
      .get('/api/admin/bookings?payment=paid')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(paidRes.body.bookings.map((b) => b.ref)).toEqual(['WUPAID01']);
    expect(paidRes.body.bookings[0].payment_status).toBe('paid');

    const unpaidRes = await request(app)
      .get('/api/admin/bookings?payment=unpaid')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(unpaidRes.body.bookings.map((b) => b.ref)).toEqual(['WUUNPAID1']);
  });

  it('updates a booking status via PATCH', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id, { status: 'confirmed' });

    const res = await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked_in' })
      .expect(200);
    expect(res.body.booking.status).toBe('checked_in');
  });

  it('rejects invalid booking statuses', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id);

    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'in_space' })
      .expect(400);
  });
});
