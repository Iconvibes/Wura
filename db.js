'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'hotel.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS rooms (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL,
    type          TEXT NOT NULL,
    description   TEXT NOT NULL,
    price         REAL NOT NULL,
    capacity      INTEGER NOT NULL,
    size_sqm      INTEGER NOT NULL,
    amenities     TEXT NOT NULL DEFAULT '[]',
    art           TEXT NOT NULL,
    status        TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','maintenance')),
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    ref         TEXT NOT NULL UNIQUE,
    room_id     INTEGER NOT NULL REFERENCES rooms(id),
    guest_name  TEXT NOT NULL,
    guest_email TEXT NOT NULL,
    guest_phone TEXT,
    check_in    TEXT NOT NULL,
    check_out   TEXT NOT NULL,
    guests      INTEGER NOT NULL,
    total       REAL NOT NULL,
    status      TEXT NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed','checked_in','checked_out','cancelled')),
    notes       TEXT,
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT NOT NULL UNIQUE,
    salt          TEXT NOT NULL,
    password_hash TEXT NOT NULL
  );
`);

/* ---------------------------------- utils --------------------------------- */

const today = () => new Date().toISOString().slice(0, 10);

function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days)); // timezone-safe
  return dt.toISOString().slice(0, 10);
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, salt, expected) {
  const { hash } = hashPassword(password, salt);
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(expected, 'hex');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ------------------------------ room art (SVG) ----------------------------- */

const PALETTES = [
  { from: '#1c2747', to: '#0a0f20', glow: 'rgba(212,175,55,0.18)' },
  { from: '#2a2140', to: '#0d0a1a', glow: 'rgba(212,175,55,0.16)' },
  { from: '#14333c', to: '#07141a', glow: 'rgba(212,175,55,0.15)' },
  { from: '#33291a', to: '#140f06', glow: 'rgba(212,175,55,0.14)' },
  { from: '#1f3a33', to: '#0a1512', glow: 'rgba(212,175,55,0.16)' },
];

const TYPES = ['Suite', 'Penthouse', 'Deluxe', 'Standard'];

function roomArt(i, type) {
  const p = PALETTES[i % PALETTES.length];
  const variant = TYPES.indexOf(type) >= 0 ? TYPES.indexOf(type) : i % 3;
  const G = '#d4af37';
  const stars = Array.from({ length: 18 }, (_, k) => {
    const x = 30 + ((k * 137.5) % 740);
    const y = 20 + ((k * 61.8) % 280);
    const r = 0.6 + ((k * 7) % 10) / 9;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(255,255,255,${(0.15 + (k % 4) * 0.12).toFixed(2)})"/>`;
  }).join('');

  let art;
  if (variant === 0) {
    // Bedroom scene
    art = `
      <rect x="250" y="240" width="300" height="150" rx="10" fill="none" stroke="${G}" stroke-width="2"/>
      <rect x="272" y="262" width="256" height="40" rx="6" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.4"/>
      <rect x="272" y="262" width="120" height="40" rx="6" fill="rgba(212,175,55,0.16)"/>
      <path d="M250 390 L550 390 L570 430 L230 430 Z" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.6"/>
      <line x1="250" y1="250" x2="250" y2="390" stroke="${G}" stroke-width="2"/>
      <line x1="550" y1="250" x2="550" y2="390" stroke="${G}" stroke-width="2"/>
      <circle cx="208" cy="300" r="26" fill="none" stroke="${G}" stroke-width="1.6"/>
      <path d="M192 300 a16 16 0 0 1 32 0" stroke="rgba(212,175,55,0.8)" stroke-width="1.4" fill="none"/>
      <circle cx="592" cy="300" r="26" fill="none" stroke="${G}" stroke-width="1.6"/>
      <path d="M576 300 a16 16 0 0 1 32 0" stroke="rgba(212,175,55,0.8)" stroke-width="1.4" fill="none"/>
      <ellipse cx="400" cy="468" rx="150" ry="22" fill="rgba(212,175,55,0.08)"/>
    `;
  } else if (variant === 1) {
    // Lounge / seating scene
    art = `
      <rect x="270" y="300" width="260" height="90" rx="14" fill="rgba(212,175,55,0.08)" stroke="${G}" stroke-width="2"/>
      <rect x="296" y="278" width="60" height="40" rx="10" fill="none" stroke="${G}" stroke-width="1.6"/>
      <rect x="444" y="278" width="60" height="40" rx="10" fill="none" stroke="${G}" stroke-width="1.6"/>
      <line x1="270" y1="392" x2="530" y2="392" stroke="${G}" stroke-width="2.4"/>
      <line x1="300" y1="392" x2="300" y2="414" stroke="${G}" stroke-width="1.6"/>
      <line x1="500" y1="392" x2="500" y2="414" stroke="${G}" stroke-width="1.6"/>
      <rect x="356" y="230" width="88" height="120" rx="8" fill="none" stroke="${G}" stroke-width="1.6"/>
      <circle cx="400" cy="250" r="10" fill="rgba(212,175,55,0.7)"/>
      <path d="M360 300 h80" stroke="rgba(212,175,55,0.7)" stroke-width="1.4"/>
      <ellipse cx="400" cy="440" rx="120" ry="16" fill="rgba(212,175,55,0.08)"/>
    `;
  } else {
    // Penthouse: skyline + chandelier
    art = `
      <path d="M180 480 V360 h60 v40 h70 v-80 h60 v80 h70 v-110 h60 v110 h60 v-60 h70 v220 Z" fill="none" stroke="rgba(212,175,55,0.55)" stroke-width="1.4"/>
      <line x1="400" y1="120" x2="400" y2="220" stroke="${G}" stroke-width="1.6"/>
      <line x1="400" y1="220" x2="340" y2="250" stroke="${G}" stroke-width="1.4"/>
      <line x1="400" y1="220" x2="460" y2="250" stroke="${G}" stroke-width="1.4"/>
      <line x1="400" y1="220" x2="400" y2="252" stroke="${G}" stroke-width="1.4"/>
      <circle cx="340" cy="250" r="5" fill="rgba(212,175,55,0.9)"/>
      <circle cx="460" cy="250" r="5" fill="rgba(212,175,55,0.9)"/>
      <circle cx="400" cy="252" r="5" fill="rgba(212,175,55,0.9)"/>
      <rect x="318" y="300" width="164" height="96" rx="8" fill="none" stroke="${G}" stroke-width="1.8"/>
      <rect x="340" y="320" width="60" height="36" rx="4" fill="rgba(212,175,55,0.12)"/>
    `;
  }

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.from}"/>
        <stop offset="1" stop-color="${p.to}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
        <stop offset="0" stop-color="${p.glow}"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="800" height="560" fill="url(#bg)"/>
    <rect width="800" height="560" fill="url(#glow)"/>
    ${stars}
    <text x="40" y="70" font-family="Georgia, serif" font-size="30" fill="rgba(212,175,55,0.85)" letter-spacing="6">W</text>
    <circle cx="400" cy="140" r="4" fill="rgba(212,175,55,0.5)"/>
    <circle cx="392" cy="132" r="2" fill="rgba(255,255,255,0.6)"/>
    <circle cx="408" cy="148" r="1.6" fill="rgba(255,255,255,0.45)"/>
    ${art}
    <rect x="0" y="0" width="800" height="560" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1"/>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

