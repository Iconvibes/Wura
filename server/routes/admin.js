'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Message from '../models/Message.js';
import { roomToJson, bookingToJson, today, addDays } from '../lib.js';
import { requireAuth, signToken } from '../middleware.js';
import { roomArt } from '../roomArt.js';

const router = Router();

// Staff access code — required on login so the panel is staff-only even if the
// URL leaks. Override with ADMIN_ACCESS_CODE; the default is the local-dev code.
const ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'WURA-1962';

// Login rate limiter: 10 attempts / 15 min per IP, so the short access code
// can't be brute-forced.
const LOGIN_LIMIT = 10;
const LOGIN_WINDOW = 15 * 60_000;
const loginAttempts = new Map();

function loginRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const row = loginAttempts.get(ip);
  const n = row && now - row.t < LOGIN_WINDOW ? row.n + 1 : 1;
  loginAttempts.set(ip, { n, t: now });
  if (n > LOGIN_LIMIT) {
    return res.status(429).json({ error: 'Too many login attempts. Try again in a few minutes.' });
  }
  next();
}

// Drop stale buckets periodically.
setInterval(() => {
  const cutoff = Date.now() - LOGIN_WINDOW;
  for (const [ip, row] of loginAttempts) {
    if (row.t < cutoff) loginAttempts.delete(ip);
  }
}, LOGIN_WINDOW);

// Test hook: clear login-attempt buckets for deterministic rate-limit tests.
export function __resetLoginLimits() {
  loginAttempts.clear();
}

// Guard helper: reject malformed ObjectIds with a 404 (not a Mongoose CastError 500).
function validId(id) {
  return mongoose.isValidObjectId(id);
}

/* -------------------------- POST /verify-code ------------------------------ */
// Lightweight gate used by the login page's first step: the credential form is
// only revealed after the staff code is accepted. Same rate limiter as login so
// the short code can't be brute-forced. The code is still re-checked on /login
// (defense in depth) — the real credential check never skips it.
router.post('/verify-code', loginRateLimit, (req, res) => {
  const { access_code } = req.body || {};
  if (String(access_code || '') !== ACCESS_CODE) {
    return res.status(401).json({ error: 'Invalid access code.' });
  }
  res.status(204).end();
});

/* ------------------------------ POST /login ------------------------------- */
router.post('/login', loginRateLimit, async (req, res) => {
  const { username, password, access_code } = req.body || {};
  if (String(access_code || '') !== ACCESS_CODE) {
    return res.status(401).json({ error: 'Invalid access code.' });
  }
  const user = await User.findOne({ username: String(username || '').trim() }).lean();
  if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  res.json({ token: signToken(user.username), user: { username: user.username } });
});

/* ---------- everything below requires a valid admin session --------------- */
router.use(requireAuth);

/* --------------------------------- GET /me -------------------------------- */
router.get('/me', (req, res) => {
  res.json({ user: { username: req.user.username } });
});

/* ------------------------------ GET /front-desk --------------------------- */
router.get('/front-desk', async (req, res) => {
  const todayStr = today();
  const [arrivals, departures] = await Promise.all([
    Booking.find({
      check_in: todayStr,
      status: { $in: ['confirmed', 'checked_in'] },
    }).populate('room', 'name type art').sort({ guest_name: 1 }).lean(),
    Booking.find({
      check_out: todayStr,
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
    }).populate('room', 'name type art').sort({ guest_name: 1 }).lean(),
  ]);
  res.json({
    arrivals: arrivals.map(bookingToJson),
    departures: departures.map(bookingToJson),
    today: todayStr,
  });
});

