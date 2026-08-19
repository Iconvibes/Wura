'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import {
  app, startTestDB, stopTestDB, clearDB, createAdminUser, resetLoginLimits, makeRoom, makeBooking, bookingPayload, login,
} from './helpers.js';
import request from 'supertest';
import { cancelExpiredUnpaidBookings, ttlMs, shouldRun } from '../cancelUnpaid.js';
import Booking from '../models/Booking.js';
import { today, addDays } from '../lib.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

/* -------------------------------- helpers -------------------------------- */

/** Create a booking via the API and return its doc + room. */
async function apiBooking(overrides = {}) {
  const room = await makeRoom({ price: 100, capacity: 4 });
  const res = await request(app)
    .post('/api/bookings')
    .send(bookingPayload(room._id, overrides))
    .expect(201);
  return { booking: res.body.booking, room };
}

/* ------------------------------------------------------------------------ */
/* cancelExpiredUnpaidBookings                                              */
/* ------------------------------------------------------------------------ */

describe('cancelExpiredUnpaidBookings', () => {
  it('cancels unpaid bookings older than the TTL', async () => {
    const room = await makeRoom({ price: 100 });
    const now = new Date();
    const ttl = ttlMs({ UNPAID_TTL_MINUTES: '30' });
    const old = new Date(now.getTime() - ttl - 60_000); // 31 min ago

    // Create two bookings directly — one old, one fresh.
    const oldBooking = await makeBooking(room._id, {
      created_at: old,
      payment_status: 'unpaid',
      status: 'confirmed',
    });
    const freshBooking = await makeBooking(room._id, {
      ref: 'WUFRESH1',
      created_at: new Date(now.getTime() - 60_000), // 1 min ago
      payment_status: 'unpaid',
      status: 'confirmed',
    });

    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(1);

    const after = await Booking.findById(oldBooking._id).lean();
    expect(after.status).toBe('cancelled');
    expect(after.payment_history).toHaveLength(1);
    expect(after.payment_history[0].action).toBe('auto_cancelled');
    expect(after.payment_history[0].by).toBe('system');
    expect(after.payment_history[0].note).toMatch(/Auto-cancelled/);

    const fresh = await Booking.findById(freshBooking._id).lean();
    expect(fresh.status).toBe('confirmed');
  });

  it('does not cancel already-paid bookings', async () => {
    const room = await makeRoom({ price: 100 });
    const old = new Date(Date.now() - 60 * 60_000); // 1 hour ago

    const booking = await makeBooking(room._id, {
      created_at: old,
      payment_status: 'paid',
      status: 'confirmed',
    });

    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(0);

    const after = await Booking.findById(booking._id).lean();
    expect(after.status).toBe('confirmed');
  });

  it('does not cancel already-cancelled bookings', async () => {
    const room = await makeRoom({ price: 100 });
    const old = new Date(Date.now() - 60 * 60_000);

    const booking = await makeBooking(room._id, {
      created_at: old,
      payment_status: 'unpaid',
      status: 'cancelled',
    });

    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(0);

    const after = await Booking.findById(booking._id).lean();
    expect(after.status).toBe('cancelled');
  });

  it('does not cancel bookings checked in or checked out', async () => {
    const room = await makeRoom({ price: 100 });
    const old = new Date(Date.now() - 60 * 60_000);

    const checkin = await makeBooking(room._id, {
      created_at: old,
      payment_status: 'unpaid',
      status: 'checked_in',
    });

    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(0);

    const after = await Booking.findById(checkin._id).lean();
    expect(after.status).toBe('checked_in');
  });

  it('returns 0 when no bookings match', async () => {
    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(0);
  });

  it('respects the custom TTL', async () => {
    const room = await makeRoom({ price: 100 });

    // Booking is 15 minutes old — within a 30-min TTL but past a 10-min TTL.
    const booking = await makeBooking(room._id, {
      created_at: new Date(Date.now() - 15 * 60_000),
      payment_status: 'unpaid',
      status: 'confirmed',
    });

    // With a 30-min TTL, it should NOT be cancelled.
    let cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(0);

    // With a 10-min TTL, it SHOULD be cancelled.
    cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '10' });
    expect(cancelled).toBe(1);

    const after = await Booking.findById(booking._id).lean();
    expect(after.status).toBe('cancelled');
  });

  it('cancels multiple stale bookings in one sweep', async () => {
    const room = await makeRoom({ price: 100 });
    const old = new Date(Date.now() - 60 * 60_000);

    const b1 = await makeBooking(room._id, {
      created_at: old, payment_status: 'unpaid', status: 'confirmed',
      ref: 'WUOLD01',
    });
    const b2 = await makeBooking(room._id, {
      created_at: old, payment_status: 'unpaid', status: 'confirmed',
      ref: 'WUOLD02',
    });
    const b3 = await makeBooking(room._id, {
      created_at: old, payment_status: 'unpaid', status: 'confirmed',
      ref: 'WUOLD03',
    });

    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(3);

    for (const id of [b1._id, b2._id, b3._id]) {
      const after = await Booking.findById(id).lean();
      expect(after.status).toBe('cancelled');
    }
  });
});

