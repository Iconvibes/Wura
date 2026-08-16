import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { ROOM_PHOTOS_BY_NAME, ROOM_PHOTOS, roomPhoto, roomPhotos, roomSlug, roomCardImage, imgSrcset, IMG_RESP_WIDTHS, HERO_IMAGE } from './photos.jsx';

// A PNG data URL stands in for an admin upload path (uploaded files are served
// from /images/uploads/…; the helper only cares about the array itself).
const UPLOADED = ['/images/uploads/a-1.png', '/images/uploads/a-2.png'];

// The 50 seeded rooms (server/seed.js) — every one must own its photography.
const SEEDED_ROOM_NAMES = [
  'Classic Queen', 'Classic Twin', 'Classic Queen Garden', 'Classic Twin Garden', 'Accessible King',
  'Deluxe King', 'Deluxe Garden', 'Deluxe King Skyline', 'Deluxe Terrace',
  'Junior Suite', 'Deluxe Suite', 'Executive Suite', 'Family Suite', 'Skyline Suite',
  'Ambassador Suite', 'Presidential', 'Skyline Penthouse', 'Royal Villa', 'Garden Villa',
  'Heritage Suite', 'Studio Loft', 'Garden Cottage', 'Family King', 'Penthouse Studio',
  'Classic Queen Courtyard', 'Classic Queen 2nd Floor', 'Classic Twin 3rd Floor', 'Classic Twin 4th Floor',
  'Family King Garden', 'Deluxe King Corner', 'Deluxe King 12th Floor', 'Deluxe Garden 2nd Floor',
  'Deluxe Terrace Skyline', 'Junior Loft', 'Junior Suite City View', 'Deluxe Suite Skyline',
  'Executive Suite Corner', 'Family Suite Garden', 'Ambassador Suite Skyline', 'Heritage Garden Suite',
  'Skyline Penthouse East', 'Royal Villa Garden', 'Observatory Penthouse', 'Penthouse Studio City',
  'Presidential Reserve', 'Classic Queen 5th Floor', 'Deluxe King 15th Floor', 'Junior Suite 7th Floor',
  'Penthouse Suite 20th Floor', 'Skyline Penthouse West',
];

// vitest runs with cwd = client/ (the Vite root), so public/ is on disk here.
const PUBLIC = path.resolve(process.cwd(), 'public');

