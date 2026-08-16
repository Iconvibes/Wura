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
 * (to, subject, text). Silently skipped under NODE_ENV=test.
 */
export function sendConfirmationEmail(to, subject, text) {
  if (process.env.NODE_ENV === 'test') return;

  console.log(`\n  ✉ [EMAIL] → ${to}`);
  console.log(`  Subject: ${subject}`);
  console.log(`${text}\n`);

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] TO:${to} | SUBJECT:${subject}\n${text}\n\n`, 'utf-8');
  } catch { /* ignore write errors */ }
}

/**
 * sendContactMessage — logs a guest enquiry from the contact form to the same
 * data/emails.log, matching the confirmation-email pattern. Swap for a real
 * mailer (or a CRM/webhook) when credentials exist. Silently skipped in tests.
 */
export function sendContactMessage({ name, email, subject, message }) {
  if (process.env.NODE_ENV === 'test') return;

  const subjectLine = `Contact form · ${subject || 'Enquiry'} · from ${name}`;
  const text = [
    `─── ✦ WURA GRAND HOTEL — Contact Form ✦ ───`,
    `From:      ${name}`,
    `Email:     ${email}`,
    `Subject:   ${subject || 'Enquiry'}`,
    `Message:`,
    `${message}`,
    `───`,
  ].join('\n');

  console.log(`\n  ✉ [CONTACT] → ${email}`);
  console.log(`  Subject: ${subjectLine}`);
  console.log(`${text}\n`);

  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    const ts = new Date().toISOString();
    fs.appendFileSync(LOG_FILE, `[${ts}] TO:${email} | SUBJECT:${subjectLine}\n${text}\n\n`, 'utf-8');
  } catch { /* ignore write errors */ }
}

/**
 * saveContactMessage — persists a guest enquiry to MongoDB (the admin inbox's
 * source of truth, with read/unread state) AND appends to data/emails.log,
 * keeping the old audit trail intact. Only the DB copy carries `read` state.
 * The log append is skipped under NODE_ENV=test; the DB write always happens
 * so tests can assert on the inbox.
 */
export async function saveContactMessage({ name, email, subject, message }) {
  const { default: Message } = await import('./models/Message.js');
  const doc = await Message.create({
    name,
    email,
    subject: subject || 'Enquiry',
    message,
    sent_at: new Date(),
  });

  if (process.env.NODE_ENV !== 'test') {
    sendContactMessage({ name, email, subject, message });
  }
  return doc;
}

export function buildConfirmationEmail(booking, room) {
  const to = booking.guest_email;
  const subject = `Your booking ${booking.ref} at Wura Grand Hotel is confirmed`;
  const lines = [
    `─── ✦ WURA GRAND HOTEL — Booking Confirmation ✦ ───`,
    `To:          ${to}`,
    `Reference:   ${booking.ref}`,
    `Guest:       ${booking.guest_name}`,
    `Room:        ${room.room_number ? `Room ${room.room_number} — ` : ''}${room.name} (${room.type})`,
    `Check-in:    ${booking.check_in}`,
    `Check-out:   ${booking.check_out}`,
    `Guests:      ${booking.guests}`,
    `Total:       $${Math.round(booking.total).toLocaleString('en')}`,
    `Payment:     ${booking.payment_status === 'paid' ? 'Paid' : 'Pending'}${booking.payment_status === 'paid' && booking.paid_at ? ` (${new Date(booking.paid_at).toISOString().slice(0, 16).replace('T', ' ')})` : ''}`,
    `Status:      ${booking.status}`,
    `Check-in is at 15:00 · Check-out at 11:00.`,
    `Free cancellation up to 48h before arrival.`,
    `Questions?  Reply to this email or call +1 (555) 012-1962.`,
    `───`,
  ];
  return { to, subject, text: lines.join('\n') };
}