/* ---------------------------------- seed ---------------------------------- */

function seed() {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  if (userCount === 0) {
    const { salt, hash } = hashPassword('admin123');
    db.prepare('INSERT INTO users (username, salt, password_hash) VALUES (?, ?, ?)')
      .run('admin', salt, hash);
    console.log('  seeded admin user (admin / admin123)');
  }

  const roomCount = db.prepare('SELECT COUNT(*) AS n FROM rooms').get().n;
  if (roomCount === 0) {
    const rooms = [
      ['Classic Queen',    'Standard', 129, 2, 26, ['King bed · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'A serene classic room with a plush queen bed, crisp linens and a quiet courtyard outlook.'],
      ['Classic Twin',     'Standard', 139, 2, 26, ['Twin beds · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'Two comfortable single beds in a bright, functional room — perfect for friends or colleagues.'],
      ['Deluxe King',      'Deluxe',   179, 2, 32, ['King bed · 32 m²', 'City view', 'Nespresso', 'Marble bath'], 'A generous room with a signature king bed, floor-to-ceiling windows and a marble bathroom.'],
      ['Deluxe Garden',    'Deluxe',   199, 3, 36, ['King bed + sofa', 'Garden view', 'Nespresso', 'Balcony'], 'Wake to the gardens from your private balcony; sleeps three with a pull-out sofa.'],
      ['Junior Suite',     'Suite',    269, 3, 45, ['King bed + lounge', 'Skyline view', 'Mini-bar', 'Soaking tub'], 'An elegant suite with a separate lounge area, skyline views and a deep soaking tub.'],
      ['Executive Suite',  'Suite',    329, 4, 55, ['King bed + dining', 'Panoramic view', 'Butler on call', 'Walk-in shower'], 'Two-room suite with dining nook and panoramic city views. Butler service on request.'],
      ['Family Suite',     'Suite',    379, 5, 68, ['2 bedrooms · 68 m²', 'Kids welcome', 'Kitchenette', '2 bathrooms'], 'Two linked bedrooms, a kitchenette and two bathrooms — built for family stays.'],
      ['Skyline Suite',    'Suite',    399, 4, 60, ['King bed + study', 'Corner views', 'Espresso bar', 'Soaking tub'], 'A corner suite wrapped in glass with dual-aspect views over the skyline.'],
      ['Presidential',     'Penthouse', 899, 6, 120, ['3 bedrooms', 'Private terrace', 'Chef kitchen', 'Sauna'], 'The full penthouse floor: three bedrooms, a chef kitchen, sauna and private terrace.'],
      ['Royal Villa',      'Penthouse', 1299, 8, 180, ['4 bedrooms', 'Private pool', 'Staff quarters', 'Garden'], 'A standalone villa with its own pool, garden, staff quarters and 4 bedrooms.'],
    ];

    const insert = db.prepare(
      `INSERT INTO rooms (name, type, description, price, capacity, size_sqm, amenities, art)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    );
    rooms.forEach(([name, type, price, capacity, size, amenities, description], i) => {
      insert.run(name, type, description, price, capacity, size, JSON.stringify(amenities), roomArt(i, type));
    });
    console.log(`  seeded ${rooms.length} rooms`);
  }

  const bookingCount = db.prepare('SELECT COUNT(*) AS n FROM bookings').get().n;
  if (bookingCount === 0) {
    const roomIds = db.prepare('SELECT id, price FROM rooms').all();
    const sample = [
      { off: -1, nights: 2, guests: 2, name: 'Amara Okafor',   status: 'checked_in' },
      { off: 0,  nights: 3, guests: 2, name: 'Daniel Meyer',   status: 'confirmed' },
      { off: 1,  nights: 4, guests: 3, name: 'Yuki Tanaka',    status: 'confirmed' },
      { off: 2,  nights: 1, guests: 2, name: 'Priya Sharma',   status: 'confirmed' },
      { off: -4, nights: 3, guests: 4, name: 'Leo Fischer',    status: 'checked_out' },
      { off: -7, nights: 2, guests: 2, name: 'Sofia Mendes',   status: 'checked_out' },
      { off: 5,  nights: 2, guests: 2, name: 'Kwame Asante',   status: 'confirmed' },
      { off: 8,  nights: 6, guests: 5, name: 'Hannah Berg',    status: 'confirmed' },
      { off: -2, nights: 1, guests: 2, name: 'Tom Ellison',    status: 'cancelled' },
      { off: 3,  nights: 2, guests: 2, name: 'Nadia Rahman',   status: 'confirmed' },
    ];
    const insert = db.prepare(
      `INSERT INTO bookings (ref, room_id, guest_name, guest_email, guest_phone, check_in, check_out, guests, total, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    sample.forEach((b, i) => {
      // pick a room that fits the party size (fallback to first available)
      const fits = roomIds.filter((r) => r.capacity >= b.guests);
      const room = fits.length ? fits[i % fits.length] : roomIds[i % roomIds.length];
      const checkIn = addDays(today(), b.off);
      const total = nightsBetween(checkIn, addDays(checkIn, b.nights)) * room.price;
      const ref = `WU${(100000 + i * 7919).toString(36).toUpperCase().slice(0, 6)}`;
      insert.run(ref, room.id, b.name, `${b.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        `+1 555 01${String(100 + i)}`, checkIn, addDays(checkIn, b.nights), b.guests,
        Math.round(total), b.status);
    });
    console.log('  seeded 10 sample bookings');
  }
}

module.exports = {
  db,
  today,
  addDays,
  nightsBetween,
  hashPassword,
  verifyPassword,
  roomArt,
  seed,
};
