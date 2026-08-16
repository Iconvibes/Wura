'use strict';

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { app, startTestDB, stopTestDB } from './helpers.js';
import { shouldRun, resolveBaseUrl, intervalMs, getKeepAliveInfo } from '../keepalive.js';

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';

beforeAll(startTestDB);
afterAll(stopTestDB);

describe('GET /health', () => {
  it('reports ok with uptime and DB state as JSON', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.headers['cache-control']).toContain('no-store');
    expect(res.body.status).toBe('ok');
    expect(res.body.db).toBe('connected');
    expect(res.body.service).toBe('wura-grand-api');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(res.body.ts).getTime()).not.toBeNaN();
  });

  it('includes the keep-alive status block', async () => {
    const res = await request(app).get('/health').expect(200);
    expect(res.body.keepalive).toMatchObject({
      enabled: expect.any(Boolean),
      intervalMin: expect.any(Number),
      url: expect.any(String),
      lastPing: null, // no loop runs in tests
    });
  });

  it('returns JSON even for crawler user-agents (not prerendered HTML)', async () => {
    const res = await request(app).get('/health').set('User-Agent', GOOGLEBOT).expect(200);
    expect(res.headers['content-type']).toContain('application/json');
    expect(res.text).not.toContain('aggregateRating');
    expect(res.text).not.toContain('application/ld+json');
  });
});

describe('keepalive self-ping config', () => {
  it('runs in production by default, but not in dev/test', () => {
    expect(shouldRun({ NODE_ENV: 'production' })).toBe(true);
    expect(shouldRun({ NODE_ENV: 'test' })).toBe(false);
    expect(shouldRun({})).toBe(false);
  });

  it('auto-enables whenever Render sets RENDER_EXTERNAL_URL', () => {
    expect(shouldRun({ RENDER_EXTERNAL_URL: 'https://wura-grand.onrender.com' })).toBe(true);
  });

  it('KEEPALIVE flag overrides everything', () => {
    expect(shouldRun({ NODE_ENV: 'production', KEEPALIVE: '0' })).toBe(false);
    expect(shouldRun({ NODE_ENV: 'test', KEEPALIVE: '1' })).toBe(true);
    expect(shouldRun({ NODE_ENV: 'production', KEEPALIVE: 'false' })).toBe(false);
  });

  it('prefers RENDER_EXTERNAL_URL, then APP_URL, then PUBLIC_URL', () => {
    const env = {
      RENDER_EXTERNAL_URL: 'https://a.onrender.com',
      APP_URL: 'https://b.example',
      PUBLIC_URL: 'https://c.example',
    };
    expect(resolveBaseUrl(env)).toBe('https://a.onrender.com');
    expect(resolveBaseUrl({ APP_URL: 'https://b.example' })).toBe('https://b.example');
    expect(resolveBaseUrl({ PUBLIC_URL: 'https://c.example' })).toBe('https://c.example');
    expect(resolveBaseUrl({})).toBe('');
  });

  it('pings every 8 minutes by default and honors KEEPALIVE_INTERVAL_MIN', () => {
    expect(intervalMs({})).toBe(8 * 60 * 1000);
    expect(intervalMs({ KEEPALIVE_INTERVAL_MIN: '5' })).toBe(5 * 60 * 1000);
    expect(intervalMs({ KEEPALIVE_INTERVAL_MIN: 'bogus' })).toBe(8 * 60 * 1000);
  });

  it('exposes the info block used by /health', () => {
    expect(getKeepAliveInfo({ NODE_ENV: 'production', RENDER_EXTERNAL_URL: 'https://a.onrender.com' })).toMatchObject({
      enabled: true,
      intervalMin: 8,
      url: 'https://a.onrender.com',
    });
  });
});
