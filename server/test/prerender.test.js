'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB, clearDB, makeRoom } from './helpers.js';

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const REAL_USER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0 Safari/537.36';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  await makeRoom({ name: 'Deluxe Garden', type: 'Deluxe', price: 199, description: 'Wake to the gardens from your private balcony.' });
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
    expect(res.text).toContain('$199');
    expect(res.text).toContain('/rooms/Deluxe%20Garden');
  });

  it('renders a room detail page with its Offer for bots', async () => {
    const res = await request(app).get('/rooms/Deluxe%20Garden').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.text).toContain('<h1>Deluxe Garden</h1>');
    expect(res.text).toContain('Wake to the gardens from your private balcony.');
    expect(res.text).toContain('"@type":"HotelRoom"');
    expect(res.text).toContain('"price":"199"');
    expect(res.text).toContain('Included amenities');
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
});
