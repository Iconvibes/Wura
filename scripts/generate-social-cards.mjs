'use strict';

/*
 * generate-social-cards.mjs
 *
 * Renders the purpose-built 1200×630 branded social cards used as og:image /
 * twitter:image across the site — navy + gold, Wura monogram, per-page
 * headline. One card for each of the 7 guest pages plus one per room (keyed
 * by roomSlug, shared with the SPA + prerender via shared/roomPhotos.js).
 *
 * Run:  npm run generate:social
 * Out:  client/public/social/*.png  +  client/public/social/rooms/*.png
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { ROOM_PHOTOS_BY_NAME, roomSlug } from '../shared/roomPhotos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, '..', 'client', 'public', 'social');

/* ------------------------------- card data -------------------------------- */

const PAGES = [
  { file: 'home', kicker: 'WURA GRAND HOTEL', headline: 'Where every stay feels golden' },
  { file: 'rooms', kicker: 'ACCOMMODATION', headline: 'Rooms & Suites' },
  { file: 'experience', kicker: 'THE EXPERIENCE', headline: 'Everything included, every moment golden' },
  { file: 'gallery', kicker: 'GALLERY', headline: 'Light, linen & skyline' },
  { file: 'stories', kicker: 'GUEST STORIES', headline: 'Rated 4.9 by 2,400+ guests' },
  { file: 'about', kicker: 'EST. 1962', headline: 'Sixty years of quiet luxury' },
  { file: 'contact', kicker: 'CONTACT', headline: 'The front desk never sleeps' },
];

function tierOf(name) {
  const n = String(name).toLowerCase();
  if (n.includes('villa')) return 'VILLA';
  if (n.includes('penthouse')) return 'PENTHOUSE';
  if (n.includes('suite')) return 'SUITE';
  if (n.includes('deluxe')) return 'DELUXE';
  if (n.includes('studio')) return 'STUDIO';
  return 'CLASSIC';
}

const ROOMS = Object.keys(ROOM_PHOTOS_BY_NAME).map((name) => ({
  file: roomSlug(name),
  kicker: tierOf(name),
  headline: name,
}));

/* ------------------------------- SVG layout ------------------------------- */

// Skyline silhouette along the bottom — the favicon's facade motif, faint.
const BUILDINGS = [
  { x: 70, w: 72, h: 96 }, { x: 160, w: 96, h: 60 }, { x: 274, w: 62, h: 132 },
  { x: 354, w: 112, h: 52 }, { x: 484, w: 72, h: 116 }, { x: 574, w: 104, h: 68 },
  { x: 696, w: 62, h: 126 }, { x: 776, w: 124, h: 58 }, { x: 918, w: 72, h: 96 },
  { x: 1008, w: 112, h: 52 }, { x: 1138, w: 62, h: 110 },
];

function skyline() {
  return BUILDINGS.map((b) => {
    const y = 540 - b.h;
    // 2–3 lit windows per building, deterministic.
    const windows = [];
    const cols = Math.floor(b.w / 22);
    const rows = Math.floor(b.h / 34);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        if ((c * 7 + r * 5 + b.x) % 3 === 0) {
          windows.push(
            `<rect x="${b.x + 10 + c * 22}" y="${y + 14 + r * 34}" width="8" height="10" rx="1" fill="rgba(212,175,55,0.16)"/>`
          );
        }
      }
    }
    return (
      `<rect x="${b.x}" y="${y}" width="${b.w}" height="${b.h}" rx="3" fill="none" stroke="rgba(212,175,55,0.28)" stroke-width="1.4"/>` +
      windows.join('')
    );
  }).join('\n  ');
}

const STAR = 'M0,-9 L2.4,-2.8 L9,-2.8 L3.8,1.4 L5.6,8 L0,4 L-5.6,8 L-3.8,1.4 L-9,-2.8 L-2.4,-2.8 Z';

