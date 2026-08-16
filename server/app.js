'use strict';

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { handleStripeWebhook, mockCheckoutRouter, isMock } from './stripe.js';
import { isBot, renderRoute } from './prerender.js';
import { getKeepAliveInfo } from './keepalive.js';
import { imgSrcset } from '../shared/roomPhotos.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * createApp — builds the Express app (routes, webhook, middleware) without
 * connecting to the DB or binding a port. index.js boots it in production;
 * tests import it directly with supertest against an in-memory MongoDB.
 */
export function createApp() {
  const app = express();
  app.use(cors());

  /* Stripe webhook needs the raw body for signature verification — mount it
     before the JSON parser so it can read the request stream. */
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
    try {
      const out = await handleStripeWebhook(req.body, req.headers['stripe-signature'] || '');
      res.json(out);
    } catch (e) {
      console.error('  ⚠ Webhook error:', e.message);
      res.status(400).json({ error: e.message });
    }
  });

  // Admin photo uploads are data-URL images and can exceed the 1mb JSON limit —
  // parse this route with its own larger limit before the global parser.
  // (body-parser only parses a request once, so the global 1mb parser skips it.)
  app.post('/api/admin/upload', express.json({ limit: '12mb' }));

  app.use(express.json({ limit: '1mb' }));

  /* ------------------------------ health probe ------------------------------ */
  // The endpoint UptimeRobot monitors and the keep-alive self-ping hits.
  // Mounted before the prerender middleware so even crawler UAs get JSON, and
  // kept DB-aware: 200 while Mongo is connected, 503 while it isn't (so a real
  // outage trips the monitor instead of a cold-start hiccup being ignored).
  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const state = mongoose.connection.readyState; // 0..3
    const dbOk = state === 1;
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      service: 'wura-grand-api',
      uptime: Math.round(process.uptime()),
      db: ['disconnected', 'connected', 'connecting', 'disconnecting'][state] || 'unknown',
      keepalive: getKeepAliveInfo(),
      ts: new Date().toISOString(),
    });
  });

  /* --------------------------------- routes --------------------------------- */
  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);

  // Mock checkout page (only when no real Stripe key is configured).
  if (isMock) app.use(mockCheckoutRouter);

  /* ------------- prerender for non-JS crawlers (SEO fallback) -------------- */
  // Bots and link-preview agents get fully-rendered HTML (real titles, meta,
  // JSON-LD and content) instead of the client-only SPA. Everyone else gets
  // the normal app below. Admin and API paths are never prerendered, and
  // neither are static assets — a crawler fetching /images/… (for og:image
  // previews and image search), /sitemap.xml, /robots.txt or hashed bundles
  // must receive the real file, not a rendered page.
  app.use(async (req, res, next) => {
    const path = req.path.replace(/\/+$/, '');
    if (req.method !== 'GET' || !isBot(req)) return next();
    if (path.startsWith('/api') || path.startsWith('/admin') || path.startsWith('/mock-checkout')) return next();
    if (/\.[a-z0-9]+$/i.test(path)) return next(); // any file extension → static
    try {
      res.send(await renderRoute(req));
    } catch (e) {
      console.error('  ⚠ Prerender failed:', e.message);
      next();
    }
  });

  /* ------------------- serve admin-uploaded photography -------------------- */
  // Stored in data/uploads (gitignored) — served before the dist static below
  // so admin-picked room photos resolve in both dev and production.
  const UPLOADS_DIR = path.join(__dirname, '..', 'data', 'uploads');
  app.use('/images/uploads', express.static(UPLOADS_DIR));

  /* ------------------- serve built client (production mode) ----------------- */
  const DIST = path.join(__dirname, '..', 'client', 'dist');
  if (fs.existsSync(DIST)) {
    app.use(express.static(DIST));

    // The static index.html preloads the HOME hero before JS parses. For every
    // other route we rewrite it to that route's own hero (so no wasted fetch of
    // the wrong image), and strip it entirely where there is no hero — admin,
    // room detail (the client adds the room's photo preload post-JS) and
    // unknown paths. This keeps the admin panel free of the stale ~46KB hero
    // fetch that would otherwise fire on every staff page load.
    const PAGE_PRELOAD = {
      '/rooms': '/images/rooms/suite.jpg',
      '/experience': '/images/pool.jpg',
      '/gallery': '/images/restaurant.jpg',
      '/stories': '/images/rooms/penthouse.jpg',
      '/about': '/images/exterior.jpg',
      '/contact': '/images/hero.jpg',
    };
    const PRELOAD_RE = /<link\b[^>]*data-page-meta="preload"[^>]*\/?>/s;
    const preloadLinkFor = (hero) => {
      const srcset = imgSrcset(hero, 'avif');
      if (!srcset) return '';
      const largest = srcset.split(', ').pop().split(' ')[0];
      return `<link rel="preload" as="image" type="image/avif" href="${largest}" imagesrcset="${srcset}" imagesizes="100vw" data-page-meta="preload" />`;
    };

    app.get(/^\/(?!api).*/, (req, res) => {
      const clean = req.path.replace(/\/+$/, '');
      const link = PAGE_PRELOAD[clean] ? preloadLinkFor(PAGE_PRELOAD[clean]) : '';
      const html = fs.readFileSync(path.join(DIST, 'index.html'), 'utf8').replace(PRELOAD_RE, link);
      res.set('Cache-Control', 'public, max-age=0');
      res.type('html').send(html);
    });
  }

  /* ------------------------------ error handler ----------------------------- */
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error(err);
    if (!res.headersSent) res.status(500).json({ error: 'Internal server error' });
    else res.end();
  });

  return app;
}
