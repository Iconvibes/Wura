'use strict';

import 'dotenv/config';
import { createApp } from './app.js';
import { connectDB } from './db.js';
import { seedIfEmpty } from './seed.js';
import { migrateUploadsFromDisk } from './gridfs.js';
import { startKeepAlive } from './keepalive.js';

const PORT = Number(process.env.PORT) || 5000;

const app = createApp();

/* -------------------------------- bootstrap ------------------------------- */
(async () => {
  const { mem } = await connectDB();
  try {
    await seedIfEmpty();
  } catch (e) {
    console.error('  Seed failed:', e.message);
  }

  // One-time-ish: pull any legacy data/uploads photos into GridFS so they
  // survive redeploys (idempotent — already-imported names are skipped).
  try {
    const { imported } = await migrateUploadsFromDisk();
    if (imported > 0) {
      console.log(`  🧳 migrated ${imported} legacy upload${imported > 1 ? 's' : ''} into GridFS`);
    }
  } catch (e) {
    console.warn('  ⚠ upload migration failed:', e.message);
  }

  const candidates = [PORT, 5000, 5001, 5174, 8080, 3000];
  let port = null;
  for (const p of candidates) {
    try {
      // Note: EADDRINUSE fires on the http.Server returned by app.listen,
      // not on the Express app — so attach listeners to that server object.
      const server = await new Promise((resolve, reject) => {
        const srv = app.listen(p, '0.0.0.0');
        const onErr = (e) => { srv.removeListener('listening', onOk); reject(e); };
        const onOk = () => { srv.removeListener('error', onErr); resolve(srv); };
        srv.once('error', onErr);
        srv.once('listening', onOk);
      });
      port = p;
      break;
    } catch (e) {
      if (e.code !== 'EADDRINUSE') throw e;
      console.log(`  Port ${p} busy, trying next…`);
    }
  }

  if (!port) {
    console.error('  Could not find a free port. Set PORT env var and retry.');
    process.exit(1);
  }

  console.log(`\n  ✦ WURA GRAND HOTEL — MERN API`);
  console.log(`  ➜ API:          http://127.0.0.1:${port}/api`);
  console.log(`  ➜ Health:       http://127.0.0.1:${port}/health`);
  console.log(`  ➜ Admin login:  admin / admin123`);
  console.log(`  ➜ Client:       http://127.0.0.1:5173  (vite dev)\n`);

  startKeepAlive();

  const shutdown = async () => {
    await mongoose_disconnect_guard(mem);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
})();

async function mongoose_disconnect_guard(mem) {
  try {
    const mongoose = (await import('mongoose')).default;
    await mongoose.disconnect();
    if (mem) await mem.stop();
  } catch { /* ignore */ }
}
