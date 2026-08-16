'use strict';

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import {
  app, startTestDB, stopTestDB, clearDB, resetRateLimits, makeRoom, makeBooking, bookingPayload,
} from './helpers.js';

beforeAll(startTestDB);
afterAll(stopTestDB);
beforeEach(async () => {
  await clearDB();
  resetRateLimits();
});

/**
 * Creates a booking via the API and returns { booking, checkout_url, session_id }.
 */
async function createUnpaidBooking() {
  const room = await makeRoom({ name: 'Payable Room', price: 150 });
  const res = await request(app).post('/api/bookings').send(bookingPayload(room._id)).expect(201);
  const sessionId = res.body.checkout_url.split('/').pop();
  return { booking: res.body.booking, checkoutUrl: res.body.checkout_url, sessionId };
}

describe('mock checkout flow (no Stripe key configured)', () => {
  it('creates a booking pointing at the sandbox checkout page', async () => {
    const { booking, checkoutUrl } = await createUnpaidBooking();
    expect(booking.payment_status).toBe('unpaid');
    expect(checkoutUrl).toMatch(/\/mock-checkout\/mock_cs_/);
  });

  it('serves the hosted checkout page with the order summary', async () => {
    const { checkoutUrl } = await createUnpaidBooking();
    const res = await request(app).get(new URL(checkoutUrl).pathname).expect(200);
    expect(res.text).toContain('WURA GRAND');
    expect(res.text).toContain('Payable Room');
    expect(res.text).toContain('Pay $300'); // 2 nights × $150
  });

  it('marks the booking paid when the guest pays, then redirects', async () => {
    const { booking, sessionId } = await createUnpaidBooking();

    const payRes = await request(app).post(`/mock-checkout/${sessionId}/pay`).expect(302);
    expect(payRes.headers.location).toContain(`/booking/success?ref=${booking.ref}`);

    const done = await request(app)
      .post(`/api/bookings/${booking.ref}/payment/complete`)
      .send({ session_id: sessionId })
      .expect(200);
    expect(done.body.booking.payment_status).toBe('paid');
    expect(done.body.booking.paid_at).toBeTruthy();
  });

  it('completion is idempotent — calling it twice stays paid', async () => {
    const { booking, sessionId } = await createUnpaidBooking();
    await request(app).post(`/mock-checkout/${sessionId}/pay`).expect(302);

    await request(app)
      .post(`/api/bookings/${booking.ref}/payment/complete`)
      .send({ session_id: sessionId })
      .expect(200);
    const again = await request(app)
      .post(`/api/bookings/${booking.ref}/payment/complete`)
      .send({ session_id: sessionId })
      .expect(200);
    expect(again.body.booking.payment_status).toBe('paid');
  });

  it('reports pending when payment has not happened', async () => {
    const { booking, sessionId } = await createUnpaidBooking();
    const res = await request(app)
      .post(`/api/bookings/${booking.ref}/payment/complete`)
      .send({ session_id: sessionId })
      .expect(402);
    expect(res.body.error).toMatch(/pending/i);
    expect(res.body.booking.payment_status).toBe('unpaid');
  });
});

describe('webhook endpoint', () => {
  it('accepts the mock envelope and marks the booking paid', async () => {
    const { booking, sessionId } = await createUnpaidBooking();

    const res = await request(app)
      .post('/api/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .send({ mock: true, session_id: sessionId })
      .expect(200);
    expect(res.body.received).toBe(true);

    const lookup = await request(app).get(`/api/bookings/${booking.ref}`).expect(200);
    expect(lookup.body.booking.payment_status).toBe('paid');
  });

  it('handles a cancelled checkout gracefully (booking stays unpaid)', async () => {
    const { booking } = await createUnpaidBooking();
    const res = await request(app).get(`/api/bookings/${booking.ref}`).expect(200);
    expect(res.body.booking.payment_status).toBe('unpaid');
  });
});

describe('seeded fixtures carry payment state', () => {
  it('serializes payment_status and paid_at on bookings', async () => {
    const room = await makeRoom();
    const b = await makeBooking(room._id, { payment_status: 'paid', paid_at: new Date() });

    const res = await request(app).get(`/api/bookings/${b.ref}`).expect(200);
    expect(res.body.booking.payment_status).toBe('paid');
    expect(res.body.booking.paid_at).toBeTruthy();
  });
});
