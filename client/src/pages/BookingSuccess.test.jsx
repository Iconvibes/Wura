import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BookingSuccess from './BookingSuccess.jsx';

vi.mock('../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.jsx';

const booking = {
  ref: 'WUPAID42',
  guest_name: 'Jane Doe',
  guest_email: 'jane@example.com',
  room_name: 'Deluxe Garden',
  room_number: '1204',
  room_type: 'Deluxe',
  check_in: '2026-09-01',
  check_out: '2026-09-03',
  guests: 2,
  total: 398,
  payment_status: 'unpaid',
};

function renderPage(ref = 'WUPAID42') {
  return render(
    <MemoryRouter initialEntries={[`/booking/success?ref=${ref}`]}>
      <BookingSuccess />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('BookingSuccess', () => {
  it('shows the booking confirmation with reference and totals', async () => {
    api.mockResolvedValue({ booking });

    renderPage();

    expect(await screen.findByText("You're booked, Jane!")).toBeInTheDocument();
    expect(screen.getByText('WUPAID42')).toBeInTheDocument();
    expect(screen.getByText('Pay at front desk')).toBeInTheDocument();
    expect(screen.getByText('$398')).toBeInTheDocument();
    // Should fetch the booking by ref — no payment/complete call.
    expect(api).toHaveBeenCalledWith('/api/bookings/WUPAID42');
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
