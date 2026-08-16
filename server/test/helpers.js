'use strict';

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../app.js';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { today, addDays } from '../lib.js';
import { __resetRateLimits } from '../middleware.js';
import { __resetLoginLimits } from '../routes/admin.js';

/** The Express app, ready for supertest — no port bound, no DB needed yet. */
export const app = createApp();

let mem;

export async function startTestDB() {
  mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri(), { dbName: 'wura_grand_test' });
}

export async function stopTestDB() {
  await mongoose.disconnect();
  if (mem) await mem.stop();
}

export async function clearDB() {
  const cols = await mongoose.connection.db.collections();
  await Promise.all(cols.map((c) => c.deleteMany({})));
}

/** Fresh token-bucket slate so rate-limit tests are deterministic. */
export function resetRateLimits() {
  __resetRateLimits();
}

/** Fresh login-attempt slate so login rate-limit tests are deterministic. */
export function resetLoginLimits() {
  __resetLoginLimits();
}

/* --------------------------------- fixtures -------------------------------- */

export async function createAdminUser(overrides = {}) {
  const password_hash = await bcrypt.hash('admin123', 4); // low cost = fast tests
  return User.create({ username: 'admin', password_hash, role: 'admin', ...overrides });
}

/** Create a front-desk (staff) user for role-gating tests. */
export async function createStaffUser(overrides = {}) {
  const password_hash = await bcrypt.hash('desk123', 4);
  return User.create({ username: 'desk', password_hash, role: 'staff', ...overrides });
}

/** Login as a specific account and return a JWT. */
export async function loginAs(username, password, accessCode = 'WURA-1962') {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ username, password, access_code: accessCode });
  return res.body.token;
}

/** Login as the seeded admin and return a JWT. */
export async function login(password = 'admin123', accessCode = 'WURA-1962') {
  const res = await request(app)
    .post('/api/admin/login')
    .send({ username: 'admin', password, access_code: accessCode });
  return res.body.token;
}

// Each test DB is wiped between tests, so a global counter never collides.
let testRoomSeq = 9000;

export function makeRoom(overrides = {}) {
  testRoomSeq += 1;
  const doc = {
    name: 'Test Room',
    room_number: String(testRoomSeq),
    floor: Math.floor(testRoomSeq / 100),
    type: 'Deluxe',
    description: 'A comfortable test room.',
    price: 120,
    capacity: 2,
    size_sqm: 30,
    amenities: ['Free WiFi', 'Mini bar'],
    art: 'data:image/svg+xml;base64,PHN2Zy8+',
    ...overrides,
  };
  // Keep floor consistent when a test pins a specific room_number.
  if (doc.floor == null || (overrides.room_number && overrides.floor == null)) {
    doc.floor = /^\d{3,4}$/.test(doc.room_number) ? Math.floor(Number(doc.room_number) / 100) : 0;
  }
  return Room.create(doc);
}

/** A valid booking request body for a room, 2 nights from today by default. */
export function bookingPayload(roomId, overrides = {}) {
  const ci = today();
  return {
    room_id: String(roomId),
    guest_name: 'Jane Doe',
    guest_email: 'jane.doe@example.com',
    guest_phone: '+1 555 000 0000',
    check_in: ci,
    check_out: addDays(ci, 2),
    guests: 2,
    ...overrides,
  };
}

/** Create a booking document directly (bypasses the API). */
export function makeBooking(roomId, overrides = {}) {
  const ci = today();
  const defaults = {
    ref: 'WUT' + Math.random().toString(36).slice(2, 8).toUpperCase(),
    room: roomId,
    guest_name: 'Jane Doe',
    guest_email: 'jane.doe@example.com',
    check_in: ci,
    check_out: addDays(ci, 2),
    guests: 2,
    total: 240,
    status: 'confirmed',
    payment_status: 'unpaid',
  };
  return Booking.create({ ...defaults, ...overrides });
}
