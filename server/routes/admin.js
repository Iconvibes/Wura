'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import Message from '../models/Message.js';
import Setting from '../models/Setting.js';
import { roomToJson, bookingToJson, today, addDays } from '../lib.js';
import { requireAuth, signToken } from '../middleware.js';
import { roomArt } from '../roomArt.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Admin-uploaded photography lives in data/uploads (gitignored) and is served
// at /images/uploads by app.js — never committed with the repo.
const UPLOADS_DIR = path.join(__dirname, '..', '..', 'data', 'uploads');

const router = Router();

/* ----------------------- room-number helpers ----------------------------- */
// Floors 2–20 with unit numbers (e.g. 1204 = 12th floor, room 04); standalone
// villas on the grounds are V1, V2, … Numeric numbers encode their floor.
const ROOM_NUMBER_RE = /^\d{3,4}$/; // 201 … 2003
const VILLA_NUMBER_RE = /^V\d{1,2}$/;

export function roomFloorOf(roomNumber) {
  if (ROOM_NUMBER_RE.test(roomNumber)) return Math.floor(Number(roomNumber) / 100);
  return 0; // villas (V1…) and any non-numeric label sit on the grounds
}

/**
 * The next free room number: one past the highest numeric number in the house
 * (so 2003 → 2004). Admin can override by passing an explicit room_number.
 */
async function nextRoomNumber() {
  const rows = await Room.find({ room_number: ROOM_NUMBER_RE }).select('room_number').lean();
  let max = 200; // first floor is 2 → 201 is the lowest real number
  for (const r of rows) max = Math.max(max, Number(r.room_number));
  return String(max + 1);
}

// Room photography: admin rooms may reference the shared seeded pool
// (/images/rooms/…) or their own uploads (/images/uploads/…). Anything else
// (external URLs, traversal, arbitrary paths) is rejected.
const PHOTO_RE = /^\/images\/(rooms\/[a-z0-9-]+\.(jpg|jpeg|png|webp)|uploads\/[a-z0-9-]+\.(jpg|jpeg|png|webp))$/i;

/** Validate an admin-supplied photo list. Returns { photos } or { error }. */
function sanitizePhotos(photos) {
  if (!Array.isArray(photos)) return { photos: null }; // absent → leave untouched
  const clean = [...new Set(photos.map((p) => String(p).trim()).filter((p) => PHOTO_RE.test(p)))];
  if (clean.length > 2) return { error: 'Choose up to 2 photos — the first is the card image.' };
  return { photos: clean };
}

// Staff access code — required on login so the panel is staff-only even if the
// URL leaks. Served from the DB so the admin can rotate it at runtime
// (Settings key 'staff_access_code'); falls back to ADMIN_ACCESS_CODE (env) and
// then the local-dev default. The value is cached in memory and the cache is
// invalidated whenever the code is changed or a test resets the DB.
const SETTING_ACCESS_CODE = 'staff_access_code';
const DEFAULT_ACCESS_CODE = process.env.ADMIN_ACCESS_CODE || 'WURA-1962';
const ACCESS_CODE_MIN = 6;
const ACCESS_CODE_MAX = 64;

let accessCodeCache = null;

async function getAccessCode() {
  if (accessCodeCache !== null) return accessCodeCache;
  const row = await Setting.findOne({ key: SETTING_ACCESS_CODE }).lean();
  accessCodeCache = row?.value || DEFAULT_ACCESS_CODE;
  return accessCodeCache;
}

function invalidateAccessCodeCache() {
  accessCodeCache = null;
}

// Test hook: clear the cache so a fresh DB (cleared between tests) is re-read.
export function __resetAccessCodeCache() {
  invalidateAccessCodeCache();
}

// Recovery secret — lets a locked-out admin rotate the access code with
// deploy-level credentials instead of DB access. Deliberately has NO default:
// the recovery endpoint is disabled unless ADMIN_RESET_SECRET is set (a long
// random value in production). Read lazily so tests can toggle it.
function getResetSecret() {
  return process.env.ADMIN_RESET_SECRET?.trim() || '';
}

