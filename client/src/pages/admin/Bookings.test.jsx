import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Bookings from './Bookings.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.jsx';

const paid = {
  id: 'b1', ref: 'WUPAID01', guest_name: 'Grace Oyelaran', guest_email: 'grace@example.com',
  room_name: 'Deluxe Garden', room_number: '1204', room_type: 'Deluxe', check_in: '2026-09-01', check_out: '2026-09-03',
  guests: 2, total: 398, status: 'confirmed', payment_status: 'paid',
};
const unpaid = {
  id: 'b2', ref: 'WUUNPAID1', guest_name: 'Daniel Meyer', guest_email: 'daniel@example.com',
  room_name: 'Classic Twin', room_number: '302', room_type: 'Standard', check_in: '2026-09-05', check_out: '2026-09-08',
  guests: 2, total: 417, status: 'confirmed', payment_status: 'unpaid',
};

function renderBookings() {
  return render(
    <>
      <ToastHost />
      <Bookings />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.mockImplementation((path) => {
    if (path.includes('payment=unpaid')) return Promise.resolve({ bookings: [unpaid] });
    if (path.includes('payment=paid')) return Promise.resolve({ bookings: [paid] });
    return Promise.resolve({ bookings: [paid, unpaid] });
  });
});

describe('admin Bookings view', () => {
  it('renders each booking with its payment status pill', async () => {
    renderBookings();

    expect(await screen.findByText('WUPAID01')).toBeInTheDocument();
    expect(screen.getByText('WUUNPAID1')).toBeInTheDocument();

    const paidRow = screen.getByText('WUPAID01').closest('tr');
    expect(within(paidRow).getByText('Paid')).toBeInTheDocument();
    // Room numbers lead the room cell for front-desk reference.
    expect(within(paidRow).getByText('Room 1204')).toBeInTheDocument();

    const unpaidRow = screen.getByText('WUUNPAID1').closest('tr');
    expect(within(unpaidRow).getByText('Unpaid')).toBeInTheDocument();
    expect(within(unpaidRow).getByText('Room 302')).toBeInTheDocument();
  });

  it('filters by payment status when a chip is clicked', async () => {
    const user = userEvent.setup();
    renderBookings();
    await screen.findByText('WUPAID01');

    await user.click(screen.getByRole('button', { name: 'Unpaid' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(expect.stringContaining('payment=unpaid'));
    });
    // Only the unpaid booking remains in the list.
    expect(await screen.findByText('WUUNPAID1')).toBeInTheDocument();
    expect(screen.queryByText('WUPAID01')).not.toBeInTheDocument();
  });

  it('combines status and payment filters in the query', async () => {
    const user = userEvent.setup();
    renderBookings();
    await screen.findByText('WUPAID01');

    await user.click(screen.getByRole('button', { name: 'Cancelled' }));
    await user.click(screen.getByRole('button', { name: 'Paid' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(expect.stringContaining('status=cancelled'));
      expect(api).toHaveBeenCalledWith(expect.stringContaining('payment=paid'));
    });
  });

  it('shows an empty state when no bookings match', async () => {
    api.mockResolvedValue({ bookings: [] });
    renderBookings();

    expect(await screen.findByText(/No bookings/)).toBeInTheDocument();
  });
});
