'use strict';

import Room from './models/Room.js';
import { roomToJson } from './lib.js';

/* ------------------------------- bot detection ------------------------------ */

// Crawlers + social/link-preview agents that may not execute JavaScript.
const BOT_RE =
  /googlebot|bingbot|baiduspider|duckduckbot|yandex|slurp|facebookexternalhit|twitterbot|whatsapp|telegrambot|linkedinbot|slackbot|pinterest|semrushbot|ahrefsbot|petalbot|curl/i;

export function isBot(req) {
  return BOT_RE.test(req.headers['user-agent'] || '');
}

/* --------------------------------- builders --------------------------------- */

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (n) => `$${Number(n).toLocaleString('en-US')}`;

function ldHotel(origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Hotel',
    name: 'Wura Grand Hotel',
    description: 'Five-star rooms and suites with skyline views, a rooftop pool, golden spa and wood-fired dining. Family-run since 1962.',
    url: `${origin}/`,
    logo: `${origin}/favicon.svg`,
    image: [`${origin}/images/hero.jpg`, `${origin}/images/pool.jpg`],
    telephone: '+1-555-012-1962',
    email: 'stay@wuragrand.example',
    priceRange: '$$$',
    foundingDate: '1962',
    checkinTime: '15:00',
    checkoutTime: '11:00',
    address: {
      '@type': 'PostalAddress',
      streetAddress: '1 Golden Crescent',
      addressLocality: 'City Centre',
      addressRegion: 'Lagos',
      addressCountry: 'NG',
    },
    starRating: { '@type': 'Rating', ratingValue: '5' },
    aggregateRating: { '@type': 'AggregateRating', ratingValue: '4.9', reviewCount: '2400', bestRating: '5' },
  };
}

function ldRoom(room, origin) {
  return {
    '@context': 'https://schema.org',
    '@type': 'HotelRoom',
    name: room.name,
    description: room.description,
    url: `${origin}/rooms/${encodeURIComponent(room.name)}`,
    occupancy: { '@type': 'QuantitativeValue', maxValue: room.capacity },
    offers: {
      '@type': 'Offer',
      name: `${room.name} — nightly rate`,
      price: String(Math.round(room.price)),
      priceCurrency: 'USD',
      availability: 'https://schema.org/InStock',
    },
  };
}

/**
 * Full HTML document for a crawler. Contains the real <title>, meta
 * description, canonical + Open Graph tags, JSON-LD and visible content —
 * no JavaScript required.
 */
