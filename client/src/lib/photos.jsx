// Self-hosted photography (Unsplash License — free for commercial use).
// Files live in client/public/images/ so Vite serves them at /images/…
//
// The room photo pool lives in shared/roomPhotos.js so the Express prerender
// can emit the same per-room og:image URLs as the SPA.

export { HERO_IMAGE, ROOM_PHOTOS, ROOM_PHOTOS_BY_NAME, roomPhoto, roomPhotos, roomSlug, roomCardImage, imgSrcset, IMG_RESP_WIDTHS } from '../../../shared/roomPhotos.js';

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
