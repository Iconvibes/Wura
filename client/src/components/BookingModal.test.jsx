import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BookingModal from './BookingModal.jsx';
import { ToastHost } from './Toast.jsx';

vi.mock('../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.jsx';

const roomA = { id: 'r1', name: 'Deluxe Garden', type: 'Deluxe', price: 199, capacity: 3, size_sqm: 36, art: 'data:image/svg+xml,x', description: 'Garden room' };
const roomB = { id: 'r2', name: 'Skyline Suite', type: 'Suite', price: 399, capacity: 4, size_sqm: 60, art: 'data:image/svg+xml,y', description: 'Corner suite' };

const baseDates = { checkIn: '2026-09-01', checkOut: '2026-09-03' };

const realLocation = window.location;

function renderModal(props = {}) {
  const dates = props.dates || { ...baseDates };
  return render(
    <>
      <ToastHost />
      <BookingModal
        open
        onClose={vi.fn()}
        initialRoom={null}
        dates={dates}
        setDates={vi.fn()}
        guests={2}
        setGuests={vi.fn()}
        {...props}
      />
    </>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(window, 'location', { writable: true, value: { href: realLocation.href } });
  api.mockImplementation((path) => {
    if (path.startsWith('/api/rooms') && path.includes('/price')) {
      return Promise.resolve({ perNight: 199, basePrice: 199, total: 398, adjustments: [], minNights: 0 });
    }
    if (path.startsWith('/api/rooms')) {
      return Promise.resolve({ rooms: [roomA, roomB] });
    }
    if (path === '/api/upsells') {
      return Promise.resolve({ products: [] });
    }
    return Promise.reject(new Error(`Unexpected api call: ${path}`));
  });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { value: realLocation });
});

describe('BookingModal — step 1 (dates)', () => {
  it('requires both dates before continuing', async () => {
    const user = userEvent.setup();
    renderModal({ dates: { checkIn: '', checkOut: '' } });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Please choose both dates.')).toBeInTheDocument();
    expect(screen.getByText('When would you like to stay?')).toBeInTheDocument(); // still on step 1
  });

  it('rejects a check-out on or before check-in', async () => {
    const user = userEvent.setup();
    renderModal({ dates: { checkIn: '2026-09-05', checkOut: '2026-09-05' } });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(await screen.findByText('Check-out must be after check-in.')).toBeInTheDocument();
  });
});

describe('BookingModal — booking flow', () => {
  it('preselects a room and starts at step 2 when initialRoom is given', async () => {
    renderModal({ initialRoom: roomA });

    expect(screen.getByText('Confirm your room')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Garden')).toBeInTheDocument();
    // Dynamic pricing API call is expected when initialRoom is given
    expect(api).toHaveBeenCalledWith(expect.stringContaining('/api/rooms'));
    // But the room LIST endpoint should not be called
    expect(api).not.toHaveBeenCalledWith(expect.stringMatching(/^\/api\/rooms\?/));
  });

  it('redirects to confirmation page after confirming details', async () => {
    const user = userEvent.setup();
    api.mockImplementation((path, opts) => {
      if (path.startsWith('/api/rooms') && path.includes('/price')) {
        return Promise.resolve({ perNight: 199, basePrice: 199, total: 398, adjustments: [], minNights: 0 });
      }
      if (path.startsWith('/api/rooms')) return Promise.resolve({ rooms: [roomA, roomB] });
      if (path === '/api/upsells') return Promise.resolve({ products: [] });
      if (path === '/api/bookings') {
        return Promise.resolve({
          booking: { ref: 'WUABC123', payment_status: 'unpaid' },
          checkout_url: 'http://localhost:5173/booking/success?ref=WUABC123',
        });
      }
      return Promise.reject(new Error(`Unexpected api call: ${path}`));
    });

    renderModal();

    // Step 1 → 2
    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await screen.findByText('Deluxe Garden');

    // Pick a room
    await user.click(screen.getByText('Deluxe Garden'));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    // Step 3 — guest details
    expect(screen.getByText('Your details')).toBeInTheDocument();
    await user.type(screen.getByPlaceholderText('e.g. Amara Okafor'), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'jane@example.com');

    await user.click(screen.getByRole('button', { name: /Confirm booking/i }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/bookings', expect.objectContaining({ method: 'POST' }));
    });
    const [, opts] = api.mock.calls.find(([p]) => p === '/api/bookings');
    expect(JSON.parse(opts.body)).toMatchObject({
      room_id: 'r1',
      guest_name: 'Jane Doe',
      guest_email: 'jane@example.com',
      check_in: '2026-09-01',
      check_out: '2026-09-03',
      guests: 2,
    });
    expect(window.location.href).toBe('http://localhost:5173/booking/success?ref=WUABC123');
  });

  it('shows the selected room summary including the nightly total', async () => {
    const user = userEvent.setup();
    renderModal({ initialRoom: roomA });

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    expect(screen.getByText('Your details')).toBeInTheDocument();
    // 2 nights × $199
    expect(screen.getByText('₦398')).toBeInTheDocument();
  });

  it('validates guest details before creating the booking', async () => {
    const user = userEvent.setup();
    renderModal({ initialRoom: roomA });

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: /Confirm booking/i }));

    expect(await screen.findByText('Please enter your full name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email.')).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/api/bookings', expect.anything());
  });
});