function shell({ title, description, canonical, jsonLd = [], body }) {
  const ld = jsonLd.map((o) => `<script type="application/ld+json">${JSON.stringify(o)}</script>`).join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}" />
  <link rel="canonical" href="${esc(canonical)}" />
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${esc(title)}" />
  <meta property="og:description" content="${esc(description)}" />
  <meta property="og:url" content="${esc(canonical)}" />
  <meta property="og:image" content="${esc(canonical.split('/').slice(0, 3).join('/'))}/images/hero.jpg" />
  <meta name="robots" content="index,follow" />
  ${ld}
  <style>
    body { margin: 0; font-family: Georgia, 'Times New Roman', serif; background: #060a14; color: #f4ead8; }
    header { background: #0a1128; border-bottom: 1px solid rgba(212,175,55,0.3); padding: 22px 28px; display: flex; align-items: center; gap: 12px; }
    .brand { font-size: 18px; letter-spacing: 2px; color: #f4ead8; }
    .brand small { display: block; font-size: 9px; letter-spacing: 3px; color: #d4af37; }
    main { max-width: 960px; margin: 0 auto; padding: 36px 24px 60px; }
    h1 { font-size: 34px; font-weight: normal; color: #f4ead8; margin: 8px 0; }
    .sub { color: #9aa4c0; font-size: 15px; line-height: 1.6; }
    h2 { font-size: 20px; color: #d4af37; margin-top: 34px; letter-spacing: 0.5px; }
    ul { padding-left: 20px; line-height: 1.9; color: #c8cfe0; }
    a { color: #e0c05a; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .price { color: #d4af37; font-size: 18px; }
    .tag { display: inline-block; border: 1px solid rgba(212,175,55,0.45); border-radius: 6px; padding: 3px 10px; margin: 4px 6px 0 0; font-size: 12px; color: #e9cd6e; }
    footer { border-top: 1px solid rgba(148,163,184,0.15); padding: 26px 28px; text-align: center; color: #5f6a8a; font-size: 13px; }
  </style>
</head>
<body>
  <header>
    <span style="width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#e0c05a,#b8942a);display:grid;place-items:center;color:#0a1128;font-weight:bold;">W</span>
    <span class="brand">WURA GRAND<small>HOTEL · EST. 1962</small></span>
  </header>
  <main>${body}</main>
  <footer>© 2026 Wura Grand Hotel — 1 Golden Crescent, City Centre · +1 (555) 012-1962</footer>
</body>
</html>`;
}

/* ------------------------------ route rendering ----------------------------- */

const STATIC_PAGES = {
  experience: {
    title: 'The Experience — Wura Grand Hotel',
    description: 'Terrace pool, golden spa, wood-fired dining and more — every experience at Wura Grand is included with your stay.',
    body: `
      <h1>The Experience</h1>
      <p class="sub">From the moment the doors open, everything is arranged around your comfort.</p>
      <h2>Included with every stay</h2>
      <ul>
        <li><strong>Skyline Terrace Pool</strong> — an infinity-edge pool on the 21st floor.</li>
        <li><strong>Golden Spa &amp; Hammam</strong> — signature gold-infused therapies.</li>
        <li><strong>Leaf &amp; Flame Restaurant</strong> — farm-to-table, wood-fired kitchen.</li>
        <li><strong>Sunrise Yoga Studio</strong> — daily guided yoga at dawn.</li>
        <li><strong>Private Chauffeur</strong> — transfers and city tours, around the clock.</li>
        <li><strong>Atelier Breakfast</strong> — local pastries and made-to-order eggs until noon.</li>
      </ul>`,
  },
  gallery: {
    title: 'Gallery — Wura Grand Hotel',
    description: 'A photographic record of Wura Grand — rooms, dining, wellness and the hotel itself, captured between check-ins.',
    body: `<h1>Gallery</h1><p class="sub">A quiet record of light, linen and skyline — captured between check-ins. Browse 16 frames across rooms, dining, wellness and the hotel itself.</p>`,
  },
  stories: {
    title: 'Guest Stories — Wura Grand Hotel',
    description: 'Five-star words from the people who know us best: 2,400+ verified guest reviews of Wura Grand Hotel.',
    body: `<h1>Guest Stories</h1><p class="sub">Loved by travellers — rated 4.9 out of 5 across 2,400+ reviews. The staff remember your name by day two.</p>`,
  },
  about: {
    title: 'Our Story — Wura Grand Hotel',
    description: 'Sixty years of quiet luxury: the history of Wura Grand, from Mariam Wura’s ten-room guesthouse in 1962 to the city’s most loved address.',
    body: `<h1>Sixty years of quiet luxury</h1><p class="sub">Mariam Wura opened the doors in 1962 with ten rooms and one rule: every guest leaves knowing their name. Today her granddaughter Adaeze hosts on the same corner of Golden Crescent.</p>`,
  },
  contact: {
    title: 'Contact — Wura Grand Hotel',
    description: 'The front desk answers around the clock. Reservations, group stays and special requests at Wura Grand Hotel.',
    body: `<h1>Contact</h1><p class="sub">1 Golden Crescent, City Centre · +1 (555) 012-1962 · stay@wuragrand.example</p><p class="sub">The front desk answers around the clock — real people, no menus.</p>`,
  },
};

/** Build the prerendered page for a public GET request, or null to skip. */
export async function renderRoute(req) {
  const origin = `${req.protocol}://${req.get('host')}`;
  const path = req.path.replace(/\/+$/, '') || '/';
  const ld = [ldHotel(origin)];

  if (path === '/') {
    const rooms = await Room.find({ status: 'active' }).sort({ price: 1 }).limit(3).lean();
    const list = rooms
      .map((r) => `<li><a href="/rooms/${encodeURIComponent(r.name)}">${esc(r.name)}</a> — ${esc(r.type)} · ${money(r.price)}/night</li>`)
      .join('\n');
    return shell({
      title: 'Wura Grand Hotel — Luxury Stay, Timeless Elegance',
      description: 'Five-star rooms, skyline views and warm hospitality at the city’s most loved hotel, est. 1962. Book your stay online.',
      canonical: origin + '/',
      jsonLd: ld,
      body: `
        <h1>Where every stay feels golden</h1>
        <p class="sub">Wura Grand rises above the skyline with 50 rooms and suites across five tiers — from sunrise espresso on your balcony to a late-night soak under the stars.</p>
        <h2>Featured rooms</h2>
        <ul>${list}</ul>
        <p class="sub"><a href="/rooms">Browse all rooms &amp; suites →</a></p>`,
    });
  }

  if (path === '/rooms') {
    const rooms = await Room.find({ status: 'active' }).sort({ price: 1 }).lean();
    const list = rooms
      .map(
        (r) =>
          `<li><a href="/rooms/${encodeURIComponent(r.name)}">${esc(r.name)}</a> — ${esc(r.type)} · up to ${r.capacity} guests · ${r.size_sqm} m² · <span class="price">${money(r.price)}/night</span></li>`
      )
      .join('\n');
    return shell({
      title: 'Rooms & Suites — Wura Grand Hotel',
      description: 'Browse 50 rooms and suites with live availability, free cancellation and skyline views. Book directly with Wura Grand.',
      canonical: origin + '/rooms',
      jsonLd: ld,
      body: `<h1>Rooms &amp; Suites</h1><p class="sub">Every room is a quiet composition of linen, light and skyline. Free cancellation up to 48 hours before arrival.</p><ul>${list}</ul>`,
    });
  }

  const roomMatch = path.match(/^\/rooms\/(.+)$/);
  if (roomMatch) {
    const name = decodeURIComponent(roomMatch[1]);
    const room = await Room.findOne({ name }).lean();
    if (room) {
      const r = roomToJson(room);
      const amenityTags = (r.amenities || []).map((a) => `<span class="tag">${esc(a)}</span>`).join('');
      return shell({
        title: `${r.name} — Wura Grand Hotel`,
        description: `${r.name}: ${r.description}`,
        canonical: `${origin}/rooms/${encodeURIComponent(r.name)}`,
        jsonLd: [...ld, ldRoom(r, origin)],
        body: `
          <h1>${esc(r.name)}</h1>
          <p class="tag">${esc(r.type)}</p>
          <p class="sub">${esc(r.description)}</p>
          <p class="price">${money(r.price)} / night · up to ${r.capacity} guests · ${r.size_sqm} m²</p>
          <h2>Included amenities</h2>
          <p>${amenityTags}</p>
          <p class="sub"><a href="/rooms">Back to all rooms →</a></p>`,
      });
    }
  }

  const slug = STATIC_PAGES[path.slice(1)];
  if (slug) {
    return shell({
      title: slug.title,
      description: slug.description,
      canonical: origin + path,
      jsonLd: ld,
      body: slug.body,
    });
  }

  // Unknown guest route: a basic page so crawlers don't see a blank SPA.
  return shell({
    title: 'Wura Grand Hotel — Luxury Stay, Timeless Elegance',
    description: 'Wura Grand Hotel: five-star rooms, skyline views and warm hospitality.',
    canonical: origin + path,
    jsonLd: ld,
    body: `<h1>Wura Grand Hotel</h1><p class="sub">Fifty rooms and suites, one standard of excellence. Rising above the city since 1962.</p><p class="sub"><a href="/">Return to the homepage →</a></p>`,
  });
}
