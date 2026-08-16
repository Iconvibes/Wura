// Self-hosted photography (Unsplash License — free for commercial use).
// Files live in client/public/images/ so Vite serves them at /images/…

export const HERO_IMAGE = '/images/hero.jpg';

// Fallback pool keyed by room type (used only if a room has no name entry).
export const ROOM_PHOTOS = {
  Standard: '/images/rooms/standard.jpg',
  Deluxe: '/images/rooms/deluxe.jpg',
  Suite: '/images/rooms/suite.jpg',
  Penthouse: '/images/rooms/penthouse.jpg',
};

// Per-room pools — each seeded room gets its own photography, keyed by the
// stable seeded NAME (ObjectIds change on every reseed, names do not).
// The first entry is the card hero; the rest power the detail gallery.
// Rooms that share a base name (e.g. 'Deluxe King Skyline') reuse the base
// room's pool — same décor, different floor.
export const ROOM_PHOTOS_BY_NAME = {
  'Classic Queen': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Classic Twin': ['/images/rooms/classic-twin-1.jpg', '/images/rooms/classic-twin-2.jpg'],
  'Classic Queen Garden': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Classic Twin Garden': ['/images/rooms/classic-twin-1.jpg', '/images/rooms/classic-twin-2.jpg'],
  'Accessible King': ['/images/rooms/accessible-king-1.jpg', '/images/rooms/accessible-king-2.jpg'],
  'Deluxe King': ['/images/rooms/deluxe-king-1.jpg', '/images/rooms/deluxe-king-2.jpg'],
  'Deluxe Garden': ['/images/rooms/deluxe-garden-1.jpg', '/images/rooms/deluxe-garden-2.jpg'],
  'Deluxe King Skyline': ['/images/rooms/deluxe-king-1.jpg', '/images/rooms/deluxe-king-2.jpg'],
  'Deluxe Terrace': ['/images/rooms/deluxe-king-1.jpg', '/images/rooms/deluxe-king-2.jpg'],
  'Junior Suite': ['/images/rooms/junior-suite-1.jpg', '/images/rooms/junior-suite-2.jpg'],
  'Deluxe Suite': ['/images/rooms/junior-suite-1.jpg', '/images/rooms/junior-suite-2.jpg'],
  'Executive Suite': ['/images/rooms/executive-suite-1.jpg', '/images/rooms/executive-suite-2.jpg'],
  'Family Suite': ['/images/rooms/family-suite-1.jpg', '/images/rooms/family-suite-2.jpg'],
  'Skyline Suite': ['/images/rooms/skyline-suite-1.jpg', '/images/rooms/skyline-suite-2.jpg'],
  'Ambassador Suite': ['/images/rooms/executive-suite-1.jpg', '/images/rooms/executive-suite-2.jpg'],
  'Presidential': ['/images/rooms/presidential-1.jpg', '/images/rooms/presidential-2.jpg'],
  'Skyline Penthouse': ['/images/rooms/presidential-1.jpg', '/images/rooms/presidential-2.jpg'],
  'Royal Villa': ['/images/rooms/royal-villa-1.jpg', '/images/rooms/royal-villa-2.jpg'],
  'Garden Villa': ['/images/rooms/royal-villa-1.jpg', '/images/rooms/royal-villa-2.jpg'],
  'Heritage Suite': ['/images/rooms/heritage-suite-1.jpg', '/images/rooms/heritage-suite-2.jpg'],
  'Studio Loft': ['/images/rooms/studio-loft-1.jpg', '/images/rooms/studio-loft-2.jpg'],
  'Garden Cottage': ['/images/rooms/deluxe-garden-1.jpg', '/images/rooms/deluxe-garden-2.jpg'],
  'Family King': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Penthouse Studio': ['/images/rooms/penthouse-studio-1.jpg', '/images/rooms/penthouse-studio-2.jpg'],
  'Classic Queen Courtyard': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Classic Queen 2nd Floor': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Classic Twin 3rd Floor': ['/images/rooms/classic-twin-1.jpg', '/images/rooms/classic-twin-2.jpg'],
  'Classic Twin 4th Floor': ['/images/rooms/classic-twin-1.jpg', '/images/rooms/classic-twin-2.jpg'],
  'Family King Garden': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Deluxe King Corner': ['/images/rooms/deluxe-king-corner-1.jpg', '/images/rooms/deluxe-king-corner-2.jpg'],
  'Deluxe King 12th Floor': ['/images/rooms/deluxe-king-1.jpg', '/images/rooms/deluxe-king-2.jpg'],
  'Deluxe Garden 2nd Floor': ['/images/rooms/deluxe-garden-1.jpg', '/images/rooms/deluxe-garden-2.jpg'],
  'Deluxe Terrace Skyline': ['/images/rooms/deluxe-king-1.jpg', '/images/rooms/deluxe-king-2.jpg'],
  'Junior Loft': ['/images/rooms/studio-loft-1.jpg', '/images/rooms/studio-loft-2.jpg'],
  'Junior Suite City View': ['/images/rooms/junior-suite-1.jpg', '/images/rooms/junior-suite-2.jpg'],
  'Deluxe Suite Skyline': ['/images/rooms/junior-suite-1.jpg', '/images/rooms/junior-suite-2.jpg'],
  'Executive Suite Corner': ['/images/rooms/executive-suite-1.jpg', '/images/rooms/executive-suite-2.jpg'],
  'Family Suite Garden': ['/images/rooms/family-suite-1.jpg', '/images/rooms/family-suite-2.jpg'],
  'Ambassador Suite Skyline': ['/images/rooms/executive-suite-1.jpg', '/images/rooms/executive-suite-2.jpg'],
  'Heritage Garden Suite': ['/images/rooms/heritage-suite-1.jpg', '/images/rooms/heritage-suite-2.jpg'],
  'Skyline Penthouse East': ['/images/rooms/presidential-1.jpg', '/images/rooms/presidential-2.jpg'],
  'Royal Villa Garden': ['/images/rooms/royal-villa-1.jpg', '/images/rooms/royal-villa-2.jpg'],
  'Observatory Penthouse': ['/images/rooms/observatory-penthouse-1.jpg', '/images/rooms/observatory-penthouse-2.jpg'],
  'Penthouse Studio City': ['/images/rooms/penthouse-studio-1.jpg', '/images/rooms/penthouse-studio-2.jpg'],
  'Presidential Reserve': ['/images/rooms/presidential-1.jpg', '/images/rooms/presidential-2.jpg'],
  'Classic Queen 5th Floor': ['/images/rooms/classic-queen-1.jpg', '/images/rooms/classic-queen-2.jpg'],
  'Deluxe King 15th Floor': ['/images/rooms/deluxe-king-1.jpg', '/images/rooms/deluxe-king-2.jpg'],
  'Junior Suite 7th Floor': ['/images/rooms/junior-suite-1.jpg', '/images/rooms/junior-suite-2.jpg'],
  'Penthouse Suite 20th Floor': ['/images/rooms/penthouse-studio-1.jpg', '/images/rooms/penthouse-studio-2.jpg'],
  'Skyline Penthouse West': ['/images/rooms/presidential-1.jpg', '/images/rooms/presidential-2.jpg'],
};

