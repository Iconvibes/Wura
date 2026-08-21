'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import path from 'node:path';
import { app, startTestDB, stopTestDB, clearDB, makeRoom } from './helpers.js';

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const REAL_USER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await makeRoom({ name: 'Deluxe Garden', room_number: '1204', floor: 12, type: 'Deluxe', price: 199, description: 'Wake to the gardens from your private balcony.' });
  await makeRoom({ name: 'Classic Queen', type: 'Standard', price: 129 });
});

describe('prerender for non-JS crawlers', () => {
  it('serves rendered HTML with structured data on the homepage to bots', async () => {
    const res = await request(app).get('/').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.text).toContain('<title>Wura Grand Hotel');
    expect(res.text).toContain('aggregateRating');
    expect(res.text).toContain('"@type":"Hotel"');
    expect(res.text).toContain('Deluxe Garden');
    expect(res.text).toContain('application/ld+json');
  });

  it('renders the rooms listing with prices for bots', async () => {
    const res = await request(app).get('/rooms').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.text).toContain('<h1>Rooms &amp; Suites</h1>');
    expect(res.text).toContain('Deluxe Garden');
    expect(res.text).toContain('\u20a6199');
    expect(res.text).toContain('/rooms/Deluxe%20Garden');
  });

  it('renders a room detail page with its Offer for bots', async () => {
    const res = await request(app).get('/rooms/Deluxe%20Garden').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.text).toContain('<h1>Room 1204 · Deluxe Garden</h1>');
    expect(res.text).toContain('Wake to the gardens from your private balcony.');
    expect(res.text).toContain('"@type":["HotelRoom","Product"]');
    expect(res.text).toContain('"price":"199"');
    expect(res.text).toContain('Included amenities');
  });

  it('emits Open Graph + Twitter card tags with per-page images', async () => {
    // supertest binds an ephemeral port, so match any origin on 127.0.0.1.
    const origin = /http:\/\/127\.0\.0\.1(:\d+)?/;
    const img = (p) => new RegExp(`(property="og:image"|name="twitter:image") content="${origin.source}${p}"`);

    const home = await request(app).get('/').set('User-Agent', GOOGLEBOT).expect(200);
    expect(home.text).toContain('property="og:type" content="website"');
    expect(home.text).toContain('property="og:site_name" content="Wura Grand Hotel"');
    expect(home.text).toContain('property="og:locale" content="en_US"');
    expect(home.text).toContain('name="twitter:card" content="summary_large_image"');
    expect(home.text).toContain('property="og:title" content="Wura Grand Hotel');
    // og:image must be an absolute URL pointing at the branded social card.
    expect(home.text).toMatch(img('/social/home.png'));
    expect(home.text).toContain('property="og:image" content="http://');

    const rooms = await request(app).get('/rooms').set('User-Agent', GOOGLEBOT).expect(200);
    expect(rooms.text).toMatch(img('/social/rooms.png'));

    // Per-room og:image is the room's own branded card (shared slug registry).
    const room = await request(app).get('/rooms/Deluxe%20Garden').set('User-Agent', GOOGLEBOT).expect(200);
    expect(room.text).toMatch(img('/social/rooms/deluxe-garden.png'));
    expect(room.text).toContain('name="twitter:image" content="http://');
  });

  it('renders static pages with real copy', async () => {
    const res = await request(app).get('/about').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.text).toContain('Sixty years of quiet luxury');
    expect(res.text).toContain('Mariam Wura');
  });

  it('leaves real users on the SPA', async () => {
    const res = await request(app).get('/').set('User-Agent', REAL_USER);
    // No dist in tests, so no SPA fallback either — but crucially NOT the prerendered shell.
    expect(res.text).not.toContain('aggregateRating');
    expect(res.text).not.toContain('application/ld+json');
  });

  it('never prerenders admin paths', async () => {
    const res = await request(app).get('/admin').set('User-Agent', GOOGLEBOT);
    expect(res.text).not.toContain('aggregateRating');
  });

  it('leaves the API as JSON for bots', async () => {
    const res = await request(app).get('/api/rooms').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.body.rooms.length).toBe(2);
  });

  // Static assets are served to crawlers unchanged — a bot fetching an
  // og:image or sitemap must get the real file, not prerendered HTML.
  // Skipped when client/dist isn't built (plain `npm test` without a build).
  const hasDist = fs.existsSync(path.join(process.cwd(), '..', 'client', 'dist'));

  it.skipIf(!hasDist)('serves real image files to bots (og:image support)', async () => {
    for (const p of ['/images/rooms/deluxe-king-1.jpg', '/social/rooms/deluxe-garden.png', '/social/home.png']) {
      const res = await request(app).get(p).set('User-Agent', GOOGLEBOT);
      expect(res.headers['content-type']).toContain('image');
      // The real bytes come back — not a prerendered HTML page.
      expect(Buffer.isBuffer(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThan(1000);
    }
  });

  it.skipIf(!hasDist)('serves robots.txt and sitemap.xml to bots as files', async () => {
    const robots = await request(app).get('/robots.txt').set('User-Agent', GOOGLEBOT);
    expect(robots.headers['content-type']).toContain('text/plain');
    expect(robots.text).toContain('Sitemap:');

    const sitemap = await request(app).get('/sitemap.xml').set('User-Agent', GOOGLEBOT);
    expect(sitemap.headers['content-type']).toContain('application/xml');
    expect(sitemap.text).toContain('<urlset');
  });

  it.skipIf(!hasDist)('rewrites the hero preload to the route hero on public pages', async () => {
    const res = await request(app).get('/rooms').set('User-Agent', REAL_USER);
    expect(res.text).toContain('data-page-meta="preload"');
    expect(res.text).toContain('/images/rooms/resp/suite-1200.avif');
    // Not the home hero — the wrong-image fetch is the waste this prevents.
    expect(res.text).not.toContain('/images/resp/hero-1200.avif');
  });

  it.skipIf(!hasDist)('strips the hero preload from admin and unknown routes', async () => {
    for (const p of ['/hotel-staff-9k2x7/login', '/hotel-staff-9k2x7', '/definitely-not-a-page']) {
      const res = await request(app).get(p).set('User-Agent', REAL_USER);
      expect(res.text).not.toContain('data-page-meta="preload"');
    }
  });
});