/* -------------------------------- GET /overview --------------------------- */
router.get('/overview', async (req, res) => {
  const todayStr = today();

  const [totalRooms, activeRooms, arrivals, departures] = await Promise.all([
    Room.countDocuments(),
    Room.countDocuments({ status: 'active' }),
    Booking.countDocuments({ check_in: todayStr, status: { $in: ['confirmed', 'checked_in'] } }),
    Booking.countDocuments({ check_out: todayStr, status: { $in: ['confirmed', 'checked_in'] } }),
  ]);

  // Occupancy for the next 30 days (distinct rooms booked per night).
  const occ = [];
  for (let i = 0; i < 30; i++) {
    const day = addDays(todayStr, i);
    const rows = await Booking.find({
      status: { $ne: 'cancelled' },
      check_in: { $lt: addDays(day, 1) },
      check_out: { $gt: day },
    }).distinct('room');
    occ.push({ day, pct: activeRooms ? Math.round((rows.length / activeRooms) * 100) : 0 });
  }
  const avgOcc = Math.round(occ.reduce((s, o) => s + o.pct, 0) / occ.length);

  // Revenue: bookings that have started (or are in-house/out) this month.
  const month = todayStr.slice(0, 7);
  const revenueRows = await Booking.find({
    status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
  }).select('total check_in').lean();
  const revenueMonth = Math.round(revenueRows.filter((b) => b.check_in.startsWith(month)).reduce((s, b) => s + b.total, 0));
  const revenueTotal = Math.round(revenueRows.reduce((s, b) => s + b.total, 0));

  const byStatus = {};
  const counts = await Booking.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]);
  for (const s of ['confirmed', 'checked_in', 'checked_out', 'cancelled']) byStatus[s] = 0;
  counts.forEach((c) => { byStatus[c._id] = c.n; });

  // Room-type mix (denormalised via lookup) + payment split + in-house count.
  const byType = {};
  const typeRows = await Booking.aggregate([
    { $lookup: { from: 'rooms', localField: 'room', foreignField: '_id', as: 'r' } },
    { $unwind: { path: '$r', preserveNullAndEmptyArrays: true } },
    { $group: { _id: '$r.type', n: { $sum: 1 } } },
  ]);
  typeRows.forEach((t) => { if (t._id) byType[t._id] = t.n; });

  const byPayment = { paid: 0, unpaid: 0 };
  const payRows = await Booking.aggregate([{ $group: { _id: '$payment_status', n: { $sum: 1 } } }]);
  payRows.forEach((p) => { if (p._id) byPayment[p._id] = p.n; });

  // Per-day revenue outlook for the next 30 days (aligned with occupancy):
  // totals of non-cancelled bookings checking in on each day.
  const revenueSeries = occ.map((o) => ({
    day: o.day,
    amount: revenueRows.filter((b) => b.check_in === o.day).reduce((s, b) => s + b.total, 0),
  }));

  const recent = await Booking.find()
    .populate('room', 'name type')
    .sort({ created_at: -1 })
    .limit(8)
    .lean();

  res.json({
    stats: {
      totalRooms, activeRooms, arrivals, departures,
      occupancy30: avgOcc, occupancy: occ,
      revenueMonth, revenueTotal, revenueSeries, byStatus, byType, byPayment,
      inHouse: byStatus.checked_in || 0,
      totalBookings: Object.values(byStatus).reduce((a, b) => a + b, 0),
    },
    recent: recent.map((b) => bookingToJson(b)),
  });
});

/* ------------------------------ GET /bookings ----------------------------- */
router.get('/bookings', async (req, res) => {
  const status = req.query.status;
  const payment = req.query.payment;
  const q = {};
  if (status) q.status = status;
  if (payment === 'paid' || payment === 'unpaid') q.payment_status = payment;
  const rows = await Booking.find(q)
    .populate('room', 'name type')
    .sort({ check_in: -1, created_at: -1 })
    .lean();
  res.json({ bookings: rows.map(bookingToJson) });
});

/* ------------------------- PATCH /bookings/:id ---------------------------- */
router.patch('/bookings/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Booking not found.' });
  const allowed = ['confirmed', 'checked_in', 'checked_out', 'cancelled'];
  if (!allowed.includes(req.body?.status)) return res.status(400).json({ error: 'Invalid status.' });
  const booking = await Booking.findByIdAndUpdate(
    req.params.id,
    { status: req.body.status },
    { new: true }
  ).populate('room', 'name type').lean();
  if (!booking) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ booking: bookingToJson(booking) });
});

/* -------------------------- DELETE /bookings/:id -------------------------- */
router.delete('/bookings/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Booking not found.' });
  const result = await Booking.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ error: 'Booking not found.' });
  res.json({ ok: true });
});

