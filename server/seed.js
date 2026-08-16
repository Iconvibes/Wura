'use strict';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDB } from './db.js';
import Room from './models/Room.js';
import Booking from './models/Booking.js';
import Message from './models/Message.js';
import User from './models/User.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_FILE = path.join(__dirname, '..', 'data', 'emails.log');
import { roomArt } from './roomArt.js';
import { today, addDays, nightsBetween, newRef } from './lib.js';

// 50 rooms across five tiers — a fixed inventory, like a real hotel: the
// admin adds a room when one is built, not every week. The house has hosted
// the city since 1962; each floor has its own character.
const ROOM_SEED = [
  ['Classic Queen',        'Standard', 129, 2, 26, ['Queen bed · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'A serene classic room with a plush queen bed, crisp linens and a quiet courtyard outlook.'],
  ['Classic Twin',         'Standard', 139, 2, 26, ['Twin beds · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'Two comfortable single beds in a bright, functional room — perfect for friends or colleagues.'],
  ['Classic Queen Garden', 'Standard', 149, 2, 28, ['Queen bed · 28 m²', 'Garden view', 'Free Wi-Fi', 'Rain shower'], 'A courtyard-facing classic with a queen bed and a view over the jacaranda garden.'],
  ['Classic Twin Garden',  'Standard', 159, 2, 28, ['Twin beds · 28 m²', 'Garden view', 'Free Wi-Fi', 'Rain shower'], 'Twin beds and a garden outlook — quiet, bright and perfectly positioned for the pool.'],
  ['Accessible King',      'Standard', 139, 2, 30, ['King bed · 30 m²', 'Wheelchair accessible', 'Walk-in shower', 'Emergency pull cord'], 'A step-free ground-floor room with a king bed, wide doorways and a roll-in shower.'],
  ['Deluxe King',          'Deluxe',   179, 2, 32, ['King bed · 32 m²', 'City view', 'Nespresso', 'Marble bath'], 'A generous room with a signature king bed, floor-to-ceiling windows and a marble bathroom.'],
  ['Deluxe Garden',        'Deluxe',   199, 3, 36, ['King bed + sofa', 'Garden view', 'Nespresso', 'Balcony'], 'Wake to the gardens from your private balcony; sleeps three with a pull-out sofa.'],
  ['Deluxe King Skyline',  'Deluxe',   219, 2, 34, ['King bed · 34 m²', 'Skyline view', 'Nespresso', 'Marble bath'], 'The Deluxe King, lifted to the 18th floor for a sweeping skyline panorama.'],
  ['Deluxe Terrace',       'Deluxe',   239, 3, 38, ['King bed + sofa', 'Private terrace', 'Nespresso', 'Marble bath'], 'A high-floor deluxe with its own terrace, morning sun and a two-seater breakfast nook.'],
  ['Junior Suite',         'Suite',    269, 3, 45, ['King bed + lounge', 'Skyline view', 'Mini-bar', 'Soaking tub'], 'An elegant suite with a separate lounge area, skyline views and a deep soaking tub.'],
  ['Deluxe Suite',         'Suite',    299, 3, 48, ['King bed + lounge', 'Corner view', 'Mini-bar', 'Soaking tub'], 'A corner suite with twin-aspect windows, a lounge nook and a freestanding tub.'],
  ['Executive Suite',      'Suite',    329, 4, 55, ['King bed + dining', 'Panoramic view', 'Butler on call', 'Walk-in shower'], 'Two-room suite with dining nook and panoramic city views. Butler service on request.'],
  ['Family Suite',         'Suite',    379, 5, 68, ['2 bedrooms · 68 m²', 'Kids welcome', 'Kitchenette', '2 bathrooms'], 'Two linked bedrooms, a kitchenette and two bathrooms — built for family stays.'],
  ['Skyline Suite',        'Suite',    399, 4, 60, ['King bed + study', 'Corner views', 'Espresso bar', 'Soaking tub'], 'A corner suite wrapped in glass with dual-aspect views over the skyline.'],
  ['Ambassador Suite',     'Suite',    449, 4, 72, ['King bed + study', 'Skyline corner', 'Butler on call', 'Soaking tub'], 'A signature corner suite with a study, dining for six and floor-to-ceiling glass.'],
  ['Presidential',         'Penthouse', 899, 6, 120, ['3 bedrooms', 'Private terrace', 'Chef kitchen', 'Sauna'], 'The full penthouse floor: three bedrooms, a chef kitchen, sauna and private terrace.'],
  ['Skyline Penthouse',    'Penthouse', 999, 6, 130, ['3 bedrooms', 'Wrap-around terrace', 'Chef kitchen', 'Butler service'], 'The north tower crown: three bedrooms and a wrap-around terrace above the city.'],
  ['Royal Villa',          'Penthouse', 1299, 8, 180, ['4 bedrooms', 'Private pool', 'Staff quarters', 'Garden'], 'A standalone villa with its own pool, garden, staff quarters and 4 bedrooms.'],
  ['Garden Villa',         'Penthouse', 1099, 6, 160, ['3 bedrooms', 'Garden pool', 'Kitchen', 'Garden'], 'A standalone garden villa with its own plunge pool and a shaded dining pavilion.'],
  ['Heritage Suite',       'Suite',    349, 3, 50, ['King bed + study', 'Original panelling', 'Fireplace', 'Soaking tub'], 'A restored 1962 original with walnut panelling, a working fireplace and the hotel’s history in its walls.'],
  ['Studio Loft',          'Deluxe',   189, 2, 35, ['Loft king bed', 'Mezzanine lounge', 'Kitchenette', 'Skyline view'], 'An open loft with a mezzanine lounge and kitchenette — city living above the canopy.'],
  ['Garden Cottage',       'Deluxe',   229, 3, 44, ['King bed + sofa', 'Private garden', 'Kitchenette', 'Fireplace'], 'A freestanding cottage on the garden lawn with its own terrace and fireplace.'],
  ['Family King',          'Standard', 169, 4, 40, ['King bed + bunks', 'Kids welcome', 'Free Wi-Fi', 'Rain shower'], 'A king bed plus two bunks and a soft seating corner — built for families of four.'],
  ['Penthouse Studio',     'Penthouse', 749, 4, 85, ['King bed + lounge', 'Corner views', 'Kitchenette', 'Soaking tub'], 'A full-floor studio with corner glass, a lounge and a kitchenette for long stays.'],
  // — the remaining floors —
  ['Classic Queen Courtyard', 'Standard', 149, 2, 27, ['Queen bed · 27 m²', 'Courtyard view', 'Free Wi-Fi', 'Rain shower'], 'A quiet courtyard-facing classic on the second floor, one floor above the garden rooms.'],
  ['Classic Queen 2nd Floor', 'Standard', 135, 2, 26, ['Queen bed · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'The original 1962 guesthouse layout, preserved on the second floor with modern linen and a rain shower.'],
  ['Classic Twin 3rd Floor',  'Standard', 145, 2, 26, ['Twin beds · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'Twin beds on the third floor with tall windows over the avenue.'],
  ['Classic Twin 4th Floor',  'Standard', 145, 2, 26, ['Twin beds · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'A bright fourth-floor twin — the quietest corridor in the house.'],
  ['Family King Garden',      'Standard', 179, 4, 42, ['King bed + bunks', 'Garden view', 'Kids welcome', 'Rain shower'], 'The Family King, lifted to the garden side with a view over the jacaranda lawn.'],
  ['Deluxe King Corner',      'Deluxe',   229, 2, 36, ['King bed · 36 m²', 'Dual-aspect corner', 'Nespresso', 'Marble bath'], 'A corner Deluxe with windows on two sides and city views both ways.'],
  ['Deluxe King 12th Floor',  'Deluxe',   189, 2, 32, ['King bed · 32 m²', 'City view', 'Nespresso', 'Marble bath'], 'The classic Deluxe King, twelve floors up with a straight run of city skyline.'],
  ['Deluxe Garden 2nd Floor', 'Deluxe',   205, 3, 36, ['King bed + sofa', 'Garden view', 'Nespresso', 'Balcony'], 'A garden-facing deluxe on the second floor with a breakfast balcony.'],
  ['Deluxe Terrace Skyline',  'Deluxe',   259, 3, 40, ['King bed + sofa', 'Skyline terrace', 'Nespresso', 'Marble bath'], 'The high-floor terrace room with sunset views over the whole city.'],
  ['Junior Loft',             'Deluxe',   189, 2, 38, ['Loft king bed', 'Mezzanine lounge', 'Kitchenette', 'Skyline view'], 'An open loft on the 15th floor with a mezzanine reading nook and skyline views.'],
  ['Junior Suite City View',  'Suite',    279, 3, 46, ['King bed + lounge', 'City view', 'Mini-bar', 'Soaking tub'], 'A junior suite with a lounge, city views and a deep soaking tub.'],
  ['Deluxe Suite Skyline',    'Suite',    319, 3, 50, ['King bed + lounge', 'Skyline view', 'Mini-bar', 'Soaking tub'], 'A corner deluxe suite with a skyline-facing lounge and a freestanding tub.'],
  ['Executive Suite Corner',  'Suite',    349, 4, 58, ['King bed + dining', 'Corner views', 'Butler on call', 'Walk-in shower'], 'An executive suite in the corner tower with dining for four and dual-aspect glass.'],
  ['Family Suite Garden',     'Suite',    389, 5, 70, ['2 bedrooms · 70 m²', 'Garden view', 'Kitchenette', '2 bathrooms'], 'The family suite on the garden side — two bedrooms, a kitchenette and lawn views.'],
  ['Ambassador Suite Skyline', 'Suite',   469, 4, 76, ['King bed + study', 'Skyline corner', 'Butler on call', 'Soaking tub'], 'An ambassador suite on the top residential floor with skyline corner views.'],
  ['Heritage Garden Suite',   'Suite',    359, 3, 52, ['King bed + study', 'Garden view', 'Original panelling', 'Fireplace'], 'A restored garden-side original with walnut panelling and its own fireplace.'],
  ['Skyline Penthouse East',  'Penthouse', 1049, 6, 135, ['3 bedrooms', 'East terrace', 'Chef kitchen', 'Butler service'], 'The east crown: three bedrooms and a sunrise terrace above the city.'],
  ['Royal Villa Garden',      'Penthouse', 1149, 8, 175, ['4 bedrooms', 'Private pool', 'Staff quarters', 'Garden'], 'A second standalone villa, set deeper in the gardens with its own pool and pavilion.'],
  ['Observatory Penthouse',   'Penthouse', 1399, 6, 150, ['3 bedrooms', '360° glass salon', 'Chef kitchen', 'Private lift'], 'The house’s crowning residence: a glass salon with a full 360° view, reached by private lift.'],
  ['Penthouse Studio City',   'Penthouse', 779, 4, 90, ['King bed + lounge', 'Skyline views', 'Kitchenette', 'Soaking tub'], 'A full-floor studio on the city side with a lounge and a skyline-soaking tub.'],
  ['Presidential Reserve',    'Penthouse', 949, 6, 125, ['3 bedrooms', 'Private terrace', 'Chef kitchen', 'Sauna'], 'A second presidential floor, furnished for long-stay guests with a full chef kitchen.'],
  ['Classic Queen 5th Floor',  'Standard', 135, 2, 26, ['Queen bed · 26 m²', 'Free Wi-Fi', 'Smart TV', 'Rain shower'], 'Another of the original 1962 layouts, on the quiet fifth floor.'],
  ['Deluxe King 15th Floor',   'Deluxe',   195, 2, 32, ['King bed · 32 m²', 'Skyline view', 'Nespresso', 'Marble bath'], 'The Deluxe King at the top of the tower with uninterrupted skyline views.'],
  ['Junior Suite 7th Floor',   'Suite',    285, 3, 46, ['King bed + lounge', 'City view', 'Mini-bar', 'Soaking tub'], 'A junior suite on the seventh floor with a lounge and city views.'],
  ['Penthouse Suite 20th Floor', 'Penthouse', 829, 4, 95, ['King bed + lounge', 'Skyline views', 'Kitchenette', 'Soaking tub'], 'A full-floor penthouse suite with corner glass on the 20th floor.'],
  ['Skyline Penthouse West',   'Penthouse', 1049, 6, 135, ['3 bedrooms', 'West terrace', 'Chef kitchen', 'Butler service'], 'The west crown: three bedrooms and a sunset terrace above the city.'],
];

// 44 bookings across a 30-day window — arrivals and departures most days,
// a couple of in-house guests, a couple of no-shows/cancellations. This is
// what a 50-room house looks like mid-season.
const BOOKING_SEED = [
  { off: -1, nights: 2, guests: 2, name: 'Amara Okafor', status: 'checked_in',  paid: true },
  { off: 0,  nights: 3, guests: 2, name: 'Daniel Meyer', status: 'confirmed',  paid: false }, // pays at the desk — demos the Unpaid badge
  { off: 1,  nights: 4, guests: 3, name: 'Yuki Tanaka',  status: 'confirmed',  paid: true },
  { off: 2,  nights: 1, guests: 2, name: 'Priya Sharma', status: 'confirmed',  paid: true },
  { off: -4, nights: 3, guests: 4, name: 'Leo Fischer',  status: 'checked_out', paid: true },
  { off: -7, nights: 2, guests: 2, name: 'Sofia Mendes', status: 'checked_out', paid: true },
  { off: 5,  nights: 2, guests: 2, name: 'Kwame Asante', status: 'confirmed',  paid: false },
  { off: 8,  nights: 6, guests: 5, name: 'Hannah Berg',  status: 'confirmed',  paid: true },
  { off: -2, nights: 1, guests: 2, name: 'Tom Ellison',  status: 'cancelled',   paid: false },
  { off: 3,  nights: 2, guests: 2, name: 'Nadia Rahman', status: 'confirmed',  paid: true },
  // — the wider house —
  { off: 0,  nights: 2, guests: 2, name: 'Elena Petrova', status: 'confirmed',  paid: true },
  { off: 0,  nights: 1, guests: 1, name: 'Marcus Cole',   status: 'confirmed',  paid: true },
  { off: 1,  nights: 3, guests: 2, name: 'Isabelle Moreau', status: 'confirmed', paid: true },
  { off: 1,  nights: 2, guests: 1, name: 'Kenji Watanabe', status: 'confirmed', paid: false },
  { off: 2,  nights: 2, guests: 2, name: 'Aisha Bello',   status: 'confirmed',  paid: true },
  { off: 2,  nights: 4, guests: 4, name: 'The Okafor family', status: 'confirmed', paid: true },
  { off: 3,  nights: 2, guests: 3, name: 'Lucas Meyer',   status: 'confirmed',  paid: true },
  { off: 4,  nights: 3, guests: 2, name: 'Chidi Eze',     status: 'confirmed',  paid: true },
  { off: 5,  nights: 2, guests: 3, name: 'Rosa Delgado',  status: 'confirmed',  paid: true },
  { off: 6,  nights: 4, guests: 2, name: 'Jonas Lindqvist', status: 'confirmed', paid: true },
  { off: 6,  nights: 2, guests: 2, name: 'Mina Hassan',   status: 'confirmed',  paid: false },
  { off: 7,  nights: 3, guests: 4, name: 'Bruno Ferrari', status: 'confirmed',  paid: true },
  { off: 9,  nights: 2, guests: 2, name: 'Adaeze Umeh',   status: 'confirmed',  paid: true },
  { off: 10, nights: 5, guests: 6, name: 'The Bellini wedding', status: 'confirmed', paid: true },
  { off: 11, nights: 2, guests: 2, name: 'Sarah O’Connor', status: 'confirmed', paid: true },
  { off: 12, nights: 3, guests: 2, name: 'Viktor Lind',   status: 'confirmed',  paid: false },
  { off: 13, nights: 2, guests: 3, name: 'Ngozi Ade',     status: 'confirmed',  paid: true },
  { off: 15, nights: 4, guests: 2, name: 'Ethan Walsh',   status: 'confirmed',  paid: true },
  { off: 16, nights: 2, guests: 4, name: 'Layla Rahman',  status: 'confirmed',  paid: true },
  { off: -5, nights: 2, guests: 2, name: 'Peter King',    status: 'cancelled',   paid: false },
  { off: 4,  nights: 1, guests: 2, name: 'Gina Costa',    status: 'confirmed',  paid: true },
  { off: 7,  nights: 2, guests: 1, name: 'Tom Bennett',   status: 'confirmed',  paid: true },
  // — the full house —
  { off: 0,  nights: 2, guests: 2, name: 'Clara Nwosu',   status: 'confirmed',  paid: true },
  { off: 1,  nights: 1, guests: 2, name: 'Diego Ramos',   status: 'confirmed',  paid: true },
  { off: 2,  nights: 3, guests: 2, name: 'Anya Novak',    status: 'confirmed',  paid: true },
  { off: 3,  nights: 2, guests: 3, name: 'Samuel Achebe', status: 'confirmed',  paid: true },
  { off: 4,  nights: 2, guests: 2, name: 'Freya Hall',    status: 'confirmed',  paid: true },
  { off: 5,  nights: 3, guests: 2, name: 'Omar Farouk',   status: 'confirmed',  paid: false },
  { off: 6,  nights: 1, guests: 2, name: 'Ingrid Solberg', status: 'confirmed', paid: true },
  { off: 8,  nights: 2, guests: 2, name: 'Dami Balogun',  status: 'confirmed',  paid: true },
  { off: 9,  nights: 3, guests: 3, name: 'The Vale wedding', status: 'confirmed', paid: true },
  { off: 10, nights: 2, guests: 2, name: 'Petra Kovač',   status: 'confirmed',  paid: true },
  { off: 11, nights: 1, guests: 2, name: 'James Carter',  status: 'confirmed',  paid: true },
  { off: 12, nights: 4, guests: 4, name: 'The Adeyemi family', status: 'confirmed', paid: true },
];

export async function seedIfEmpty() {
  const userCount = await User.countDocuments();
  if (userCount === 0) {
    const password_hash = await bcrypt.hash('admin123', 10);
    await User.create({ username: 'admin', password_hash });
    console.log('  seeded admin user (admin / admin123)');
  }

  const roomCount = await Room.countDocuments();
  if (roomCount === 0) {
    const docs = ROOM_SEED.map(([name, type, price, capacity, size, amenities, description], i) => ({
      name, type, description, price, capacity, size_sqm: size, amenities, art: roomArt(i, type),
    }));
    await Room.insertMany(docs);
    console.log(`  seeded ${docs.length} rooms`);
  }

  const bookingCount = await Booking.countDocuments();
  if (bookingCount === 0) {
    const rooms = await Room.find().select('_id price capacity').lean();
    const insert = [];
    BOOKING_SEED.forEach((b, i) => {
      // pick a room that fits the party size (fallback to first available)
      const fits = rooms.filter((r) => r.capacity >= b.guests);
      const room = fits.length ? fits[i % fits.length] : rooms[i % rooms.length];
      const checkIn = addDays(today(), b.off);
      const total = nightsBetween(checkIn, addDays(checkIn, b.nights)) * room.price;
      insert.push({
        ref: newRef(),
        room: room._id,
        guest_name: b.name,
        guest_email: `${b.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        guest_phone: `+1 555 01${String(100 + i)}`,
        check_in: checkIn,
        check_out: addDays(checkIn, b.nights),
        guests: b.guests,
        total: Math.round(total),
        status: b.status,
        payment_status: b.paid ? 'paid' : 'unpaid',
        paid_at: b.paid ? new Date() : null,
      });
    });
    await Booking.insertMany(insert);
    console.log(`  seeded ${insert.length} sample bookings`);
  }

  const messageCount = await Message.countDocuments();
  if (messageCount === 0) {
    await seedMessages();
  }
}

/* ------------------------------ contact inbox ------------------------------ */

const DEMO_MESSAGES = [
  {
    name: 'Grace Oyelaran',
    email: 'grace@example.com',
    subject: 'Group & events',
    message: 'Wedding block for 20 rooms in October — could we hold the rooftop for the reception?',
  },
  {
    name: 'Daniel Meyer',
    email: 'daniel@example.com',
    subject: 'Reservation enquiry',
    message: 'I left my watch in the gym — could you check lost property? Thanks!',
  },
  {
    name: 'Fatima Al-Rashid',
    email: 'fatima@example.com',
    subject: 'Spa booking',
    message: 'Do you offer couples hammam sessions, and how far ahead should we book?',
  },
  {
    name: 'Marco Bellini',
    email: 'marco@example.com',
    subject: 'Long stay',
    message: 'Corporate rate for a 6-week stay in the Executive Suite, please.',
  },
];

/** Parse guest enquiries out of the legacy data/emails.log into structured rows. */
export function parseContactLog(text) {
  const rows = [];
  // One contact entry: timestamp header line + a --- ✦ WURA GRAND HOTEL block.
  const re = /\[(\d{4}-\d{2}-\d{2}T[^\]]+)\] TO:[^|]+\| SUBJECT:[^\n]*\n─── ✦ WURA GRAND HOTEL — Contact Form ✦ ───\nFrom:\s+([^\n]+)\nEmail:\s+([^\n]+)\nSubject:\s+([^\n]*)\nMessage:\n([\s\S]*?)\n───\n?\n?/g;
  let m;
  while ((m = re.exec(text))) {
    const [, ts, name, email, subject, message] = m;
    const body = message.replace(/^\s+|\s+$/g, '');
    if (name && email && body) {
      rows.push({ name: name.trim(), email: email.trim(), subject: subject.trim() || 'Enquiry', message: body, ts });
    }
  }
  return rows;
}

/**
 * Import guest enquiries from data/emails.log (the pre-inbox archive) into the
 * Message collection so the admin inbox starts populated. Runs only when the
 * collection is empty: new enquiries are dual-written to the log AND Mongo, so
 * the DB is already complete once the collection is non-empty.
 */
export async function seedMessages() {
  let imported = 0;
  try {
    if (fs.existsSync(LOG_FILE)) {
      const rows = parseContactLog(fs.readFileSync(LOG_FILE, 'utf-8'));
      if (rows.length) {
        await Message.insertMany(
          rows.map((r) => ({
            name: r.name,
            email: r.email,
            subject: r.subject,
            message: r.message,
            sent_at: new Date(r.ts),
          }))
        );
        imported = rows.length;
      }
    }
  } catch {
    imported = 0; // never block boot on a log-read problem
  }

  if (imported === 0) {
    await Message.insertMany(
      DEMO_MESSAGES.map((d, i) => ({
        ...d,
        // Stagger so the inbox shows a natural spread; the oldest stays unread.
        read: i === 0,
        sent_at: new Date(Date.now() - (DEMO_MESSAGES.length - i) * 36e5),
      }))
    );
    console.log(`  seeded ${DEMO_MESSAGES.length} sample messages`);
  } else {
    console.log(`  imported ${imported} contact messages from data/emails.log`);
  }
}

export async function seed() {
  const { mem } = await connectDB();
  try {
    await seedIfEmpty();
  } finally {
    await mongoose.disconnect();
    if (mem) await mem.stop();
  }
  console.log('  seed complete');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed().catch((e) => { console.error(e); process.exit(1); });
}
