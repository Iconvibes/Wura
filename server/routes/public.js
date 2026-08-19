'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { roomToJson, bookingToJson, validDate, today, nightsBetween, newRef } from '../lib.js';
import { rateLimit } from '../middleware.js';
import { saveContactMessage } from '../email.js';

const router = Router();

/* --------------------- contact-form rate limiter --------------------------- */
// Guest enquiries are a classic spam vector: 5 messages / 10 min per IP.
const CONTACT_LIMIT = 5;
const CONTACT_WINDOW = 10 * 60_000;
const contactBuckets = new Map();

function contactRateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const b = contactBuckets.get(ip) || { n: 0, t: now };
  if (now - b.t > CONTACT_WINDOW) {
    b.n = 0;
    b.t = now;
  }
  b.n += 1;
  contactBuckets.set(ip, b);
  if (b.n > CONTACT_LIMIT) {
    return res.status(429).json({ error: 'Too many messages. Please try again in a few minutes.' });
  }
  next();
}

// Test hook: clear contact buckets for deterministic rate-limit tests.
export function __resetContactLimits() {
  contactBuckets.clear();
}

/* ---------------------------- GET /api/rooms ------------------------------ */
// ?checkIn=&checkOut=&guests=&search=&sort=&dir=&page=&limit=
router.get('/rooms', async (req, res) => {
  const { checkIn, checkOut } = req.query;
  const guests = Number(req.query.guests || 0);
  const search = String(req.query.search || '').trim();
  const sort = req.query.sort || 'name';      // name | price | capacity
  const sortDir = req.query.dir === 'desc' ? -1 : 1;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));

  // Base set: active rooms (or empty when only one date edge is provided)
  let rooms = await Room.find({ status: 'active' }).lean();

  if (checkIn || checkOut) {
    const both = checkIn && checkOut;
    const ok = both && validDate(checkIn) && validDate(checkOut) && checkOut > checkIn;
    if (!ok) rooms = [];
    else {
      // Rooms that have a non-cancelled booking overlapping [checkIn, checkOut)
      const busyRows = await Booking.find({
        status: { $ne: 'cancelled' },
        check_in: { $lt: checkOut },
        check_out: { $gt: checkIn },
      }).select('room').lean();
      const busy = new Set(busyRows.map((b) => String(b.room)));
      rooms = rooms.filter((r) => !busy.has(String(r._id)));
    }
  }

  if (guests > 0) rooms = rooms.filter((r) => r.capacity >= guests);

  // Full-text search on name + description + type + amenities.
  if (search) {
    const q = search.toLowerCase();
    rooms = rooms.filter((r) =>
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q) ||
      (r.amenities || []).some((a) => a.toLowerCase().includes(q))
    );
  }

  // Sort.
  const sortFns = {
    name: (a, b) => a.name.localeCompare(b.name),
    price: (a, b) => a.price - b.price,
    capacity: (a, b) => a.capacity - b.capacity,
  };
  const cmp = sortFns[sort] || sortFns.name;
  rooms.sort((a, b) => cmp(a, b) * sortDir);

  // Paginate.
  const total = rooms.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const offset = (page - 1) * limit;
  const paged = rooms.slice(offset, offset + limit);

  res.json({ rooms: paged.map(roomToJson), pagination: { page, limit, total, totalPages } });
});

/* ------------------------------ GET /api/rooms/:id ------------------------ */
// Accepts an ObjectId OR a stable name slug (SEO-friendly room URLs — names
// survive reseeds, ObjectIds do not).
router.get('/rooms/:id', async (req, res) => {
  let room = null;
  if (mongoose.isValidObjectId(req.params.id)) {
    room = await Room.findById(req.params.id).lean();
  }
  if (!room) {
    room = await Room.findOne({ name: decodeURIComponent(req.params.id) }).lean();
  }
  if (!room) return res.status(404).json({ error: 'Room not found' });
  res.json({ room: roomToJson(room) });
});

