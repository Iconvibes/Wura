'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, today, addDays, nightsBetween, verifyPassword, seed } = require('./db');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4173;

/* ------------------------ in-memory rate limiter ------------------------- */

// Token-bucket limiter: 5 booking requests per minute per IP.
const LIMIT_RATE = 5;          // max tokens
const LIMIT_WINDOW = 60_000;   // refill period (ms)
const buckets = new Map();

function rateLimit(ip) {
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: LIMIT_RATE - 1, last: now };
    buckets.set(ip, b);
    return true; // allowed
  }
  // Refill: add tokens proportional to elapsed time, capped at LIMIT_RATE.
  const elapsed = now - b.last;
  const refill = Math.floor(elapsed / LIMIT_WINDOW);
  if (refill > 0) {
    b.tokens = Math.min(LIMIT_RATE, b.tokens + refill);
    b.last = now;
  }
  if (b.tokens <= 0) return false;
  b.tokens -= 1;
  return true;
}

// Periodic cleanup of stale buckets every 5 minutes.
setInterval(() => {
  const cutoff = Date.now() - LIMIT_WINDOW * 10;
  for (const [ip, b] of buckets) {
    if (b.last < cutoff) buckets.delete(ip);
  }
}, 300_000);

/* ------------------------ email confirmation stub ------------------------- */

const LOG_DIR = path.join(__dirname, 'data');

/**
 * sendConfirmationEmail — a stub that logs a structured email to the console
 * and appends it to data/emails.log. Swap in nodemailer, SendGrid, or SES
 * when you have credentials.
 */