/* ------------------------------------------------------------------------ */
/* TTL & config helpers                                                     */
/* ------------------------------------------------------------------------ */

describe('ttlMs / shouldRun', () => {
  it('defaults to 30 minutes', () => {
    expect(ttlMs({})).toBe(30 * 60_000);
  });

  it('reads UNPAID_TTL_MINUTES', () => {
    expect(ttlMs({ UNPAID_TTL_MINUTES: '15' })).toBe(15 * 60_000);
  });

  it('ignores zero / negative values', () => {
    expect(ttlMs({ UNPAID_TTL_MINUTES: '0' })).toBe(30 * 60_000);
    expect(ttlMs({ UNPAID_TTL_MINUTES: '-5' })).toBe(30 * 60_000);
  });

  it('shouldRun is false by default in test env', () => {
    expect(shouldRun({ NODE_ENV: 'test' })).toBe(false);
  });

  it('shouldRun is true in production', () => {
    expect(shouldRun({ NODE_ENV: 'production' })).toBe(true);
  });

  it('UNPAID_CANCEL=1 overrides env check', () => {
    expect(shouldRun({ UNPAID_CANCEL: '1' })).toBe(true);
  });

  it('UNPAID_CANCEL=0 disables even in production', () => {
    expect(shouldRun({ NODE_ENV: 'production', UNPAID_CANCEL: '0' })).toBe(false);
  });
});

/* ------------------------------------------------------------------------ */
/* Integration: cancelled bookings free the room                            */
/* ------------------------------------------------------------------------ */

describe('cancelled unpaid bookings free the room for rebooking', () => {
  it('a new guest can book the same room after auto-cancellation', async () => {
    const room = await makeRoom({ price: 100 });
    const ci = today();
    const co = addDays(ci, 2);

    // Create an old unpaid booking for that room.
    await makeBooking(room._id, {
      created_at: new Date(Date.now() - 60 * 60_000),
      payment_status: 'unpaid',
      status: 'confirmed',
      check_in: ci,
      check_out: co,
      ref: 'WUOLD04',
    });

    // Auto-cancel it.
    const cancelled = await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });
    expect(cancelled).toBe(1);

    // A new booking for the same room and dates should now succeed.
    const res = await request(app)
      .post('/api/bookings')
      .send(bookingPayload(room._id, { check_in: ci, check_out: co }))
      .expect(201);

    expect(res.body.booking.payment_status).toBe('unpaid');
    expect(res.body.booking.status).toBe('confirmed');
  });
});

/* ------------------------------------------------------------------------ */
/* Admin API: auto-cancelled bookings show in admin view                    */
/* ------------------------------------------------------------------------ */

describe('admin sees auto-cancelled bookings', () => {
  it('cancelled unpaid bookings appear in admin bookings list', async () => {
    await createAdminUser();
    resetLoginLimits();
    const token = await login();
    const room = await makeRoom({ price: 100 });

    const booking = await makeBooking(room._id, {
      created_at: new Date(Date.now() - 60 * 60_000),
      payment_status: 'unpaid',
      status: 'confirmed',
      ref: 'WUADMIN1',
    });

    await cancelExpiredUnpaidBookings({ UNPAID_TTL_MINUTES: '30' });

    const res = await request(app)
      .get('/api/admin/bookings')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const found = res.body.bookings.find((b) => b.id === String(booking._id));
    expect(found).toBeDefined();
    expect(found.status).toBe('cancelled');
    expect(found.payment_history[0].action).toBe('auto_cancelled');
  });
});
