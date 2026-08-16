'use strict';

/* ------------------------------ date helpers ------------------------------ */

export const today = () => new Date().toISOString().slice(0, 10);

export function addDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days)); // timezone-safe
  return dt.toISOString().slice(0, 10);
}

export function nightsBetween(checkIn, checkOut) {
  return Math.round((Date.parse(checkOut) - Date.parse(checkIn)) / 86400000);
}

export const money = (n) => `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function validDate(s) {
  if (typeof s !== 'string' || !DATE_RE.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d)); // timezone-safe
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isOverlapping(aIn, aOut, bIn, bOut) {
  return aIn < bOut && bIn < aOut; // half-open interval [in, out)
}

export function newRef() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return 'WU' + s;
}

/* ------------------------- mongoose doc serializers ----------------------- */

/**
 * Serialize a room document for the public API: flatten _id to id, keep the
 * amenities array intact.
 */
export function roomToJson(r) {
  const o = r.toObject ? r.toObject() : r;
  return {
    id: String(o._id),
    name: o.name,
    type: o.type,
    description: o.description,
    price: o.price,
    capacity: o.capacity,
    size_sqm: o.size_sqm,
    amenities: o.amenities || [],
    art: o.art,
    status: o.status,
  };
}

/**
 * Serialize a booking doc, optionally joining the room (name/type/art) and
 * exposing room_id for the admin client.
 */
export function bookingToJson(b) {
  const o = b.toObject ? b.toObject() : b;
  const room = o.room || {};
  return {
    id: String(o._id),
    ref: o.ref,
    room_id: room._id ? String(room._id) : (o.room_id != null ? String(o.room_id) : null),
    room_name: room.name || o.room_name || null,
    room_type: room.type || o.room_type || null,
    room_art: room.art || o.room_art || null,
    guest_name: o.guest_name,
    guest_email: o.guest_email,
    guest_phone: o.guest_phone || '',
    check_in: o.check_in,
    check_out: o.check_out,
    guests: o.guests,
    total: o.total,
    status: o.status,
    payment_status: o.payment_status || 'unpaid',
    paid_at: o.paid_at || null,
    notes: o.notes || '',
    created_at: o.created_at || o.createdAt,
  };
}
