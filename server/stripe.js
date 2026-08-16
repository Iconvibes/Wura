'use strict';

import { Router } from 'express';
import Stripe from 'stripe';
import Booking from './models/Booking.js';
import Room from './models/Room.js';
import { buildConfirmationEmail, sendConfirmationEmail } from './email.js';
import { money } from './lib.js';

const fmtIso = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/* -------------------------------------------------------------------------- */
/*  Stripe adapter — real Checkout when a test/live key is configured,        */
/*  otherwise an in-app mock that mirrors the hosted flow (dev friendly).     */
/* -------------------------------------------------------------------------- */

const SECRET = process.env.STRIPE_SECRET_KEY || '';
const ENDPOINT_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://127.0.0.1:5173';

export const stripe = SECRET ? new Stripe(SECRET) : null;
// Mock mode is a dev convenience only — never expose it in production.
export const isMock = !stripe && process.env.NODE_ENV !== 'production';

export function paymentsMode() {
  if (stripe) return 'Stripe Checkout mode (live/test key configured)';
  if (isMock) return 'MOCK checkout mode (no STRIPE_SECRET_KEY set)';
  return 'DISABLED — no STRIPE_SECRET_KEY set in production';
}
console.log(`  💳 Payments: ${paymentsMode()}.`);

/* ------------------------------- mock store ------------------------------- */
const mockSessions = new Map(); // sessionId -> session record
const mockId = () => 'mock_cs_' + Math.random().toString(36).slice(2, 12);

/**
 * Create a Checkout Session for a booking.
 * Real mode: Stripe Checkout Session; Mock mode: in-memory session whose url
 * points at this server's /mock-checkout/:id page.
 * Returns { id, url }.
 */
