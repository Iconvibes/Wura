// Shared API helper for the React client.
import { ADMIN_PATH } from './lib/adminPath.js';

export async function api(path, opts = {}) {
  const token = localStorage.getItem('wura_token') || '';
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(opts.headers || {}),
  };
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path.startsWith('/api/admin')) {
    localStorage.removeItem('wura_token');
    if (window.location.pathname.startsWith(ADMIN_PATH) && !window.location.pathname.endsWith('/login')) {
      window.location.href = `${ADMIN_PATH}/login`;
    }
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const money = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export function fmtDate(iso) {
  if (!iso) return '';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

export function pad(n) { return String(n).padStart(2, '0'); }

export function isoDate(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(iso, n) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function nightsBetween(a, b) {
  return Math.round((new Date(`${b}T00:00:00`) - new Date(`${a}T00:00:00`)) / 86400000);
}

export function todayISO() {
  return isoDate(new Date());
}
