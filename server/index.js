'use strict';

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { connectDB } from './db.js';
import { seedIfEmpty } from './seed.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = Number(process.env.PORT) || 5000;

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

/* --------------------------------- routes --------------------------------- */
app.use('/api', publicRoutes);
app.use('/api/admin', adminRoutes);

/* ------------------- serve built client (production mode) ----------------- */
const DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
  app.get(/^\/(?!api).*/, (req, res) => res.sendFile(path.join(DIST, 'index.html')));
}

/* ------------------------------ error handler ----------------------------- */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
  else res.end();
});

/* -------------------------------- bootstrap ------------------------------- */
(async () => {
  const { mem } = await connectDB();
  try {
    await seedIfEmpty();
  } catch (e) {
    console.error('  Seed failed:', e.message);
  }

  const candidates = [PORT, 5000, 5001, 5174, 8080, 3000];
  let port = null;
  for (const p of candidates) {
    try {
      // Note: EADDRINUSE fires on the http.Server returned by app.listen,
      // not on the Express app — so attach listeners to that server object.
      const server = await new Promise((resolve, reject) => {
        const srv = app.listen(p, '127.0.0.1');
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
  console.log(`  ➜ Admin login:  admin / admin123`);
  console.log(`  ➜ Client:       http://127.0.0.1:5173  (vite dev)\n`);

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
