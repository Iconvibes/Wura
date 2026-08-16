import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FrontDesk from './FrontDesk.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.js';

const unpaidArrival = {
  id: 'b1', ref: 'WUUNPAID1', guest_name: 'Daniel Meyer', guest_email: 'daniel@example.com',
  room_name: 'Classic Twin', room_type: 'Standard', room_art: 'data:image/svg+xml,x',
  check_in: '2026-09-01', check_out: '2026-09-03', guests: 2, total: 417,
  status: 'confirmed', payment_status: 'unpaid', notes: '',
};
const paidArrival = {
  id: 'b2', ref: 'WUPAID01', guest_name: 'Grace Oyelaran', guest_email: 'grace@example.com',
  room_name: 'Deluxe Garden', room_type: 'Deluxe', room_art: 'data:image/svg+xml,y',
  check_in: '2026-09-01', check_out: '2026-09-03', guests: 2, total: 398,
  status: 'confirmed', payment_status: 'paid', notes: 'Airport pickup',
};

beforeEach(() => {
  vi.clearAllMocks();
  api.mockImplementation((path, opts) => {
    if (path === '/api/admin/front-desk') {
      return Promise.resolve({ arrivals: [unpaidArrival, paidArrival], departures: [], today: '2026-09-01' });
    }
    if (path.startsWith('/api/admin/bookings/') && opts?.method === 'PATCH') {
      return Promise.resolve({ booking: { ...paidArrival, status: 'checked_in' } });
    }
    return Promise.reject(new Error(`Unexpected api call: ${path}`));
  });
});

function renderFrontDesk() {
  return render(
    <>
      <ToastHost />
      <FrontDesk />
    </>
  );
}

describe('admin Front Desk', () => {
  it('renders arrival cards with payment badges only for unpaid guests', async () => {
    renderFrontDesk();

    expect(await screen.findByText('Daniel Meyer')).toBeInTheDocument();
    expect(screen.getByText('Grace Oyelaran')).toBeInTheDocument();

    // Exactly one Unpaid badge (Daniel), none for Grace.
    expect(screen.getAllByText('Unpaid')).toHaveLength(1);
    const graceCard = screen.getByText('Grace Oyelaran').closest('.fd-card');
    expect(within(graceCard).queryByText('Unpaid')).not.toBeInTheDocument();
    expect(within(graceCard).getByText('Airport pickup')).toBeInTheDocument();
  });

  it('checks a guest in with one click and removes the card', async () => {
    const user = userEvent.setup();
    renderFrontDesk();
    await screen.findByText('Daniel Meyer');

    const danielCard = screen.getByText('Daniel Meyer').closest('.fd-card');
    await user.click(within(danielCard).getByRole('button', { name: /Check in/ }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        '/api/admin/bookings/b1',
        expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ status: 'checked_in' }) })
      );
    });
    // Card slides out after the success animation (600ms).
    await waitFor(() => {
      expect(screen.queryByText('Daniel Meyer')).not.toBeInTheDocument();
    }, { timeout: 2000 });
    expect(screen.getByText('Grace Oyelaran')).toBeInTheDocument();
  });

  it('shows an empty state for departures', async () => {
    renderFrontDesk();
    expect(await screen.findByText('No departures scheduled today')).toBeInTheDocument();
  });
});
