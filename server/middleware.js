'use strict';

import jwt from 'jsonwebtoken';

/* --------------------------------- JWT auth ------------------------------- */

const JWT_SECRET = process.env.JWT_SECRET || 'wura-grand-dev-secret-change-me';
const TOKEN_TTL = '12h';

export function signToken(username) {
  return jwt.sign({ username }, JWT_SECRET, { expiresIn: TOKEN_TTL });
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }
}

/* ------------------------ token-bucket rate limiter ----------------------- */

// 5 booking requests per minute per IP.
const LIMIT_RATE = 5;
const LIMIT_WINDOW = 60_000; // ms
const buckets = new Map();

export function rateLimit(req, res, next) {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  let b = buckets.get(ip);
  if (!b) {
    b = { tokens: LIMIT_RATE - 1, last: now };
    buckets.set(ip, b);
    return next(); // allowed
  }
  // Refill: add tokens proportional to elapsed time, capped at LIMIT_RATE.
  const elapsed = now - b.last;
  const refill = Math.floor(elapsed / LIMIT_WINDOW);
  if (refill > 0) {
    b.tokens = Math.min(LIMIT_RATE, b.tokens + refill);
    b.last = now;
  }
  if (b.tokens <= 0) {
    return res.status(429).json({ error: 'Too many booking requests. Please wait a moment before trying again.' });
  }
  b.tokens -= 1;
  return next();
}

// Periodic cleanup of stale buckets every 5 minutes.
setInterval(() => {
  const cutoff = Date.now() - LIMIT_WINDOW * 10;
  for (const [ip, b] of buckets) {
    if (b.last < cutoff) buckets.delete(ip);
  }
}, 300_000);

// Test hook: clear all buckets so rate-limit tests start from a clean slate.
export function __resetRateLimits() {
  buckets.clear();
}