function stars() {
  const xs = [988, 1030, 1072, 1114, 1156];
  return xs
    .map((x, i) => `<path d="${STAR}" transform="translate(${x},52) scale(0.95)" fill="url(#gold)" opacity="${0.55 + i * 0.09}"/>`)
    .join('');
}

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cardSvg({ kicker, headline }) {
  const headlineSize = headline.length > 24 ? 50 : 60;
  const kickerY = 330;
  const ruleY = 350;
  const headlineY = 436;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0c1530"/>
      <stop offset="1" stop-color="#05080f"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e6c25a"/>
      <stop offset="0.5" stop-color="#d4af37"/>
      <stop offset="1" stop-color="#b8902a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.12" r="0.55">
      <stop offset="0" stop-color="rgba(212,175,55,0.16)"/>
      <stop offset="1" stop-color="rgba(0,0,0,0)"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect width="1200" height="630" fill="url(#glow)"/>
  <g opacity="0.7">${skyline()}</g>
  <rect x="30" y="30" width="1140" height="570" rx="20" fill="none" stroke="rgba(212,175,55,0.4)" stroke-width="1.6"/>

  <!-- Monogram badge -->
  <circle cx="86" cy="100" r="36" fill="#0a1128" stroke="url(#gold)" stroke-width="3"/>
  <polyline points="70,78 80,118 86,96 92,118 102,78" fill="none" stroke="url(#gold)" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>

  <!-- Wordmark -->
  <text x="138" y="98" font-family="Georgia, 'Times New Roman', serif" font-size="30" letter-spacing="7" fill="#f4ead8">WURA GRAND</text>
  <text x="141" y="125" font-family="Georgia, 'Times New Roman', serif" font-size="12" letter-spacing="5" fill="url(#gold)">HOTEL · EST. 1962</text>

  ${stars()}

  <!-- Headline block -->
  <text x="108" y="${kickerY}" font-family="Georgia, 'Times New Roman', serif" font-size="16" letter-spacing="6" fill="url(#gold)">${escXml(kicker)}</text>
  <rect x="108" y="${ruleY}" width="64" height="3" fill="url(#gold)"/>
  <text x="106" y="${headlineY}" font-family="Georgia, 'Times New Roman', serif" font-size="${headlineSize}" fill="#f4ead8">${escXml(headline)}</text>

  <!-- Footer strip -->
  <line x1="108" y1="546" x2="1092" y2="546" stroke="rgba(212,175,55,0.35)" stroke-width="1"/>
  <text x="108" y="578" font-family="Georgia, 'Times New Roman', serif" font-size="12" letter-spacing="4" fill="#7c86a6">WURAGRAND.EXAMPLE</text>
  <text x="1092" y="578" text-anchor="end" font-family="Georgia, 'Times New Roman', serif" font-size="12" letter-spacing="4" fill="#7c86a6">1 GOLDEN CRESCENT · LAGOS</text>
</svg>`;
}

/* --------------------------------- render --------------------------------- */

// Always (re)render — sharp's PNG output is deterministic for the same SVG, so
// re-running after a design tweak updates every card and unchanged cards leave
// no git diff. Only an errored render is reported and fails the script.
const stats = { png: 0, errors: [] };

async function renderCard({ file, kicker, headline }, subdir) {
  const dir = subdir ? path.join(OUT_DIR, subdir) : OUT_DIR;
  const out = path.join(dir, `${file}.png`);
  try {
    fs.mkdirSync(dir, { recursive: true });
    await sharp(Buffer.from(cardSvg({ kicker, headline }))).png().toFile(out);
    stats.png += 1;
    process.stdout.write(`  ${path.relative(OUT_DIR, out)}\n`);
  } catch (err) {
    stats.errors.push(`${file}: ${err.message}`);
  }
}

console.log('Generating social cards →', OUT_DIR, '\n');
for (const page of PAGES) await renderCard(page, null);
for (const room of ROOMS) await renderCard(room, 'rooms');

console.log(`\nDone — ${stats.png} cards rendered.`);
if (stats.errors.length) {
  console.error('Errors:\n' + stats.errors.join('\n'));
  process.exit(1);
}
