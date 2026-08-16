'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { startTestDB, stopTestDB, clearDB } from './helpers.js';
import { seedIfEmpty, assignRoomNumbers, backfillRoomNumbers } from '../seed.js';
import Room from '../models/Room.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(clearDB);

const NUMBER_RE = /^\d{3,4}$/; // 201 … 2003
const VILLA_RE = /^V\d{1,2}$/;

describe('seeded room numbers', () => {
  it('gives all 50 rooms a unique, floor-consistent number', async () => {
    await seedIfEmpty();
    const rooms = await Room.find().lean();
    expect(rooms).toHaveLength(50);

    const numbers = rooms.map((r) => r.room_number);
    expect(new Set(numbers).size).toBe(50); // no duplicates

    const villas = rooms.filter((r) => VILLA_RE.test(r.room_number));
    const numbered = rooms.filter((r) => NUMBER_RE.test(r.room_number));
    expect(villas.length).toBe(3); // Royal Villa, Garden Villa, Royal Villa Garden
    expect(numbered.length).toBe(47);

    for (const r of numbered) {
      const floor = Math.floor(Number(r.room_number) / 100);
      expect(r.floor, `${r.name} floor`).toBe(floor);
      expect(floor).toBeGreaterThanOrEqual(2);
      expect(floor).toBeLessThanOrEqual(20);
    }
    for (const r of villas) {
      expect(r.floor).toBe(0);
    }
  });

  it('keeps floor-named rooms on their named floor (e.g. Deluxe King 12th Floor → 1201)', async () => {
    await seedIfEmpty();
    const byName = new Map((await Room.find().lean()).map((r) => [r.name, r]));
    expect(byName.get('Deluxe King 12th Floor').room_number).toBe('1201');
    expect(byName.get('Deluxe King 12th Floor').floor).toBe(12);
    expect(byName.get('Deluxe King 15th Floor').room_number).toBe('1501');
    expect(byName.get('Penthouse Suite 20th Floor').room_number).toBe('2001');
    expect(byName.get('Classic Queen 2nd Floor').room_number).toBe('201');
    expect(byName.get('Deluxe Garden 2nd Floor').room_number).toBe('202');
    expect(byName.get('Royal Villa').room_number).toBe('V1');
  });

  it('is deterministic — same input, same numbers', () => {
    const input = [
      { name: 'Classic Queen', type: 'Standard' },
      { name: 'Royal Villa', type: 'Penthouse' },
      { name: 'Deluxe King 12th Floor', type: 'Deluxe' },
      { name: 'Skyline Suite', type: 'Suite' },
    ];
    const a = assignRoomNumbers(input);
    const b = assignRoomNumbers(input);
    expect(a.map((r) => r.room_number)).toEqual(b.map((r) => r.room_number));
    expect(a[0].room_number).toBe('201');
    expect(a[1].room_number).toBe('V1');
    expect(a[2].room_number).toBe('1201');
    expect(a[3].room_number).toBe('1001');
  });

  it('backfills rooms that predate room numbers without colliding', async () => {
    await seedIfEmpty();
    // Simulate a room added before the numbering system existed: raw insert
    // bypasses schema validation (required room_number).
    await mongoose.connection.db.collection('rooms').insertOne({
      name: 'Raw Annex Room',
      type: 'Standard',
      description: 'A room from before the numbering system.',
      price: 99,
      capacity: 2,
      size_sqm: 25,
      amenities: [],
      art: 'data:image/svg+xml;base64,PHN2Zy8+',
      status: 'active',
      created_at: new Date(),
      updated_at: new Date(),
    });

    const fixed = await backfillRoomNumbers();
    expect(fixed).toBe(1);

    const rooms = await Room.find().lean();
    const numbers = rooms.map((r) => r.room_number);
    expect(new Set(numbers).size).toBe(numbers.length); // still all unique
    const annex = rooms.find((r) => r.name === 'Raw Annex Room');
    expect(NUMBER_RE.test(annex.room_number)).toBe(true);
  });
});
