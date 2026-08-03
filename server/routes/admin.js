'use strict';

import { Router } from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Room from '../models/Room.js';
import Booking from '../models/Booking.js';
import { roomToJson, bookingToJson, today, addDays } from '../lib.js';
import { requireAuth, signToken } from '../middleware.js';
import { roomArt } from '../roomArt.js';

const router = Router();

// Guard helper: reject malformed ObjectIds with a 404 (not a Mongoose CastError 500).
function validId(id) {
  return mongoose.isValidObjectId(id);
}

/* ------------------------------ POST /login ------------------------------- */
router.post('/login', async (req, res) => {
  const { username, password } = req.body || {};
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

  const recent = await Booking.find()
    .populate('room', 'name type')
    .sort({ created_at: -1 })
    .limit(8)
    .lean();

  res.json({
    stats: {
      totalRooms, activeRooms, arrivals, departures,
      occupancy30: avgOcc, occupancy: occ,
      revenueMonth, revenueTotal, byStatus,
      totalBookings: Object.values(byStatus).reduce((a, b) => a + b, 0),
    },
    recent: recent.map((b) => bookingToJson(b)),
  });
});

/* ------------------------------ GET /bookings ----------------------------- */
router.get('/bookings', async (req, res) => {
  const status = req.query.status;
  const q = status ? { status } : {};
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
