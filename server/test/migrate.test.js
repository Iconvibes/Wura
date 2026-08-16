'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { startTestDB, stopTestDB, clearDB } from './helpers.js';
import { migrateUploadsFromDisk, listUploadFilenames, findUpload } from '../gridfs.js';

// 1×1 transparent PNG — real magic bytes, so it's a plausible upload.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

let dir;

beforeAll(async () => {
  await startTestDB();
});
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wura-migrate-'));
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('legacy upload migration', () => {
  it('imports legacy disk uploads into GridFS once (idempotent)', async () => {
    fs.writeFileSync(path.join(dir, 'legacy-1.png'), PNG);
    fs.writeFileSync(path.join(dir, 'legacy-2.jpg'), PNG);
    fs.writeFileSync(path.join(dir, 'notes.txt'), 'not an image'); // skipped

    const first = await migrateUploadsFromDisk(dir);
    expect(first.imported).toBe(2);
    expect(await listUploadFilenames()).toEqual(expect.arrayContaining(['legacy-1.png', 'legacy-2.jpg']));
    expect(await listUploadFilenames()).toHaveLength(2);

    // The "once" guarantee: a second boot is a no-op.
    const second = await migrateUploadsFromDisk(dir);
    expect(second.imported).toBe(0);
    expect(await listUploadFilenames()).toHaveLength(2);
  });

  it('stores content types from the file extension and streams back', async () => {
    fs.writeFileSync(path.join(dir, 'photo.webp'), PNG);
    fs.writeFileSync(path.join(dir, 'other.jpeg'), PNG);

    await migrateUploadsFromDisk(dir);

    const webp = await findUpload('photo.webp');
    expect(webp.contentType).toBe('image/webp');
    const jpeg = await findUpload('other.jpeg');
    expect(jpeg.contentType).toBe('image/jpeg');
  });

  it('is a no-op with no directory (fresh deploys never see data/uploads)', async () => {
    const missing = path.join(dir, 'does-not-exist');
    const res = await migrateUploadsFromDisk(missing);
    expect(res.imported).toBe(0);
  });
});
