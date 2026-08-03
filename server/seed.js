'use strict';

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDB } from './db.js';
import Room from './models/Room.js';
import Booking from './models/Booking.js';
import User from './models/User.js';
import { roomArt } from './roomArt.js';
import { today, addDays, nightsBetween, newRef } from './lib.js';

const ROOM_SEED = [
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

const BOOKING_SEED = [
  { off: -1, nights: 2, guests: 2, name: 'Amara Okafor', status: 'checked_in' },
  { off: 0,  nights: 3, guests: 2, name: 'Daniel Meyer', status: 'confirmed' },
  { off: 1,  nights: 4, guests: 3, name: 'Yuki Tanaka',  status: 'confirmed' },
  { off: 2,  nights: 1, guests: 2, name: 'Priya Sharma', status: 'confirmed' },
  { off: -4, nights: 3, guests: 4, name: 'Leo Fischer',  status: 'checked_out' },
  { off: -7, nights: 2, guests: 2, name: 'Sofia Mendes', status: 'checked_out' },
  { off: 5,  nights: 2, guests: 2, name: 'Kwame Asante', status: 'confirmed' },
  { off: 8,  nights: 6, guests: 5, name: 'Hannah Berg',  status: 'confirmed' },
  { off: -2, nights: 1, guests: 2, name: 'Tom Ellison',  status: 'cancelled' },
  { off: 3,  nights: 2, guests: 2, name: 'Nadia Rahman', status: 'confirmed' },
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
      });
    });
    await Booking.insertMany(insert);
    console.log(`  seeded ${insert.length} sample bookings`);
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