function sendConfirmationEmail(booking, room) {
  const to = booking.guest_email;
  const subject = `Your booking ${booking.ref} at Wura Grand Hotel is confirmed`;

  const lines = [
    `─── ✦ WURA GRAND HOTEL — Booking Confirmation ✦ ───`,
    `To:          ${to}`,
    `Reference:   ${booking.ref}`,
    `Guest:       ${booking.guest_name}`,
    `Room:        ${room.name} (${room.type})`,
    `Check-in:    ${booking.check_in}`,
    `Check-out:   ${booking.check_out}`,
    `Guests:      ${booking.guests}`,
    `Total:       $${Math.round(booking.total).toLocaleString('en')}`,
    `Status:      ${booking.status}`,
    `Check-in is at 15:00 · Check-out at 11:00.`,
    `Free cancellation up to 48h before arrival.`,
    `Questions?  Reply to this email or call +1 (555) 012-1962.`,
    `───`,
  ];
  const body = lines.join('\n');

  console.log(`\n  ✉ [EMAIL] → ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`${body}\n`);

  // Log to disk for debugging / demo purposes.
  try {
    const ts = new Date().toISOString();
    const logLine = `[${ts}] TO:${to} | REF:${booking.ref} | SUBJECT:${subject}\n${body}\n\n`;
    fs.appendFileSync(path.join(LOG_DIR, 'emails.log'), logLine, 'utf-8');
  } catch { /* ignore write errors */ }
}

seed();

/* --------------------------------- session -------------------------------- */

// In-memory admin sessions: token -> { userId, username, expires }
const sessions = new Map();
const SESSION_TTL = 1000 * 60 * 60 * 12; // 12h

function createSession(userId, username) {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { userId, username, expires: Date.now() + SESSION_TTL });
  return token;
}

function getSession(req) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  const s = sessions.get(token);
  if (!s) return null;
  if (s.expires < Date.now()) { sessions.delete(token); return null; }
  return s;
}

/* --------------------------------- helpers -------------------------------- */

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  });
  res.end(body);
}

function sendError(res, status, message) {
  sendJson(res, status, { error: message });
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (c) => {
      data += c;
      if (data.length > 1e6) reject(new Error('Payload too large'));
    });
    req.on('end', () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error('Invalid JSON body')); }
    });
    req.on('error', reject);
  });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function validDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); // timezone-safe
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

function isOverlapping(aIn, aOut, bIn, bOut) {
  return aIn < bOut && bIn < aOut; // half-open interval [in, out)
}

/* ------------------------------ room availability ------------------------- */

function availableRooms({ checkIn, checkOut }) {
  const active = db.prepare("SELECT * FROM rooms WHERE status = 'active'").all();
  if (!checkIn && !checkOut) return active;

  if (!checkIn || !checkOut) return [];
  if (!validDate(checkIn) || !validDate(checkOut) || checkOut <= checkIn) return [];

  const conflicts = db.prepare(
    `SELECT DISTINCT room_id FROM bookings
     WHERE status != 'cancelled' AND check_in < ? AND check_out > ?`
  ).all(checkOut, checkIn);
  const busy = new Set(conflicts.map((r) => r.room_id));
  return active.filter((r) => !busy.has(r.id));
}

function bookingToJson(b) {
  return { ...b, amenities: JSON.parse(b.amenities) };
}

/* --------------------------------- routing -------------------------------- */

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname } = url;
  const method = req.method;
  const api = pathname.startsWith('/api/');

  try {
    if (api) {
      await routeApi(req, res, method, pathname, url);
      return;
    }
    serveStatic(res, pathname);
  } catch (err) {
    console.error(err);
    if (!res.headersSent) sendError(res, 500, 'Internal server error');
    else res.end();
  }
});

async function routeApi(req, res, method, pathname, url) {
  const parts = pathname.split('/').filter(Boolean); // e.g. ['api','rooms','3']

  /* --- GET /api/rooms?checkIn=&checkOut=&guests=&search=&sort=&page=&limit= --- */
  if (method === 'GET' && parts.length === 2 && parts[1] === 'rooms') {
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');
    const guests = Number(url.searchParams.get('guests') || 0);
    const search = (url.searchParams.get('search') || '').trim();
    const sort = url.searchParams.get('sort') || 'name';    // name | price | capacity
    const sortDir = url.searchParams.get('dir') === 'desc' ? 'DESC' : 'ASC';
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit')) || 20));

    let rooms = availableRooms({ checkIn, checkOut })
      .filter((r) => !guests || r.capacity >= guests)
      .map(bookingToJson);

    // Full-text search on name + description (case-insensitive).
    if (search) {
      const q = search.toLowerCase();
      rooms = rooms.filter((r) =>
        r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q) || r.amenities.some((a) => a.toLowerCase().includes(q))
      );
    }

    // Sort in-memory.
    const sortFns = {
      name: (a, b) => a.name.localeCompare(b.name),
      price: (a, b) => a.price - b.price,
      capacity: (a, b) => a.capacity - b.capacity,
    };
    const cmp = sortFns[sort] || sortFns.name;
    rooms.sort((a, b) => cmp(a, b) * (sortDir === 'DESC' ? -1 : 1));

    // Paginate.
    const total = rooms.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paged = rooms.slice(offset, offset + limit);

    return sendJson(res, 200, {
      rooms: paged,
      pagination: { page, limit, total, totalPages },
    });
  }

  /* --- GET /api/rooms/:id --- */
  if (method === 'GET' && parts.length === 3 && parts[1] === 'rooms') {
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(parts[2]));
    if (!room) return sendError(res, 404, 'Room not found');
    return sendJson(res, 200, { room: bookingToJson(room) });
  }

  /* --- POST /api/bookings --- */
  if (method === 'POST' && parts.length === 2 && parts[1] === 'bookings') {
    // Rate limit: no more than 5 booking requests per minute per IP.
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    if (!rateLimit(clientIp)) {
      return sendError(res, 429, 'Too many booking requests. Please wait a moment before trying again.');
    }

    const body = await readBody(req);
    const { room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, notes } = body;

    if (!validDate(check_in) || !validDate(check_out) || check_out <= check_in)
      return sendError(res, 400, 'Provide valid check-in and check-out dates.');
    if (check_in < today()) return sendError(res, 400, 'Check-in cannot be in the past.');
    if (!guest_name || !guest_email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guest_email))
      return sendError(res, 400, 'A valid name and email are required.');
    if (!Number.isInteger(guests) || guests < 1)
      return sendError(res, 400, 'Guests must be at least 1.');

    const room = db.prepare("SELECT * FROM rooms WHERE id = ? AND status = 'active'").get(Number(room_id));
    if (!room) return sendError(res, 404, 'Room not found or unavailable.');
    if (guests > room.capacity) return sendError(res, 400, `This room sleeps up to ${room.capacity} guests.`);

    // Re-check availability atomically (single-threaded sync DB, no race).
    const conflict = db.prepare(
      `SELECT id FROM bookings
       WHERE room_id = ? AND status != 'cancelled' AND check_in < ? AND check_out > ?`
    ).get(room_id, check_out, check_in);
    if (conflict) return sendError(res, 409, 'Sorry, those dates are no longer available for this room.');

    const total = nightsBetween(check_in, check_out) * room.price;
    let ref;
    do {
      ref = 'WU' + crypto.randomBytes(3).toString('hex').toUpperCase();
    } while (db.prepare('SELECT 1 FROM bookings WHERE ref = ?').get(ref));

    db.prepare(
      `INSERT INTO bookings (ref, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(ref, room.id, guest_name.trim(), guest_email.trim(), (guest_phone || '').trim(),
      check_in, check_out, guests, total, (notes || '').trim() || null);

    const booking = db.prepare('SELECT * FROM bookings WHERE ref = ?').get(ref);

    // Send confirmation email stub.
    sendConfirmationEmail(booking, room);

    return sendJson(res, 201, { booking: { ...booking, room: bookingToJson(room) } });
  }

  /* --- GET /api/bookings/:ref  (guest lookup by reference) --- */
  if (method === 'GET' && parts.length === 3 && parts[1] === 'bookings') {
    const booking = db.prepare(
      `SELECT b.*, r.name AS room_name, r.type AS room_type, r.art AS room_art
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE UPPER(b.ref) = UPPER(?)`
    ).get(parts[2]);
    if (!booking) return sendError(res, 404, 'No booking found with that reference.');
    return sendJson(res, 200, { booking });
  }

  /* --- POST /api/admin/login (no session required) --- */
  if (method === 'POST' && parts.length === 3 && parts[1] === 'admin' && parts[2] === 'login') {
    const body = await readBody(req);
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(String(body.username || '').trim());
    if (!user || !verifyPassword(String(body.password || ''), user.salt, user.password_hash)) {
      return sendError(res, 401, 'Invalid username or password.');
    }
    const token = createSession(user.id, user.username);
    return sendJson(res, 200, { token, user: { username: user.username } });
  }

  /* --- Admin: everything below requires a session --- */
  if (pathname.startsWith('/api/admin')) {
    const session = getSession(req);
    if (!session) return sendError(res, 401, 'Unauthorized. Please sign in.');
    req.session = session;
    return routeAdmin(req, res, method, pathname, url, parts);
  }

  sendError(res, 404, 'Not found');
}

async function routeAdmin(req, res, method, pathname, url, parts) {
  // parts[1] === 'admin'

  /* --- GET /api/admin/front-desk (today's arrivals + departures) --- */
  if (method === 'GET' && parts.length === 3 && parts[2] === 'front-desk') {
    const todayStr = today();
    const arrivals = db.prepare(
      `SELECT b.*, r.name AS room_name, r.type AS room_type, r.art AS room_art
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.check_in = ? AND b.status IN ('confirmed','checked_in')
       ORDER BY b.guest_name ASC`
    ).all(todayStr);
    const departures = db.prepare(
      `SELECT b.*, r.name AS room_name, r.type AS room_type, r.art AS room_art
       FROM bookings b JOIN rooms r ON r.id = b.room_id
       WHERE b.check_out = ? AND b.status IN ('confirmed','checked_in','checked_out')
       ORDER BY b.guest_name ASC`
    ).all(todayStr);
    return sendJson(res, 200, { arrivals, departures, today: todayStr });
  }

  /* --- GET /api/admin/overview --- */
  if (method === 'GET' && parts.length === 3 && parts[2] === 'overview') {
    const todayStr = today();
    const activeRooms = db.prepare("SELECT COUNT(*) AS n FROM rooms WHERE status='active'").get().n;
    const allRooms = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;

    const arrivals = db.prepare(
      `SELECT COUNT(*) AS n FROM bookings WHERE check_in = ? AND status IN ('confirmed','checked_in')`
    ).get(todayStr).n;
    const departures = db.prepare(
      `SELECT COUNT(*) AS n FROM bookings WHERE check_out = ? AND status IN ('confirmed','checked_in')`
    ).get(todayStr).n;

    // Occupancy for the next 30 days
    const occ = [];
    for (let i = 0; i < 30; i++) {
      const day = addDays(todayStr, i);
      const booked = db.prepare(
        `SELECT COUNT(DISTINCT room_id) AS n FROM bookings
         WHERE status != 'cancelled' AND check_in < ? AND check_out > ?`
      ).get(addDays(day, 1), day).n;
      occ.push({ day, pct: activeRooms ? Math.round((booked / activeRooms) * 100) : 0 });
    }
    const avgOcc = Math.round(occ.reduce((s, o) => s + o.pct, 0) / occ.length);

    const month = todayStr.slice(0, 7);
    const revenueMonth = db.prepare(
      `SELECT COALESCE(SUM(total),0) AS s FROM bookings
       WHERE status IN ('confirmed','checked_in','checked_out') AND check_in LIKE ?`
    ).get(`${month}%`).s;
    const revenueTotal = db.prepare(
      `SELECT COALESCE(SUM(total),0) AS s FROM bookings
       WHERE status IN ('confirmed','checked_in','checked_out')`
    ).get().s;

    const byStatus = {};
    for (const s of ['confirmed', 'checked_in', 'checked_out', 'cancelled']) {
      byStatus[s] = db.prepare('SELECT COUNT(*) AS n FROM bookings WHERE status = ?').get(s).n;
    }

    const recent = db.prepare(
      `SELECT b.*, r.name AS room_name FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       ORDER BY b.created_at DESC, b.id DESC LIMIT 8`
    ).all();

    return sendJson(res, 200, {
      stats: {
        totalRooms: allRooms, activeRooms,
        arrivals, departures,
        occupancy30: avgOcc, occupancy: occ,
        revenueMonth: Math.round(revenueMonth), revenueTotal: Math.round(revenueTotal),
        byStatus, totalBookings: Object.values(byStatus).reduce((a, b) => a + b, 0),
      },
      recent: recent.map((r) => ({ ...r })),
    });
  }

  /* --- GET /api/admin/bookings?status= --- */
  if (method === 'GET' && parts.length === 3 && parts[2] === 'bookings') {
    const status = url.searchParams.get('status');
    const rows = db.prepare(
      `SELECT b.*, r.name AS room_name, r.type AS room_type FROM bookings b
       JOIN rooms r ON r.id = b.room_id
       WHERE (? IS NULL OR b.status = ?)
       ORDER BY b.check_in DESC, b.id DESC`
    ).all(status || null, status || null);
    return sendJson(res, 200, { bookings: rows });
  }

  /* --- PATCH /api/admin/bookings/:id  { status } --- */
  if (method === 'PATCH' && parts.length === 4 && parts[2] === 'bookings') {
    const body = await readBody(req);
    const allowed = ['confirmed', 'checked_in', 'checked_out', 'cancelled'];
    if (!allowed.includes(body.status)) return sendError(res, 400, 'Invalid status.');
    const result = db.prepare('UPDATE bookings SET status = ? WHERE id = ?').run(body.status, Number(parts[3]));
    if (!result.changes) return sendError(res, 404, 'Booking not found.');
    const booking = db.prepare('SELECT * FROM bookings WHERE id = ?').get(Number(parts[3]));
    return sendJson(res, 200, { booking });
  }

  /* --- DELETE /api/admin/bookings/:id --- */
  if (method === 'DELETE' && parts.length === 4 && parts[2] === 'bookings') {
    const result = db.prepare('DELETE FROM bookings WHERE id = ?').run(Number(parts[3]));
    if (!result.changes) return sendError(res, 404, 'Booking not found.');
    return sendJson(res, 200, { ok: true });
  }

  /* --- GET /api/admin/rooms (all, incl. maintenance) --- */
  if (method === 'GET' && parts.length === 3 && parts[2] === 'rooms') {
    const rooms = db.prepare('SELECT * FROM rooms ORDER BY id').all().map(bookingToJson);
    return sendJson(res, 200, { rooms });
  }

  /* --- POST /api/admin/rooms --- */
  if (method === 'POST' && parts.length === 3 && parts[2] === 'rooms') {
    const body = await readBody(req);
    const { name, type, description, price, capacity, size_sqm, amenities, status } = body;
    if (!name || !type || !description || !(price > 0) || !(capacity > 0)) {
      return sendError(res, 400, 'Name, type, description, price and capacity are required.');
    }
    const roomCount = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
    const art = body.art || require('./db').roomArt(roomCount, type);
    const result = db.prepare(
      `INSERT INTO rooms (name, type, description, price, capacity, size_sqm, amenities, art, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(name.trim(), type, description.trim(), Number(price), Number(capacity),
      Number(size_sqm) || 30, JSON.stringify(Array.isArray(amenities) ? amenities : []),
      art, status === 'maintenance' ? 'maintenance' : 'active');
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(result.lastInsertRowid));
    return sendJson(res, 201, { room: bookingToJson(room) });
  }

  /* --- PATCH /api/admin/rooms/:id --- */
  if (method === 'PATCH' && parts.length === 4 && parts[2] === 'rooms') {
    const body = await readBody(req);
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(Number(parts[3]));
    if (!room) return sendError(res, 404, 'Room not found.');
    const next = {
      name: body.name ?? room.name,
      type: body.type ?? room.type,
      description: body.description ?? room.description,
      price: body.price ?? room.price,
      capacity: body.capacity ?? room.capacity,
      size_sqm: body.size_sqm ?? room.size_sqm,
      status: body.status ?? room.status,
      amenities: JSON.stringify(Array.isArray(body.amenities) ? body.amenities : JSON.parse(room.amenities)),
    };
    if (!(next.price > 0) || !(next.capacity > 0)) return sendError(res, 400, 'Price and capacity must be positive.');
    db.prepare(
      `UPDATE rooms SET name=?, type=?, description=?, price=?, capacity=?, size_sqm=?, amenities=?, status=?
       WHERE id=?`
    ).run(next.name, next.type, next.description, next.price, next.capacity, next.size_sqm,
      next.amenities, next.status, room.id);
    const updated = db.prepare('SELECT * FROM rooms WHERE id = ?').get(room.id);
    return sendJson(res, 200, { room: bookingToJson(updated) });
  }

  /* --- DELETE /api/admin/rooms/:id --- */
  if (method === 'DELETE' && parts.length === 4 && parts[2] === 'rooms') {
    const future = db.prepare(
      `SELECT COUNT(*) AS n FROM bookings WHERE room_id = ? AND status != 'cancelled' AND check_out >= ?`
    ).get(Number(parts[3]), today()).n;
    if (future) return sendError(res, 409, 'This room has upcoming bookings and cannot be deleted.');
    const result = db.prepare('DELETE FROM rooms WHERE id = ?').run(Number(parts[3]));
    if (!result.changes) return sendError(res, 404, 'Room not found.');
    return sendJson(res, 200, { ok: true });
  }

  /* --- GET /api/admin/me --- */
  if (method === 'GET' && parts.length === 3 && parts[2] === 'me') {
    return sendJson(res, 200, { user: { username: req.session.username } });
  }

  sendError(res, 404, 'Not found');
}

/* ------------------------------ static files ------------------------------ */

function serveStatic(res, pathname) {
  let rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  let filePath = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!filePath.startsWith(PUBLIC_DIR)) return sendError(res, 403, 'Forbidden');

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  if (!fs.existsSync(filePath)) {
    const html = fs.readFileSync(path.join(PUBLIC_DIR, '404.html'));
    res.writeHead(404, { 'Content-Type': MIME['.html'], 'Content-Length': html.length });
    return res.end(html);
  }

  const ext = path.extname(filePath).toLowerCase();
  const content = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': MIME[ext] || 'application/octet-stream',
    'Content-Length': content.length,
  });
  res.end(content);
}

/* -------------------------------- bootstrap ------------------------------- */

const candidates = [PORT, 4174, 4175, 8080, 3000];

function listenOnce(port) {
  return new Promise((resolve, reject) => {
    const onError = (err) => { server.off('listening', onListening); reject(err); };
    const onListening = () => { server.off('error', onError); resolve(port); };
    server.once('error', onError);
    server.once('listening', onListening);
    server.listen(port, '127.0.0.1');
  });
}

(async () => {
  for (const port of candidates) {
    try {
      await listenOnce(port);
      console.log(`\n  ✦ WURA GRAND HOTEL`);
      console.log(`  ➜ Guest site:  http://127.0.0.1:${port}`);
      console.log(`  ➜ Admin panel: http://127.0.0.1:${port}/admin.html  (admin / admin123)\n`);
      return;
    } catch (err) {
      if (err.code !== 'EADDRINUSE') throw err;
      console.log(`  Port ${port} busy, trying next…`);
    }
  }
  console.error('  Could not find a free port. Set PORT env var and retry.');
  process.exit(1);
})();
