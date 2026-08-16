'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB, makeRoom, makeBooking } from './helpers.js';
import { today, addDays } from '../lib.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

describe('GET /api/rooms', () => {
  it('lists active rooms with serialized fields', async () => {
    await makeRoom({ name: 'Classic Queen', price: 129 });
    await makeRoom({ name: 'Royal Villa', price: 1299, status: 'maintenance' });

    const res = await request(app).get('/api/rooms').expect(200);

    expect(res.body.rooms).toHaveLength(1);
    const r = res.body.rooms[0];
    expect(r).toMatchObject({ name: 'Classic Queen', price: 129, status: 'active' });
    expect(r.id).toBeTruthy();
    expect(r.room_number).toBeTruthy();
    expect(r.floor).toBeGreaterThanOrEqual(2);
    expect(r.amenities).toEqual(['Free WiFi', 'Mini bar']);
    expect(res.body.pagination.total).toBe(1);
  });

  it('filters by search across name and description', async () => {
    await makeRoom({ name: 'Skyline Suite', description: 'Corner views over the city' });
    await makeRoom({ name: 'Garden View', description: 'Quiet courtyard outlook' });

    const res = await request(app).get('/api/rooms').query({ search: 'skyline' }).expect(200);
    expect(res.body.rooms.map((r) => r.name)).toEqual(['Skyline Suite']);

    const res2 = await request(app).get('/api/rooms').query({ search: 'courtyard' }).expect(200);
    expect(res2.body.rooms.map((r) => r.name)).toEqual(['Garden View']);
  });

  it('sorts by price descending and capacity ascending', async () => {
    await makeRoom({ name: 'A', price: 100, capacity: 2 });
    await makeRoom({ name: 'B', price: 300, capacity: 4 });
    await makeRoom({ name: 'C', price: 200, capacity: 3 });

    const res = await request(app).get('/api/rooms').query({ sort: 'price', dir: 'desc' }).expect(200);
    expect(res.body.rooms.map((r) => r.price)).toEqual([300, 200, 100]);

    const res2 = await request(app).get('/api/rooms').query({ sort: 'capacity' }).expect(200);
    expect(res2.body.rooms.map((r) => r.capacity)).toEqual([2, 3, 4]);
  });

  it('paginates with page/limit and reports totalPages', async () => {
    for (let i = 0; i < 5; i++) await makeRoom({ name: `Room ${i}`, price: 100 + i });

    const res = await request(app).get('/api/rooms').query({ page: 2, limit: 2 }).expect(200);
    expect(res.body.rooms).toHaveLength(2);
    expect(res.body.pagination).toMatchObject({ page: 2, limit: 2, total: 5, totalPages: 3 });
  });

  it('filters by guest capacity', async () => {
    await makeRoom({ name: 'Twin', capacity: 2 });
    await makeRoom({ name: 'Family', capacity: 5 });

    const res = await request(app).get('/api/rooms').query({ guests: 4 }).expect(200);
    expect(res.body.rooms.map((r) => r.name)).toEqual(['Family']);
  });

  it('excludes rooms with a non-cancelled overlapping booking', async () => {
    const room = await makeRoom({ name: 'Busy Room' });
    await makeBooking(room._id, { check_in: today(), check_out: addDays(today(), 2), status: 'confirmed' });

    // Overlapping dates → room hidden.
    const res = await request(app)
      .get('/api/rooms')
      .query({ checkIn: today(), checkOut: addDays(today(), 3) })
      .expect(200);
    expect(res.body.rooms).toHaveLength(0);

    // Non-overlapping dates → room available again.
    const res2 = await request(app)
      .get('/api/rooms')
      .query({ checkIn: addDays(today(), 5), checkOut: addDays(today(), 7) })
      .expect(200);
    expect(res2.body.rooms.map((r) => r.name)).toEqual(['Busy Room']);
  });

  it('does not let a cancelled booking block availability', async () => {
    const room = await makeRoom({ name: 'Free Again' });
    await makeBooking(room._id, { check_in: today(), check_out: addDays(today(), 2), status: 'cancelled' });

    const res = await request(app)
      .get('/api/rooms')
      .query({ checkIn: today(), checkOut: addDays(today(), 3) })
      .expect(200);
    expect(res.body.rooms.map((r) => r.name)).toEqual(['Free Again']);
  });

  it('returns an empty list for invalid date ranges', async () => {
    await makeRoom({ name: 'Any Room' });
    const res = await request(app)
      .get('/api/rooms')
      .query({ checkIn: 'not-a-date', checkOut: addDays(today(), 3) })
      .expect(200);
    expect(res.body.rooms).toHaveLength(0);
  });
});

describe('GET /api/rooms/:id', () => {
  it('returns a room by id', async () => {
    const room = await makeRoom({ name: 'Lookup Room' });
    const res = await request(app).get(`/api/rooms/${room._id}`).expect(200);
    expect(res.body.room.name).toBe('Lookup Room');
  });

  it('looks a room up by its name slug (SEO-stable URLs)', async () => {
    await makeRoom({ name: 'Deluxe Garden' });
    const res = await request(app).get('/api/rooms/Deluxe%20Garden').expect(200);
    expect(res.body.room.name).toBe('Deluxe Garden');
  });

  it('404s on malformed or unknown ids', async () => {
    await request(app).get('/api/rooms/not-an-id').expect(404);
    await request(app).get('/api/rooms/000000000000000000000000').expect(404);
  });
});
