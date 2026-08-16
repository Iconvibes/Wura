import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FindBookingModal from './FindBookingModal.jsx';

vi.mock('../api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.js';

const booking = {
  ref: 'WU1A2B3',
  room_name: 'Deluxe Garden',
  room_type: 'Deluxe',
  guest_name: 'Jane Doe',
  check_in: '2026-09-01',
  check_out: '2026-09-03',
  guests: 2,
  total: 398,
  status: 'confirmed',
};

function renderModal() {
  return render(<FindBookingModal open onClose={vi.fn()} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('FindBookingModal', () => {
  it('looks up the booking after a 350ms debounce and shows the summary', async () => {
    const user = userEvent.setup();
    api.mockResolvedValue({ booking });

    renderModal();
    await user.type(screen.getByPlaceholderText('e.g. WU1A2B3C'), 'wu1a2b3');

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/bookings/WU1A2B3');
    });
    expect(await screen.findByText('WU1A2B3')).toBeInTheDocument();
    expect(screen.getByText('Deluxe Garden · Deluxe')).toBeInTheDocument();
    expect(screen.getByText('confirmed')).toBeInTheDocument();
  });

  it('shows the error message for an unknown reference', async () => {
    const user = userEvent.setup();
    api.mockRejectedValue(new Error('No booking found with that reference.'));

    renderModal();
    await user.type(screen.getByPlaceholderText('e.g. WU1A2B3C'), 'WUNOPE1');

    expect(await screen.findByText('No booking found with that reference.')).toBeInTheDocument();
  });

  it('does not search while the reference is shorter than 6 characters', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.type(screen.getByPlaceholderText('e.g. WU1A2B3C'), 'WU');

    await waitFor(() => expect(screen.queryByRole('textbox')).toBeInTheDocument());
    expect(api).not.toHaveBeenCalled();
  });
});
