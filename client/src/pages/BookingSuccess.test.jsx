import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingSuccess from './BookingSuccess.jsx';

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.js';

const paidBooking = {
  ref: 'WUPAID42',
  guest_name: 'Jane Doe',
  guest_email: 'jane@example.com',
  room_name: 'Deluxe Garden',
  room_type: 'Deluxe',
  check_in: '2026-09-01',
  check_out: '2026-09-03',
  guests: 2,
  total: 398,
  payment_status: 'paid',
};

const unpaidBooking = { ...paidBooking, ref: 'WUPEND42', payment_status: 'unpaid' };

function renderPage(ref = 'WUPAID42', sessionId = 'cs_1') {
  return render(
    <MemoryRouter initialEntries={[`/booking/success?ref=${ref}&session_id=${sessionId}`]}>
      <BookingSuccess />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BookingSuccess', () => {
  it('shows the paid confirmation with reference and totals', async () => {
    api.mockResolvedValue({ booking: paidBooking });

    renderPage();

    expect(await screen.findByText("You're booked, Jane!")).toBeInTheDocument();
    expect(screen.getByText('WUPAID42')).toBeInTheDocument();
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('$398')).toBeInTheDocument();
    // Verify the payment-complete endpoint was called with the session id.
    expect(api).toHaveBeenCalledWith(
      '/api/bookings/WUPAID42/payment/complete',
      expect.objectContaining({ body: JSON.stringify({ session_id: 'cs_1' }) })
    );
  });

  it('shows a pending state when payment confirmation has not landed', async () => {
    api.mockImplementation((path) => {
      if (path.includes('/payment/complete')) {
        return Promise.reject(new Error('Payment for this booking is still pending.'));
      }
      if (path.startsWith('/api/bookings/')) {
        return Promise.resolve({ booking: unpaidBooking });
      }
      return Promise.reject(new Error(`Unexpected: ${path}`));
    });

    renderPage('WUPEND42');

    expect(await screen.findByText("We're confirming your payment")).toBeInTheDocument();
    expect(screen.getByText('WUPEND42')).toBeInTheDocument();
  });

  it('shows an error state when the booking cannot be found', async () => {
    api.mockRejectedValue(new Error('No booking found with that reference.'));

    renderPage('WUMISSING');

    expect(await screen.findByText("We couldn't find that booking")).toBeInTheDocument();
  });

  it('shows an error state when no reference is provided', async () => {
    render(
      <MemoryRouter initialEntries={['/booking/success']}>
        <BookingSuccess />
      </MemoryRouter>
    );

    expect(await screen.findByText("We couldn't find that booking")).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });
});
