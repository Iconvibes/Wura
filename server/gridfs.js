'use strict';

import mongoose from 'mongoose';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Admin-uploaded room photography lives in MongoDB GridFS (bucket 'uploads')
// instead of local disk, so uploads survive Render redeploys — the filesystem
// there is ephemeral, the database is not. URLs keep the same shape
// (/images/uploads/<name>.<ext>) as the old data/uploads layout, and app.js
// falls back to disk for any pre-existing local files.
const BUCKET_NAME = 'uploads';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The legacy on-disk upload directory (gitignored) — still read by app.js as a
// fallback and scanned once at boot by migrateUploadsFromDisk().
export const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');

let bucket = null;

function getBucket() {
  if (!bucket && mongoose.connection?.db) {
    bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: BUCKET_NAME });
  }
  if (!bucket) throw new Error('MongoDB is not connected.');
  return bucket;
}

/** Store a buffer in GridFS under a stable filename. Resolves with the file id. */
export function saveUpload({ buffer, filename, contentType }) {
  const b = getBucket();
  return new Promise((resolve, reject) => {
    const ws = b.openUploadStream(filename, { contentType });
    ws.on('error', reject);
    ws.on('finish', () => resolve(ws.id));
    ws.end(buffer);
  });
}

/** Look up a stored file by its exact filename (uploaded names are unique: timestamp + random hex). */
export async function findUpload(filename) {
  const b = getBucket();
  const docs = await b.find({ filename }).limit(1).toArray();
  return docs[0] || null;
}

/** Pipe a stored file to the response with a content type and a long cache
 * (uploaded names are immutable, so browsers can hold them forever). */
export function streamUpload(res, file) {
  const b = getBucket();
  const rs = b.openDownloadStream(file._id);
  res.set('Content-Type', file.contentType || 'application/octet-stream');
  res.set('Cache-Control', 'public, max-age=31536000, immutable');
  rs.on('error', () => {
    if (!res.headersSent) res.status(404).end();
    else res.destroy();
  });
  rs.pipe(res);
}

/** Delete a stored file by its exact filename. Resolves with true if one was removed. */
export async function deleteUpload(filename) {
  const b = getBucket();
  const file = await findUpload(filename);
  if (!file) return false;
  await b.delete(file._id);
  return true;
}

/** All filenames currently stored in the uploads bucket. */
export async function listUploadFilenames() {
  const b = getBucket();
  const files = await b.find({}).toArray();
  return files.map((f) => f.filename);
}

/**
 * Delete every stored upload whose filename is not in `referenced` — the
 * orphan sweep. Called after a room's photos change or a room is deleted, so
 * the bucket only ever holds files some room points at. Resolves with the
 * number of files removed.
 */
export async function pruneUploads(referenced) {
  const b = getBucket();
  const files = await b.find({}).toArray();
  let removed = 0;
  for (const f of files) {
    if (!referenced.has(f.filename)) {
      await b.delete(f._id);
      removed += 1;
    }
  }
  return removed;
}

const UPLOAD_FILE_RE = /\.(png|jpe?g|webp)$/i;
const CONTENT_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' };

/**
 * Boot migration: import any legacy files sitting in data/uploads/ into GridFS
 * so pre-GridFS uploads move to persistent storage. Idempotent — files whose
 * filename is already in the bucket are skipped, so it runs safely on every
 * boot and the “once” guarantee is the bucket itself. Non-images are ignored;
 * a failure never blocks boot.
 * @param {string} dir override for tests (defaults to UPLOADS_DIR)
 * @returns {Promise<{imported: number}>}
 */
export async function migrateUploadsFromDisk(dir = UPLOADS_DIR) {
  let imported = 0;
  try {
    if (!fs.existsSync(dir)) return { imported: 0 };
    const existing = new Set(await listUploadFilenames());
    for (const entry of fs.readdirSync(dir)) {
      if (!UPLOAD_FILE_RE.test(entry) || existing.has(entry)) continue;
      const buf = fs.readFileSync(path.join(dir, entry));
      const ext = entry.split('.').pop().toLowerCase();
      await saveUpload({ buffer: buf, filename: entry, contentType: CONTENT_TYPES[ext] || 'application/octet-stream' });
      imported += 1;
    }
  } catch (e) {
    console.warn('  ⚠ upload migration failed:', e.message);
  }
  return { imported };
}