describe('room photography', () => {
  it('gives every seeded room its own photo pool (50 rooms, no sharing)', () => {
    expect(Object.keys(ROOM_PHOTOS_BY_NAME).length).toBe(50);
    expect(ROOM_PHOTOS_BY_NAME).toMatchObject(Object.fromEntries(SEEDED_ROOM_NAMES.map((n) => [n, expect.any(Array)])));
  });

  it('never reuses a photo across rooms', () => {
    const seen = new Map(); // photo path -> room name
    for (const [name, pool] of Object.entries(ROOM_PHOTOS_BY_NAME)) {
      expect(pool.length).toBeGreaterThanOrEqual(2);
      for (const src of pool) {
        if (seen.has(src)) {
          throw new Error(`photo ${src} is shared by "${seen.get(src)}" and "${name}"`);
        }
        seen.set(src, name);
      }
    }
    // Every hero (card) photo is unique too.
    const heroes = Object.values(ROOM_PHOTOS_BY_NAME).map((pool) => pool[0]);
    expect(new Set(heroes).size).toBe(50);
  });

  it('references only files that exist on disk', () => {
    const all = [
      ...Object.values(ROOM_PHOTOS_BY_NAME).flat(),
      ...Object.values(ROOM_PHOTOS),
    ];
    for (const src of all) {
      const file = path.join(PUBLIC, src.replace(/^\/images\//, 'images/'));
      expect(fs.existsSync(file), `${src} should exist`).toBe(true);
    }
  });

  it('picks a room\'s own hero and gallery', () => {
    const room = { name: 'Observatory Penthouse', type: 'Penthouse' };
    expect(roomPhoto(room)).toBe(ROOM_PHOTOS_BY_NAME['Observatory Penthouse'][0]);
    expect(roomPhotos(room)).toEqual(ROOM_PHOTOS_BY_NAME['Observatory Penthouse']);
  });

  it('lets admin-chosen photos override the pool (and fall back without them)', () => {
    const room = { name: 'Brand New Suite', type: 'Suite', photos: UPLOADED };
    expect(roomPhoto(room)).toBe(UPLOADED[0]);
    expect(roomPhotos(room)).toEqual(UPLOADED);

    // A photo-less admin room falls back to its type image, not a crash.
    const plain = { name: 'Brand New Suite', type: 'Suite' };
    expect(roomPhoto(plain)).toBe(ROOM_PHOTOS.Suite);
    expect(roomPhotos(plain)[0]).toBe(ROOM_PHOTOS.Suite);
  });

  it('uses the branded card only for seeded rooms, else the room photo (no 404 card)', () => {
    const seeded = { name: 'Deluxe Garden' };
    expect(roomCardImage(seeded)).toBe('/social/rooms/deluxe-garden.png');
    const newRoom = { name: 'Brand New Suite', type: 'Suite', photos: UPLOADED };
    expect(roomCardImage(newRoom)).toBe(UPLOADED[0]);
    const noPhotos = { name: 'Another New Room', type: 'Standard' };
    expect(roomCardImage(noPhotos)).toBe(ROOM_PHOTOS.Standard);
  });

  it('every room has a matching branded social card on disk', () => {
    for (const name of Object.keys(ROOM_PHOTOS_BY_NAME)) {
      const file = path.join(PUBLIC, 'social', 'rooms', `${roomSlug(name)}.png`);
      expect(fs.existsSync(file), `${roomCardImage({ name })} should exist — rerun npm run generate:social`).toBe(true);
    }
  });
});

describe('responsive variants (srcset)', () => {
  it('emits one candidate per generated width, same dir under /resp/', () => {
    expect(imgSrcset('/images/rooms/classic-queen-1.jpg')).toBe(
      '/images/rooms/resp/classic-queen-1-480.jpg 480w, /images/rooms/resp/classic-queen-1-800.jpg 800w, /images/rooms/resp/classic-queen-1-1200.jpg 1200w'
    );
    expect(imgSrcset('/images/hero.jpg')).toBe(
      '/images/resp/hero-480.jpg 480w, /images/resp/hero-800.jpg 800w, /images/resp/hero-1200.jpg 1200w'
    );
  });

  it('emits avif/webp candidates for the same widths when asked', () => {
    expect(imgSrcset('/images/rooms/classic-queen-1.jpg', 'avif')).toBe(
      '/images/rooms/resp/classic-queen-1-480.avif 480w, /images/rooms/resp/classic-queen-1-800.avif 800w, /images/rooms/resp/classic-queen-1-1200.avif 1200w'
    );
    expect(imgSrcset('/images/rooms/classic-queen-1.jpg', 'webp')).toBe(
      '/images/rooms/resp/classic-queen-1-480.webp 480w, /images/rooms/resp/classic-queen-1-800.webp 800w, /images/rooms/resp/classic-queen-1-1200.webp 1200w'
    );
    // Unknown formats fall back to jpg; uploads stay null in every format.
    expect(imgSrcset('/images/rooms/classic-queen-1.jpg', 'png')).toBe(imgSrcset('/images/rooms/classic-queen-1.jpg'));
    expect(imgSrcset('/images/uploads/photo.jpg', 'avif')).toBeNull();
  });

  it('returns null where no variants exist (uploads, non-jpeg, foreign paths)', () => {
    expect(imgSrcset('/images/uploads/logo.png')).toBeNull();
    expect(imgSrcset('/images/uploads/photo.jpg')).toBeNull();
    expect(imgSrcset('/social/rooms/deluxe-garden.png')).toBeNull();
    expect(imgSrcset('https://example.com/x.jpg')).toBeNull();
    expect(imgSrcset(null)).toBeNull();
  });

  it('every photo the SPA renders has its variants on disk in all 3 codecs (rerun npm run generate:images)', () => {
    const all = [
      HERO_IMAGE,
      ...Object.values(ROOM_PHOTOS_BY_NAME).flat(),
      ...Object.values(ROOM_PHOTOS),
    ];
    const unique = [...new Set(all)];
    for (const src of unique) {
      const base = src.match(/^(.*\/)([^/]+)\.jpe?g$/i);
      expect(base, `${src} is not a self-hosted jpeg`).not.toBeNull();
      for (const w of IMG_RESP_WIDTHS) {
        for (const ext of ['avif', 'webp', 'jpg']) {
          const variant = path.join(PUBLIC, base[1].replace(/^\/images\//, 'images/'), 'resp', `${base[2]}-${w}.${ext}`);
          expect(fs.existsSync(variant), `${variant} missing — rerun npm run generate:images`).toBe(true);
        }
      }
    }
  });
});
