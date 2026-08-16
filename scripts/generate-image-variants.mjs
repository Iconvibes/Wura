'use strict';

/*
 * generate-image-variants.mjs
 *
 * Produces responsive width variants for every self-hosted photo under
 * client/public/images/ (room pool, page banners, hero). srcset/sizes on the
 * <img> tags (via imgSrcset() in shared/roomPhotos.js) then let the browser
 * download only the resolution it actually renders — cutting initial page
 * weight, especially on phones and 1x screens.
 *
 * Run:  npm run generate:images
 * Out:  <dir>/resp/<base>-<w>.jpg  next to each source, e.g.
 *        client/public/images/rooms/resp/classic-queen-1-480.jpg
 *
 * Deterministic: every run re-renders all variants (sharp's JPEG output is
 * stable for the same input), so re-running leaves no diff unless a source
 * changed. Only errored images are reported and fail the script.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMAGES_DIR = path.join(__dirname, '..', 'client', 'public', 'images');

// Widths to emit. Sources narrower than a target are skipped (never upscale).
// srcset candidates reference the SAME filenames the helper emits, so the
// generator and imgSrcset() can never drift apart.
const WIDTHS = [480, 800, 1200];

// Codecs per width — <picture> serves AVIF → WebP → JPEG (srcset fallback).
// Qualities are tuned so AVIF ~= WebP ~= JPEG visually while each newer codec
// is meaningfully smaller (AVIF ≈ 50-65% of the JPEG size, WebP ≈ 70-80%).
const FORMATS = [
  // effort 3 (not 4): ~3.3× faster AVIF encode for ~5% larger files.
  { ext: 'avif', encode: (s) => s.avif({ quality: 50, effort: 3 }) },
  { ext: 'webp', encode: (s) => s.webp({ quality: 74 }) },
  { ext: 'jpg', encode: (s) => s.jpeg({ quality: 78 }) },
];

const isJpeg = (f) => /\.jpe?g$/i.test(f);
// Walk everything under images/, skipping uploads (admin-provided) and any
// already-generated resp/ output.
function collect() {
  const files = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'uploads' || entry.name === 'resp') continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile() && isJpeg(entry.name)) files.push(full);
    }
  };
  walk(IMAGES_DIR);
  return files;
}

const stats = { variants: 0, skipped: 0, errors: [] };
const before = Date.now();

console.log(`Generating responsive variants → ${IMAGES_DIR} (${WIDTHS.join('/')}w · ${FORMATS.map((f) => f.ext).join('/')})\n`);

// Encode every width × codec for one source.
async function renderSource(src) {
  let meta;
  try {
    meta = await sharp(src).metadata();
  } catch (err) {
    stats.errors.push(`${path.relative(IMAGES_DIR, src)}: ${err.message}`);
    return;
  }
  const sourceWidth = meta.width || 0;
  // w <= sourceWidth so retina screens still get a full-width candidate (a
  // same-size recompress trims bytes vs the original); only sources narrower
  // than the smallest target are skipped.
  const widths = WIDTHS.filter((w) => w <= sourceWidth);
  if (widths.length === 0) {
    stats.skipped += 1;
    console.log(`  - ${path.relative(IMAGES_DIR, src)} (${sourceWidth}px — already small, skipping)`);
    return;
  }

  const dir = path.join(path.dirname(src), 'resp');
  fs.mkdirSync(dir, { recursive: true });
  const base = path.basename(src).replace(/\.jpe?g$/i, '');

  await Promise.all(
    widths.flatMap((w) =>
      FORMATS.map(async ({ ext, encode }) => {
        const out = path.join(dir, `${base}-${w}.${ext}`);
        try {
          await encode(sharp(src).resize({ width: w, withoutEnlargement: true })).toFile(out);
          stats.variants += 1;
          process.stdout.write(`  ${path.relative(IMAGES_DIR, out)}\n`);
        } catch (err) {
          stats.errors.push(`${path.relative(IMAGES_DIR, out)}: ${err.message}`);
        }
      })
    )
  );
}

// Bounded concurrency — encodes are CPU-bound (AVIF especially), so cap the
// in-flight sources at the CPU count rather than firing all 116 at once.
const sources = collect();
const concurrency = Math.max(1, Math.min(8, os.cpus().length));
let cursor = 0;
const workers = Array.from({ length: concurrency }, async () => {
  while (cursor < sources.length) {
    const src = sources[cursor++];
    if (src) await renderSource(src);
  }
});
await Promise.all(workers);

const ms = Date.now() - before;
console.log(`\nDone — ${stats.variants} variants generated (${stats.skipped} sources skipped) in ${ms}ms.`);
if (stats.errors.length) {
  console.error('Errors:\n' + stats.errors.join('\n'));
  process.exit(1);
}
