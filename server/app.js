'use strict';

import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { handleStripeWebhook, mockCheckoutRouter, isMock } from './stripe.js';
import { isBot, renderRoute } from './prerender.js';

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

  app.use(express.json({ limit: '1mb' }));

  /* --------------------------------- routes --------------------------------- */
  app.use('/api', publicRoutes);
  app.use('/api/admin', adminRoutes);

  // Mock checkout page (only when no real Stripe key is configured).
  if (isMock) app.use(mockCheckoutRouter);

  /* ------------- prerender for non-JS crawlers (SEO fallback) -------------- */
  // Bots and link-preview agents get fully-rendered HTML (real titles, meta,
  // JSON-LD and content) instead of the client-only SPA. Everyone else gets
  // the normal app below. Admin and API paths are never prerendered.
  app.use(async (req, res, next) => {
    const path = req.path.replace(/\/+$/, '');
    if (req.method !== 'GET' || !isBot(req)) return next();
    if (path.startsWith('/api') || path.startsWith('/admin') || path.startsWith('/mock-checkout')) return next();
    try {
      res.send(await renderRoute(req));
    } catch (e) {
      console.error('  ⚠ Prerender failed:', e.message);
      next();
    }
  });

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

  return app;
}