export async function createCheckoutSession({ booking, room, nights, serverOrigin }) {
  const unitAmount = Math.round(booking.total * 100);
  const nightsLabel = `${nights} night${nights === 1 ? '' : 's'}`;
  const successUrl = `${CLIENT_ORIGIN}/booking/success?ref=${encodeURIComponent(booking.ref)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${CLIENT_ORIGIN}/?cancelled=${encodeURIComponent(booking.ref)}`;

  if (stripe) {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      client_reference_id: booking.ref,
      customer_email: booking.guest_email,
      metadata: { ref: booking.ref, booking_id: String(booking._id) },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${room.room_number ? `Room ${room.room_number} · ` : ''}${room.name} · ${nightsLabel}`,
              description: room.description ? room.description.slice(0, 190) : undefined,
            },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
    return { id: session.id, url: session.url };
  }

  // Mock mode: keep a session record and serve a checkout page ourselves.
  if (!isMock) throw new Error('Payments are not configured (STRIPE_SECRET_KEY required in production).');
  const id = mockId();
  mockSessions.set(id, {
    id,
    ref: booking.ref,
    bookingId: String(booking._id),
    guest_name: booking.guest_name,
    guest_email: booking.guest_email,
    room_name: room.name,
    room_number: room.room_number,
    room_art: room.art,
    check_in: booking.check_in,
    check_out: booking.check_out,
    nights,
    total: booking.total,
    payment_status: 'unpaid',
    successUrl: `${CLIENT_ORIGIN}/booking/success?ref=${encodeURIComponent(booking.ref)}&session_id=${id}`,
    cancelUrl: `${CLIENT_ORIGIN}/?cancelled=${encodeURIComponent(booking.ref)}`,
  });
  return { id, url: `${serverOrigin}/mock-checkout/${id}` };
}

/** Fetch a session (real: Stripe API; mock: in-memory store). Null if unknown. */
export async function getSession(id) {
  if (!id) return null;
  if (stripe) {
    const s = await stripe.checkout.sessions.retrieve(id);
    return {
      id: s.id,
      ref: s.client_reference_id || s.metadata?.ref || null,
      payment_status: s.payment_status,
      total: (s.amount_total || 0) / 100,
    };
  }
  return mockSessions.get(id) || null;
}

/**
 * Mark a booking paid for a completed session and send the confirmation email.
 * Idempotent — safe to call from both the webhook and the success-page verify
 * endpoint. Returns the updated (populated) booking, or null if nothing found.
 */
export async function completeSession(sessionId) {
  const session = await getSession(sessionId);
  if (!session || session.payment_status !== 'paid') return null;

  let booking = await Booking.findOne({ stripe_session_id: sessionId });
  if (!booking && session.ref) booking = await Booking.findOne({ ref: session.ref });
  if (!booking) return null;

  // Atomic claim: only the first caller flips unpaid → paid, so the webhook
  // and the success-page verify can race without double-sending the email.
  const claimed = await Booking.findOneAndUpdate(
    { _id: booking._id, payment_status: { $ne: 'paid' } },
    { payment_status: 'paid', paid_at: new Date() },
    { new: true }
  ).populate('room', 'name room_number floor type art');

  if (claimed) {
    const room = claimed.room;
    if (room && room.name) {
      const mail = buildConfirmationEmail({ ...claimed.toObject(), guest_email: claimed.guest_email }, room);
      sendConfirmationEmail(mail.to, mail.subject, mail.text);
    }
    return claimed;
  }

  // Already paid — return the current state.
  await booking.populate('room', 'name room_number floor type art');
  return booking;
}

/**
 * Stripe webhook entry point. In real mode the raw body + signature are
 * verified with the SDK; in mock mode the body is a JSON { mock, session_id }
 * envelope (also used by tests / the mock checkout page).
 */
export async function handleStripeWebhook(rawBody, signature) {
  if (stripe) {
    const event = stripe.webhooks.constructEvent(rawBody, signature, ENDPOINT_SECRET);
    if (event.type === 'checkout.session.completed') {
      await completeSession(event.data.object.id);
    }
    return { received: true, type: event.type };
  }
  if (!isMock) throw new Error('Webhook requires STRIPE_SECRET_KEY in production.');
  const body = JSON.parse(rawBody.toString('utf8'));
  if (body?.mock === true && body.session_id) {
    // A real checkout.session.completed event means payment succeeded — mirror
    // that in the mock store so the webhook alone can complete a booking.
    const s = mockSessions.get(body.session_id);
    if (s) s.payment_status = 'paid';
    await completeSession(body.session_id);
  }
  return { received: true };
}

/* -------------------------------------------------------------------------- */
/*  Mock checkout page — only mounted when no real Stripe key is configured.  */
/*  Mirrors Stripe's hosted page: summary + pay button, then redirects to the */
/*  success URL.                                                              */
/* -------------------------------------------------------------------------- */

export const mockCheckoutRouter = Router();

mockCheckoutRouter.get('/mock-checkout/:id', (req, res) => {
  const s = mockSessions.get(req.params.id);
  if (!s) {
    return res.status(404).send('<h1>Checkout session not found or expired</h1><p><a href="/">Back to home</a></p>');
  }

  const art = s.room_art ? `<img src="${s.room_art.replace(/"/g, '&quot;')}" alt="" class="art" />` : '';
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Secure checkout · Wura Grand Hotel</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body {
    min-height: 100vh; display: grid; place-items: center; padding: 24px;
    font-family: ui-serif, Georgia, 'Times New Roman', serif;
    background: radial-gradient(900px 500px at 50% -10%, rgba(212,175,55,.16), transparent 60%), #0a0f1c;
    color: #f5efe0;
  }
  .wrap { width: 100%; max-width: 460px; }
  .brand { text-align: center; margin-bottom: 18px; }
  .brand .logo { font-size: 20px; letter-spacing: 4px; color: #f5efe0; }
  .brand .sub { font-size: 10px; letter-spacing: 3px; color: #d4af37; text-transform: uppercase; margin-top: 4px; }
  .card {
    background: #101a2c; border: 1px solid rgba(212,175,55,.28); border-radius: 18px;
    padding: 26px; box-shadow: 0 30px 80px rgba(0,0,0,.5);
  }
  .tag {
    display: inline-block; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;
    color: #d4af37; border: 1px solid rgba(212,175,55,.4); background: rgba(212,175,55,.1);
    border-radius: 999px; padding: 4px 10px; margin-bottom: 16px;
  }
  .row { display: flex; align-items: center; gap: 14px; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,.06); }
  .art { width: 64px; height: 44px; object-fit: cover; border-radius: 8px; border: 1px solid rgba(212,175,55,.25); }
  .lbl { font-size: 11px; color: #93a1b8; text-transform: uppercase; letter-spacing: 1.5px; }
  .val { font-size: 14px; color: #f5efe0; }
  .total { display: flex; justify-content: space-between; align-items: baseline; padding: 16px 0 6px; }
  .total .amt { font-size: 28px; color: #d4af37; }
  .field { margin-top: 16px; }
  .field label { display: block; font-size: 11px; color: #93a1b8; letter-spacing: 1.5px; text-transform: uppercase; margin-bottom: 6px; }
  .field input {
    width: 100%; padding: 13px 14px; border-radius: 10px; font-size: 14px; color: #f5efe0;
    background: #0a0f1c; border: 1px solid rgba(255,255,255,.14); font-family: ui-monospace, monospace;
  }
  .field input:disabled { opacity: .55; }
  .note { font-size: 11.5px; color: #93a1b8; margin-top: 10px; text-align: center; font-family: ui-sans-serif, system-ui, sans-serif; }
  .pay {
    margin-top: 22px; width: 100%; padding: 15px; border: 0; border-radius: 12px; cursor: pointer;
    background: linear-gradient(135deg, #e6c75e, #d4af37); color: #0a0f1c;
    font-family: ui-serif, Georgia, serif; font-size: 17px; font-weight: 700; letter-spacing: .5px;
    box-shadow: 0 12px 30px rgba(212,175,55,.35); transition: transform .15s ease, box-shadow .15s ease;
  }
  .pay:hover { transform: translateY(-1px); box-shadow: 0 16px 40px rgba(212,175,55,.45); }
  .cancel { display: block; text-align: center; margin-top: 14px; font-family: ui-sans-serif, system-ui, sans-serif;
    font-size: 12.5px; color: #93a1b8; text-decoration: none; }
  .cancel:hover { color: #f5efe0; }
  .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="logo">WURA GRAND</div>
      <div class="sub">Secure checkout · Test mode</div>
    </div>
    <div class="card">
      <span class="tag">Sandbox payment — no real charge</span>
      <div class="row">${art}<div><div class="lbl">Stay</div><div class="val">${s.room_number ? `Room ${s.room_number} · ` : ''}${s.room_name}</div></div></div>
      <div class="row"><div style="flex:1"><div class="lbl">Guest</div><div class="val">${s.guest_name}</div></div><div style="flex:1"><div class="lbl">Dates</div><div class="val">${fmtIso(s.check_in)} → ${fmtIso(s.check_out)}</div></div></div>
      <div class="total"><span class="lbl">Total</span><span class="amt">${money(s.total)}</span></div>
      <div class="cols">
        <div class="field"><label>Card number</label><input value="4242 4242 4242 4242" disabled /></div>
        <div class="field"><label>Expiry · CVC</label><input value="12 / 34 · 567" disabled /></div>
      </div>
      <p class="note">This is a mock checkout for local development. It will not charge any card.</p>
      <form method="POST" action="/mock-checkout/${s.id}/pay">
        <button class="pay" type="submit">Pay ${money(s.total)}</button>
      </form>
      <a class="cancel" href="${s.cancelUrl}">Cancel and return to the hotel</a>
    </div>
  </div>
</body>
</html>`;
  res.type('html').send(html);
});

mockCheckoutRouter.post('/mock-checkout/:id/pay', async (req, res) => {
  const s = mockSessions.get(req.params.id);
  if (!s) return res.status(404).json({ error: 'Checkout session not found or expired.' });
  s.payment_status = 'paid';
  await completeSession(s.id);
  res.redirect(s.successUrl);
});
