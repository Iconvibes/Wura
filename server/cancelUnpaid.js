'use strict';

/*
 * Auto-cancel unpaid bookings.
 *
 * Bookings that are created but never paid (payment_status === 'unpaid') are
 * automatically cancelled after a configurable time-to-live so they don't hold
 * rooms indefinitely. The sweep runs on a periodic interval; each tick finds
 * stale unpaid confirmed bookings and marks them cancelled with a system note.
 *
 * Behaviour:
 *   - Default TTL is 30 minutes (UNPAID_TTL_MINUTES env).
 *   - Sweep interval is 5 minutes (UNPAID_SWEEP_INTERVAL_MIN env).
 *   - Enabled by default in production; opt-in/out with UNPAID_CANCEL=1/0.
 *   - The interval timer is unref'd so it never keeps the process alive.
 */

import mongoose from 'mongoose';
import Booking from './models/Booking.js';

const DEFAULT_TTL_MIN = 30;
const DEFAULT_SWEEP_MIN = 5;

/** Time-to-live in milliseconds for unpaid bookings. */
export function ttlMs(env = process.env) {
  const n = Number(env.UNPAID_TTL_MINUTES);
  const min = Number.isFinite(n) && n > 0 ? n : DEFAULT_TTL_MIN;
  return Math.round(min * 60 * 1000);
}

/** Sweep interval in milliseconds. */
export function sweepIntervalMs(env = process.env) {
  const n = Number(env.UNPAID_SWEEP_INTERVAL_MIN);
  const min = Number.isFinite(n) && n > 0 ? n : DEFAULT_SWEEP_MIN;
  return Math.round(min * 60 * 1000);
}

/** Should the sweeper run? Prod by default; opt-in/out with UNPAID_CANCEL. */
export function shouldRun(env = process.env) {
  const k = String(env.UNPAID_CANCEL ?? '').toLowerCase();
  if (k === '0' || k === 'false') return false;
  if (k === '1' || k === 'true') return true;
  return env.NODE_ENV === 'production';
}

/**
 * Find and cancel all unpaid bookings older than the TTL.
 * Returns the number of bookings cancelled.
 */
export async function cancelExpiredUnpaidBookings(env = process.env) {
  const cutoff = new Date(Date.now() - ttlMs(env));
  const ttlMinutes = Math.round(ttlMs(env) / 60_000);

  // Find candidates first so we can update each individually — we need to push
  // a payment_history entry with the booking's own context.
  const stale = await Booking.find({
    payment_status: 'unpaid',
    status: 'confirmed',
    created_at: { $lte: cutoff },
  }).lean();

  if (stale.length === 0) return 0;

  const now = new Date();
  const bulkOps = stale.map((b) => ({
    updateOne: {
      filter: { _id: b._id },
      update: {
        $set: { status: 'cancelled' },
        $push: {
          payment_history: {
            action: 'auto_cancelled',
            by: 'system',
            at: now,
            note: `Auto-cancelled: payment not received within ${ttlMinutes} minutes`,
          },
        },
      },
    },
  }));

  await Booking.bulkWrite(bulkOps);
  return stale.length;
}

/**
 * Sweep function: cancel expired unpaid bookings and log results.
 * Designed to be called on an interval.
 */
async function sweep(env = process.env) {
  try {
    // Only run if connected to a database.
    const state = mongoose.connection.readyState;
    if (state !== 1) return;

    const n = await cancelExpiredUnpaidBookings(env);
    if (n > 0) {
      console.log(`  ⏰ auto-cancelled ${n} unpaid booking${n > 1 ? 's' : ''} (TTL ${Math.round(ttlMs(env) / 60_000)} min)`);
    }
  } catch (e) {
    console.warn(`  ⚠ unpaid-booking sweep failed: ${e.message}`);
  }
}

let sweepTimer = null;

/**
 * Start the periodic sweep. No-ops when disabled.
 * Returns info about what was started.
 */
export function startUnpaidSweeper(env = process.env) {
  if (!shouldRun(env)) {
    return { started: false, reason: 'disabled' };
  }

  const ms = sweepIntervalMs(env);
  const ttl = ttlMs(env);

  // Run once shortly after boot to catch any stale bookings from before the
  // restart, then on the interval.
  const first = setTimeout(() => sweep(env), 15_000);
  sweepTimer = setInterval(() => sweep(env), ms);
  first.unref?.();
  sweepTimer.unref?.();

  console.log(`  ➜ Auto-cancel: unpaid bookings expire after ${Math.round(ttl / 60_000)} min, swept every ${ms / 60_000} min`);
  return { started: true, ttlMin: Math.round(ttl / 60_000), intervalMin: ms / 60_000 };
}

/** Stop the sweeper (for tests or graceful shutdown). */
export function stopUnpaidSweeper() {
  if (sweepTimer) {
    clearInterval(sweepTimer);
    sweepTimer = null;
  }
}