/** Constant-time comparison (hash first so unequal lengths are safe). */
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

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
router.post('/verify-code', loginRateLimit, async (req, res, next) => {
  try {
    const { access_code } = req.body || {};
    const current = await getAccessCode();
    if (String(access_code || '') !== current) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

/* ------------------------------ POST /login ------------------------------- */
router.post('/login', loginRateLimit, async (req, res, next) => {
  try {
    const { username, password, access_code } = req.body || {};
    const current = await getAccessCode();
    if (String(access_code || '') !== current) {
      return res.status(401).json({ error: 'Invalid access code.' });
    }
    const user = await User.findOne({ username: String(username || '').trim() }).lean();
    if (!user || !(await bcrypt.compare(String(password || ''), user.password_hash))) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }
    res.json({ token: signToken(user.username), user: { username: user.username } });
  } catch (e) {
    next(e);
  }
});

/* ----------------------- POST /recover-access-code ------------------------- */
// Lockout recovery: rotate the access code using the deploy-level recovery
// secret (ADMIN_RESET_SECRET) instead of the current code — no login, no DB
// access needed. Gated by the same per-IP rate limiter as login so the secret
// can't be brute-forced. Disabled (403) when the env var isn't configured.
router.post('/recover-access-code', loginRateLimit, async (req, res, next) => {
  try {
    const secret = getResetSecret();
    if (!secret) {
      return res.status(403).json({ error: 'Recovery is not configured on this server (ADMIN_RESET_SECRET unset).' });
    }
    const { reset_secret, code } = req.body || {};
    if (!safeEqual(reset_secret || '', secret)) {
      return res.status(401).json({ error: 'Invalid recovery secret.' });
    }
    const nextCode = String(code || '').trim();
    if (nextCode.length < ACCESS_CODE_MIN || nextCode.length > ACCESS_CODE_MAX) {
      return res.status(400).json({ error: `Access code must be ${ACCESS_CODE_MIN}–${ACCESS_CODE_MAX} characters.` });
    }
    const current = await getAccessCode();
    if (nextCode === current) {
      return res.status(400).json({ error: 'New access code must be different from the current one.' });
    }
    await Setting.findOneAndUpdate({ key: SETTING_ACCESS_CODE }, { value: nextCode }, { upsert: true });
    invalidateAccessCodeCache();
    console.log('  🔑 Staff access code reset via recovery secret');
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ---------- everything below requires a valid admin session --------------- */
router.use(requireAuth);

/* --------------------------------- GET /me -------------------------------- */
router.get('/me', (req, res) => {
  res.json({ user: { username: req.user.username } });
});

/* --------------------------- POST /access-code ----------------------------- */
// Rotate the staff access code. Only a signed-in admin can do this; the
// current code must be supplied as proof (so a stolen session alone can't lock
// staff out). Takes effect immediately — the login and verify-code gates read
// the DB-backed value on the next attempt.
router.post('/access-code', async (req, res, next) => {
  try {
    const { current_code, code } = req.body || {};
    const current = await getAccessCode();
    if (String(current_code || '') !== current) {
      return res.status(401).json({ error: 'Current access code is incorrect.' });
    }
    const nextCode = String(code || '').trim();
    if (nextCode.length < ACCESS_CODE_MIN || nextCode.length > ACCESS_CODE_MAX) {
      return res.status(400).json({ error: `Access code must be ${ACCESS_CODE_MIN}–${ACCESS_CODE_MAX} characters.` });
    }
    if (nextCode === current) {
      return res.status(400).json({ error: 'New access code must be different from the current one.' });
    }
    await Setting.findOneAndUpdate({ key: SETTING_ACCESS_CODE }, { value: nextCode }, { upsert: true });
    invalidateAccessCodeCache();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

/* ------------------------------ GET /front-desk --------------------------- */
router.get('/front-desk', async (req, res) => {
  const todayStr = today();
  const [arrivals, departures] = await Promise.all([
    Booking.find({
      check_in: todayStr,
      status: { $in: ['confirmed', 'checked_in'] },
    }).populate('room', 'name room_number floor type art').sort({ guest_name: 1 }).lean(),
    Booking.find({
      check_out: todayStr,
      status: { $in: ['confirmed', 'checked_in', 'checked_out'] },
    }).populate('room', 'name room_number floor type art').sort({ guest_name: 1 }).lean(),
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
    .populate('room', 'name room_number floor type')
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
    .populate('room', 'name room_number floor type')
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
  ).populate('room', 'name room_number floor type').lean();
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

/* ------------------------------ POST /upload ------------------------------ */
// Admin photo upload: accepts a data-URL image (PNG/JPEG/WebP) and stores it
// under data/uploads, served at /images/uploads/…. The larger JSON body limit
// for this route is mounted in app.js before the global 1mb parser.
router.post('/upload', async (req, res) => {
  const { image } = req.body || {};
  if (typeof image !== 'string') {
    return res.status(400).json({ error: 'Provide an image as a data URL.' });
  }
  const m = image.match(/^data:image\/(png|jpe?g|webp);base64,(.+)$/);
  if (!m) return res.status(400).json({ error: 'Unsupported image format — PNG, JPEG or WebP only.' });
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length === 0 || buf.length > 8 * 1024 * 1024) {
    return res.status(400).json({ error: 'Image is empty or larger than 8 MB.' });
  }
  // Verify the magic bytes so a disguised payload can't be stored as an image.
  const ok =
    (ext === 'png' && buf.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') ||
    (ext === 'jpg' && buf.subarray(0, 3).toString('hex') === 'ffd8ff') ||
    (ext === 'webp' && buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP');
  if (!ok) return res.status(400).json({ error: 'File content does not match its declared image type.' });
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
  fs.writeFileSync(path.join(UPLOADS_DIR, name), buf);
  res.status(201).json({ url: `/images/uploads/${name}` });
});

/* ------------------------------- GET /rooms ------------------------------- */
router.get('/rooms', async (req, res) => {
  const rooms = await Room.find().sort({ created_at: 1 }).lean();
  res.json({ rooms: rooms.map(roomToJson) });
});

/* ------------------------------ POST /rooms ------------------------------- */
// Room numbers are the physical identity of a room (e.g. 1204). If the admin
// leaves the number blank, the next free one is assigned automatically.
router.post('/rooms', async (req, res) => {
  const { name, type, description, price, capacity, size_sqm, amenities, status, room_number } = req.body || {};
  if (!name || !type || !description || !(price > 0) || !(capacity > 0)) {
    return res.status(400).json({ error: 'Name, type, description, price and capacity are required.' });
  }
  const number = String(room_number || '').trim();
  if (number && !ROOM_NUMBER_RE.test(number) && !VILLA_NUMBER_RE.test(number)) {
    return res.status(400).json({ error: 'Room number must be like 1204 (floor + unit) or V1 for a villa.' });
  }
  const finalNumber = number || (await nextRoomNumber());
  const exists = await Room.exists({ room_number: finalNumber });
  if (exists) return res.status(409).json({ error: `Room ${finalNumber} already exists.` });

  const ps = sanitizePhotos(req.body?.photos);
  if (ps.error) return res.status(400).json({ error: ps.error });

  const count = await Room.countDocuments();
  const doc = await Room.create({
    name: String(name).trim(),
    room_number: finalNumber,
    floor: roomFloorOf(finalNumber),
    type,
    description: String(description).trim(),
    price: Number(price),
    capacity: Number(capacity),
    size_sqm: Number(size_sqm) || 30,
    amenities: Array.isArray(amenities) ? amenities : [],
    art: roomArt(count, type),
    photos: ps.photos || [],
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
  const ps = sanitizePhotos(b.photos);
  if (ps.error) return res.status(400).json({ error: ps.error });
  const next = {
    name: b.name ?? room.name,
    room_number: b.room_number != null && String(b.room_number).trim() !== '' ? String(b.room_number).trim() : room.room_number,
    type: b.type ?? room.type,
    description: b.description ?? room.description,
    price: b.price ?? room.price,
    capacity: b.capacity ?? room.capacity,
    size_sqm: b.size_sqm ?? room.size_sqm,
    status: b.status ?? room.status,
    amenities: Array.isArray(b.amenities) ? b.amenities : room.amenities,
    photos: ps.photos ?? room.photos,
  };
  if (next.room_number !== room.room_number) {
    if (!ROOM_NUMBER_RE.test(next.room_number) && !VILLA_NUMBER_RE.test(next.room_number)) {
      return res.status(400).json({ error: 'Room number must be like 1204 (floor + unit) or V1 for a villa.' });
    }
    const clash = await Room.exists({ room_number: next.room_number, _id: { $ne: room._id } });
    if (clash) return res.status(409).json({ error: `Room ${next.room_number} already exists.` });
    next.floor = roomFloorOf(next.room_number);
  }
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