/* ------------------------------ GET /messages ----------------------------- */
router.get('/messages', async (req, res) => {
  const messages = await Message.find()
    .sort({ created_at: -1 })
    .select('-__v')
    .lean();
  res.json({
    messages: messages.map((m) => ({
      ...m,
      id: String(m._id),
      read: Boolean(m.read),
      sent_at: m.sent_at ? m.sent_at.toISOString() : null,
      created_at: m.created_at.toISOString(),
    })),
    unread: messages.filter((m) => !m.read).length,
  });
});

/* ------------------------- POST /messages/read-all ------------------------- */
// Defined before the /:id routes so 'read-all' is never captured as an id.
router.post('/messages/read-all', async (req, res) => {
  await Message.updateMany({ read: false }, { $set: { read: true } });
  res.json({ ok: true });
});

/* -------------------------- PATCH /messages/:id ---------------------------- */
// Toggle read state: { read: true | false }. Returns the updated row.
router.patch('/messages/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Message not found.' });
  if (typeof req.body?.read !== 'boolean') {
    return res.status(400).json({ error: 'Provide read: true or false.' });
  }
  const message = await Message.findByIdAndUpdate(req.params.id, { read: req.body.read }, { new: true }).lean();
  if (!message) return res.status(404).json({ error: 'Message not found.' });
  res.json({ message: { ...message, id: String(message._id), read: Boolean(message.read) } });
});

/* -------------------------- DELETE /messages/:id --------------------------- */
router.delete('/messages/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Message not found.' });
  const result = await Message.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ error: 'Message not found.' });
  res.json({ ok: true });
});

/* ------------------------------- GET /rooms ------------------------------- */
router.get('/rooms', async (req, res) => {
  const rooms = await Room.find().sort({ created_at: 1 }).lean();
  res.json({ rooms: rooms.map(roomToJson) });
});

/* ------------------------------ POST /rooms ------------------------------- */
router.post('/rooms', async (req, res) => {
  const { name, type, description, price, capacity, size_sqm, amenities, status } = req.body || {};
  if (!name || !type || !description || !(price > 0) || !(capacity > 0)) {
    return res.status(400).json({ error: 'Name, type, description, price and capacity are required.' });
  }
  const count = await Room.countDocuments();
  const doc = await Room.create({
    name: String(name).trim(),
    type,
    description: String(description).trim(),
    price: Number(price),
    capacity: Number(capacity),
    size_sqm: Number(size_sqm) || 30,
    amenities: Array.isArray(amenities) ? amenities : [],
    art: roomArt(count, type),
    status: status === 'maintenance' ? 'maintenance' : 'active',
  });
  res.status(201).json({ room: roomToJson(doc) });
});

/* ---------------------------- PATCH /rooms/:id ---------------------------- */
router.patch('/rooms/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Room not found.' });
  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ error: 'Room not found.' });
  const b = req.body || {};
  const next = {
    name: b.name ?? room.name,
    type: b.type ?? room.type,
    description: b.description ?? room.description,
    price: b.price ?? room.price,
    capacity: b.capacity ?? room.capacity,
    size_sqm: b.size_sqm ?? room.size_sqm,
    status: b.status ?? room.status,
    amenities: Array.isArray(b.amenities) ? b.amenities : room.amenities,
  };
  if (!(next.price > 0) || !(next.capacity > 0)) {
    return res.status(400).json({ error: 'Price and capacity must be positive.' });
  }
  Object.assign(room, next);
  await room.save();
  res.json({ room: roomToJson(room) });
});

/* --------------------------- DELETE /rooms/:id ---------------------------- */
router.delete('/rooms/:id', async (req, res) => {
  if (!validId(req.params.id)) return res.status(404).json({ error: 'Room not found.' });
  const future = await Booking.countDocuments({
    room: req.params.id,
    status: { $ne: 'cancelled' },
    check_out: { $gte: today() },
  });
  if (future) return res.status(409).json({ error: 'This room has upcoming bookings and cannot be deleted.' });
  const result = await Room.findByIdAndDelete(req.params.id);
  if (!result) return res.status(404).json({ error: 'Room not found.' });
  res.json({ ok: true });
});

export default router;