/** Card photo for a room: its own pool's first image, else its type fallback. */
export function roomPhoto(room) {
  const pool = room && ROOM_PHOTOS_BY_NAME[room.name];
  if (pool && pool.length) return pool[0];
  return ROOM_PHOTOS[(room && room.type) || 'Standard'] || ROOM_PHOTOS.Standard;
}

/** Full gallery for a room's detail page (per-room pool, then type fallback). */
export function roomPhotos(room) {
  const pool = room && ROOM_PHOTOS_BY_NAME[room.name];
  if (pool && pool.length) return pool;
  const type = (room && room.type) || 'Standard';
  return [ROOM_PHOTOS[type] || ROOM_PHOTOS.Standard, HERO_IMAGE];
}

export const EXPERIENCE_PHOTOS = {
  pool: '/images/pool.jpg',
  spa: '/images/spa.jpg',
  flame: '/images/restaurant.jpg',
  yoga: '/images/yoga.jpg',
  car: '/images/car.jpg',
  plate: '/images/breakfast.jpg',
};

export const GALLERY_PHOTOS = [
  { src: '/images/hero.jpg', cap: 'The Golden Lobby' },
  { src: '/images/pool.jpg', cap: 'Terrace Pool at dusk' },
  { src: '/images/restaurant.jpg', cap: 'Leaf & Flame' },
  { src: '/images/rooms/suite.jpg', cap: 'Skyline Suite' },
  { src: '/images/spa.jpg', cap: 'Golden Spa' },
];
