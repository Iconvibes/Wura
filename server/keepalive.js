'use strict';

/*
 * Keep-alive self-ping — the "uptime keep robot".
 *
 * Free-tier hosts (Render, Railway, etc.) spin an instance down after ~15
 * minutes of inactivity. This module pings the app's own /health endpoint on
 * an interval shorter than the idle timeout, so the instance never goes cold.
 * The same /health URL is what you add to UptimeRobot for external monitoring.
 *
 * Behaviour:
 *   - Enabled by default in production, or whenever RENDER_EXTERNAL_URL is set
 *     (Render sets it automatically). Explicitly force on/off with KEEPALIVE=1
 *     / KEEPALIVE=0.
 *   - The ping target is the first of RENDER_EXTERNAL_URL, APP_URL, PUBLIC_URL.
 *   - Interval defaults to 8 minutes (Render's idle timeout is 15) and is
 *     tunable with KEEPALIVE_INTERVAL_MIN.
 *   - The interval timer is unref'd, so it never keeps the process alive on
 *     its own.
 */

const DEFAULT_INTERVAL_MIN = 8;

/** Public base URL the instance can ping itself at, or '' if unknown. */
export function resolveBaseUrl(env = process.env) {
  return env.RENDER_EXTERNAL_URL || env.APP_URL || env.PUBLIC_URL || '';
}

/** Should the self-ping loop run? Prod by default; opt-in/out anywhere else. */
export function shouldRun(env = process.env) {
  const k = String(env.KEEPALIVE ?? '').toLowerCase();
  if (k === '0' || k === 'false') return false;
  if (k === '1' || k === 'true') return true;
  return env.NODE_ENV === 'production' || Boolean(env.RENDER_EXTERNAL_URL);
}

/** Ping interval in milliseconds (default 8 min, tunable via env). */
export function intervalMs(env = process.env) {
  const n = Number(env.KEEPALIVE_INTERVAL_MIN);
  const min = Number.isFinite(n) && n > 0 ? n : DEFAULT_INTERVAL_MIN;
  return Math.round(min * 60 * 1000);
}

let lastPing = null; // { at, ok, status? }

/** Status block surfaced by the /health endpoint. */
export function getKeepAliveInfo(env = process.env) {
  return {
    enabled: shouldRun(env),
    intervalMin: intervalMs(env) / 60000,
    url: resolveBaseUrl(env),
    lastPing,
  };
}

/** Start the loop. No-ops (and returns a reason) when disabled or URL-less. */
export function startKeepAlive(env = process.env) {
  if (!shouldRun(env)) return { started: false, reason: 'disabled' };

  const base = resolveBaseUrl(env).replace(/\/+$/, '');
  if (!base) {
    console.warn('  ⚠ Keep-alive enabled but no public URL — set RENDER_EXTERNAL_URL / APP_URL / PUBLIC_URL.');
    return { started: false, reason: 'no url' };
  }

  const ms = intervalMs(env);
  const ping = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(`${base}/health`, { signal: controller.signal });
      lastPing = { at: new Date().toISOString(), ok: res.ok, status: res.status };
      if (!res.ok) console.warn(`  ⚠ Keep-alive ping → HTTP ${res.status}`);
    } catch (e) {
      lastPing = { at: new Date().toISOString(), ok: false };
      console.warn(`  ⚠ Keep-alive ping failed: ${e.message}`);
    } finally {
      clearTimeout(timer);
    }
  };

  // First ping shortly after boot (cold start), then on the interval.
  const first = setTimeout(ping, 10_000);
  const every = setInterval(ping, ms);
  first.unref?.();
  every.unref?.();

  console.log(`  ➜ Keep-alive: self-ping ${base}/health every ${ms / 60000} min (Render free-tier spin-down guard)`);
  return { started: true, url: base, intervalMin: ms / 60000 };
}
