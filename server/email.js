'use strict';

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_DIR = path.join(__dirname, '..', 'data');
const LOG_FILE = path.join(LOG_DIR, 'emails.log');

/**
 * sendConfirmationEmail — a stub that logs a structured email to the console
 * and appends it to data/emails.log. Swap the body for nodemailer, SendGrid,
 * or SES when you have credentials. Signature matches a real mailer:
 * (to, subject, text).
 */
export function sendConfirmationEmail(to, subject, text) {
  console.log(`\n  ✉ [EMAIL] → ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`${text}\n`);

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] TO:${to} | SUBJECT:${subject}\n${text}\n\n`, 'utf-8');
  } catch { /* ignore write errors */ }
}

export function buildConfirmationEmail(booking, room) {
  const to = booking.guest_email;
  const subject = `Your booking ${booking.ref} at Wura Grand Hotel is confirmed`;
  const lines = [
    `─── ✦ WURA GRAND HOTEL — Booking Confirmation ✦ ───`,
    `To:          ${to}`,
    `Reference:   ${booking.ref}`,
    `Guest:       ${booking.guest_name}`,
    `Room:        ${room.name} (${room.type})`,
    `Check-in:    ${booking.check_in}`,
    `Check-out:   ${booking.check_out}`,
    `Guests:      ${booking.guests}`,
    `Total:       $${Math.round(booking.total).toLocaleString('en')}`,
    `Status:      ${booking.status}`,
    `Check-in is at 15:00 · Check-out at 11:00.`,
    `Free cancellation up to 48h before arrival.`,
    `Questions?  Reply to this email or call +1 (555) 012-1962.`,
    `───`,
  ];
  return { to, subject, text: lines.join('\n') };
}