/* ------------------------------ POST /api/bookings ------------------------ */
// Book a room — pay on arrival at the front desk. No online payment.
router.post('/bookings', rateLimit, async (req, res) => {
  const { room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, notes } = req.body || {};

  if (!validDate(check_in) || !validDate(check_out) || check_out <= check_in)
    return res.status(400).json({ error: 'Provide valid check-in and check-out dates.' });
  if (check_in < today()) return res.status(400).json({ error: 'Check-in cannot be in the past.' });
  if (!guest_name || !guest_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email))
    return res.status(400).json({ error: 'A valid name and email are required.' });
  if (!Number.isInteger(guests) || guests < 1)
    return res.status(400).json({ error: 'Guests must be at least 1.' });

  if (!mongoose.isValidObjectId(room_id))
    return res.status(404).json({ error: 'Room not found or unavailable.' });
  const room = await Room.findOne({ _id: room_id, status: 'active' }).lean();
  if (!room) return res.status(404).json({ error: 'Room not found or unavailable.' });
  if (guests > room.capacity) return res.status(400).json({ error: `This room sleeps up to ${room.capacity} guests.` });

  // Re-check availability (conflict window check).
  const conflict = await Booking.findOne({
    room: room._id,
    status: { $ne: 'cancelled' },
    check_in: { $lt: check_out },
    check_out: { $gt: check_in },
  }).lean();
  if (conflict) return res.status(409).json({ error: 'Sorry, those dates are no longer available for this room.' });

  const total = nightsBetween(check_in, check_out) * room.price;
  let ref, existing;
  do {
    ref = newRef();
    existing = await Booking.exists({ ref });
  } while (existing);

  const doc = await Booking.create({
    ref,
    room: room._id,
    guest_name: String(guest_name).trim(),
    guest_email: String(guest_email).trim(),
    guest_phone: String(guest_phone || '').trim(),
    check_in,
    check_out,
    guests,
    total,
    notes: String(notes || '').trim(),
    status: 'confirmed',
    payment_status: 'unpaid',
  });

  const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';
  const booking = {
    ...doc.toObject(),
    room_id: String(room._id),
    room_name: room.name,
    room_number: room.room_number,
    room_floor: room.floor,
    room_type: room.type,
    room_art: room.art,
  };
  const checkout_url = `${CLIENT_ORIGIN}/booking/success?ref=${encodeURIComponent(doc.ref)}`;
  res.status(201).json({ booking: bookingToJson(booking), checkout_url });
});

/* ------------------------------ POST /api/contact ------------------------- */
// Honeypot: a hidden field humans never see. Bots auto-fill every input, so a
// filled honeypot is a reliable spam signal. We answer 200 { ok: true } without
// storing anything — a bot that gets a failure learns its trick is detected.
// `website` is the classic name; `company` catches scrapers filling every field.
const HONEYPOT_FIELDS = ['website', 'company'];

// Bots submit instantly; humans take at least ~1.5s to read and type. Submissions
// faster than this are silently dropped (same 200-OK ruse).
const MIN_HUMAN_MS = 1500;

router.post('/contact', contactRateLimit, async (req, res) => {
  const { name, email, subject, message } = req.body || {};

  // Honeypot tripped → pretend success, store nothing.
  if (HONEYPOT_FIELDS.some((f) => String(req.body?.[f] || '').trim() !== '')) {
    return res.json({ ok: true });
  }

  // Submitted faster than a human can type → same silent drop.
  const started = Number(req.body?.started_at || 0);
  if (started && Date.now() - started < MIN_HUMAN_MS) {
    return res.json({ ok: true });
  }

  const cleanName = String(name || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanSubject = String(subject || '').trim();
  const cleanMessage = String(message || '').trim();

  if (!cleanName || !cleanEmail || !cleanMessage) {
    return res.status(400).json({ error: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return res.status(400).json({ error: 'Please provide a valid email address.' });
  }
  if (cleanMessage.length > 4000 || cleanName.length > 100 || cleanEmail.length > 200) {
    return res.status(400).json({ error: 'Message is too long.' });
  }

  await saveContactMessage({ name: cleanName, email: cleanEmail, subject: cleanSubject, message: cleanMessage });
  res.json({ ok: true });
});

/* ---------------------------- GET /api/bookings/:ref ---------------------- */
router.get('/bookings/:ref', async (req, res) => {
  const raw = req.params.ref;
  // Escape regex metacharacters so a crafted ref can't widen the match.
  const ref = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const booking = await Booking.findOne({ ref: { $regex: `^${ref}$`, $options: 'i' } })
    .populate('room', 'name room_number floor type art')
    .lean();
  if (!booking) return res.status(404).json({ error: 'No booking found with that reference.' });
  res.json({ booking: bookingToJson(booking) });
});

export default router;
