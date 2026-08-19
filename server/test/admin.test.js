'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
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

  it('creates a room with generated art and an auto-assigned room number', async () => {
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
    expect(res.body.room.room_number).toMatch(/^\d{3,4}$/);
    expect(res.body.room.floor).toBe(Math.floor(Number(res.body.room.room_number) / 100));
    expect(res.body.room.art).toContain('data:image/svg+xml');
  });

  it('accepts an explicit room number and rejects collisions', async () => {
    await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'A', type: 'Standard', description: 'd', price: 100, capacity: 2, room_number: '708' })
      .expect(201);
    const clash = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'B', type: 'Standard', description: 'd', price: 100, capacity: 2, room_number: '708' })
      .expect(409);
    expect(clash.body.error).toMatch(/already exists/i);
    const bad = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'C', type: 'Standard', description: 'd', price: 100, capacity: 2, room_number: 'abc' })
      .expect(400);
    expect(bad.body.error).toMatch(/room number/i);
  });

  it('renumbers a room on patch', async () => {
    const room = await makeRoom({ name: 'Move Me', room_number: '902', floor: 9 });
    const res = await request(app)
      .patch(`/api/admin/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ room_number: '1105' })
      .expect(200);
    expect(res.body.room.room_number).toBe('1105');
    expect(res.body.room.floor).toBe(11);
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

  it('stores admin-chosen photos on create and rejects invalid ones', async () => {
    const ok = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Atrium Room', type: 'Deluxe', description: 'd', price: 210, capacity: 2,
        photos: ['/images/rooms/deluxe-king-1.jpg', '/images/uploads/abc-123.png'],
      })
      .expect(201);
    expect(ok.body.room.photos).toEqual(['/images/rooms/deluxe-king-1.jpg', '/images/uploads/abc-123.png']);

    const external = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Evil', type: 'Standard', description: 'd', price: 100, capacity: 2, photos: ['https://evil.example/x.jpg'] })
      .expect(201); // invalid entries are dropped, not accepted
    expect(external.body.room.photos).toEqual([]);

    const tooMany = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Greedy', type: 'Standard', description: 'd', price: 100, capacity: 2,
        photos: ['/images/rooms/a-1.jpg', '/images/rooms/b-1.jpg', '/images/rooms/c-1.jpg'],
      })
      .expect(400);
    expect(tooMany.body.error).toMatch(/up to 2/i);
  });

  it('updates or clears photos on patch', async () => {
    const room = await makeRoom({ name: 'Photo Swap' });
    const set = await request(app)
      .patch(`/api/admin/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ photos: ['/images/rooms/deluxe-terrace-1.jpg'] })
      .expect(200);
    expect(set.body.room.photos).toEqual(['/images/rooms/deluxe-terrace-1.jpg']);

    const clear = await request(app)
      .patch(`/api/admin/rooms/${room._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ photos: [] })
      .expect(200);
    expect(clear.body.room.photos).toEqual([]);
  });

  it('uploads a base64 image (auth required, magic bytes verified)', async () => {
    // 1×1 transparent PNG
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const anon = await request(app).post('/api/admin/upload').send({ image: `data:image/png;base64,${PNG}` }).expect(401);
    expect(anon.body.error).toMatch(/auth/i);

    const ok = await request(app)
      .post('/api/admin/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ image: `data:image/png;base64,${PNG}` })
      .expect(201);
    expect(ok.body.url).toMatch(/^\/images\/uploads\/[a-z0-9-]+\.png$/);

    const badMagic = await request(app)
      .post('/api/admin/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ image: `data:image/png;base64,${Buffer.from('definitely not an image').toString('base64')}` })
      .expect(400);
    expect(badMagic.body.error).toMatch(/magic|content|type/i);
  });

  it('serves an uploaded photo back from GridFS (survives redeploys)', async () => {
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const up = await request(app)
      .post('/api/admin/upload')
      .set('Authorization', `Bearer ${token}`)
      .send({ image: `data:image/png;base64,${PNG}` })
      .expect(201);

    // The photo resolves through the public URL with the right bytes + type.
    const got = await request(app).get(up.body.url).expect(200);
    expect(got.headers['content-type']).toBe('image/png');
    expect(got.body).toEqual(Buffer.from(PNG, 'base64'));
    expect(got.headers['cache-control']).toMatch(/immutable/);

    // And it lives in GridFS (bucket 'uploads'), not on local disk.
    const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
    const name = up.body.url.split('/').pop();
    const docs = await bucket.find({ filename: name }).toArray();
    expect(docs).toHaveLength(1);
    expect(docs[0].contentType).toBe('image/png');
  });

  it('prunes the GridFS file when a room replaces an uploaded photo', async () => {
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const upload = () =>
      request(app)
        .post('/api/admin/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({ image: `data:image/png;base64,${PNG}` })
        .then((r) => r.body.url);
    const bucketNames = async () => {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      return (await bucket.find({}).toArray()).map((f) => f.filename);
    };

    const a = await upload();
    const b = await upload();
    const room = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Photo Room', type: 'Deluxe', description: 'd', price: 200, capacity: 2, photos: [a, b] })
      .expect(201);

    const c = await upload();
    await request(app)
      .patch(`/api/admin/rooms/${room.body.room.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ photos: [a, c] })
      .expect(200);

    const names = await bucketNames();
    expect(names).toContain(a.split('/').pop());
    expect(names).toContain(c.split('/').pop());
    expect(names).not.toContain(b.split('/').pop()); // replaced photo is freed
  });

  it('keeps an upload shared by another room, frees it once unreferenced, and cleans up on room delete', async () => {
    const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const upload = () =>
      request(app)
        .post('/api/admin/upload')
        .set('Authorization', `Bearer ${token}`)
        .send({ image: `data:image/png;base64,${PNG}` })
        .then((r) => r.body.url);
    const bucketNames = async () => {
      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      return (await bucket.find({}).toArray()).map((f) => f.filename);
    };

    const shared = await upload();
    const onlyB = await upload();
    const base = { type: 'Deluxe', description: 'd', price: 200, capacity: 2 };
    const roomA = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Room A', ...base, photos: [shared] })
      .expect(201);
    const roomB = await request(app)
      .post('/api/admin/rooms')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Room B', ...base, photos: [shared, onlyB] })
      .expect(201);

    // Delete room B: the shared photo survives (room A still uses it), onlyB is freed.
    await request(app).delete(`/api/admin/rooms/${roomB.body.room.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    let names = await bucketNames();
    expect(names).toContain(shared.split('/').pop());
    expect(names).not.toContain(onlyB.split('/').pop());

    // Delete room A: the last reference is gone, so the bucket empties.
    await request(app).delete(`/api/admin/rooms/${roomA.body.room.id}`).set('Authorization', `Bearer ${token}`).expect(200);
    names = await bucketNames();
    expect(names).toHaveLength(0);
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
  it('lists payments and returns a chronological timeline', async () => {
    const room = await makeRoom({ name: 'Pay Suite', room_number: '501' });
    const booking = await makeBooking(room._id, { ref: 'WUPAYHIST', payment_status: 'unpaid', total: 300 });
    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payment_status: 'paid', payment_note: 'Cash' })
      .expect(200);

    const res = await request(app)
      .get('/api/admin/payments')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    expect(res.body.events.length).toBeGreaterThanOrEqual(1);
    const first = res.body.events.find((e) => e.ref === 'WUPAYHIST');
    expect(first).toMatchObject({
      action: 'paid',
      by: 'admin',
      total: 300,
      guest_name: 'Jane Doe',
      note: 'Cash',
    });
    expect(first.at).toBeTruthy();
  });

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

  it('marks a pay-on-arrival booking as paid via PATCH', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id, { payment_status: 'unpaid' });

    const res = await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payment_status: 'paid' })
      .expect(200);
    expect(res.body.booking.payment_status).toBe('paid');
    expect(res.body.booking.paid_at).toBeTruthy();
  });

  it('can update status and payment_status together', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id, { status: 'confirmed', payment_status: 'unpaid' });

    const res = await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'checked_in', payment_status: 'paid' })
      .expect(200);
    expect(res.body.booking.status).toBe('checked_in');
    expect(res.body.booking.payment_status).toBe('paid');
  });

  it('returns 400 when PATCH has no valid fields', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id);

    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({})
      .expect(400);
  });

  it('records payment_history when marking a booking paid', async () => {
    const room = await makeRoom();
    const booking = await makeBooking(room._id, { payment_status: 'unpaid' });

    await request(app)
      .patch(`/api/admin/bookings/${booking._id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ payment_status: 'paid', payment_note: 'Collected cash at desk' })
      .expect(200);

    const lookup = await request(app).get(`/api/bookings/${booking.ref}`).expect(200);
    expect(lookup.body.booking.payment_history).toHaveLength(1);
    expect(lookup.body.booking.payment_history[0]).toMatchObject({
      action: 'paid',
      by: 'admin',
      note: 'Collected cash at desk',
    });
    expect(lookup.body.booking.payment_history[0].at).toBeTruthy();
  });
});
