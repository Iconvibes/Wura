import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RoomDetail from './RoomDetail.jsx';

vi.mock('../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.jsx';

const room = {
  id: 'r1',
  name: 'Deluxe Garden',
  type: 'Deluxe',
  price: 199,
  capacity: 3,
  size_sqm: 36,
  description: 'Wake to the gardens.',
  amenities: ['Garden view', 'Espresso bar'],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('RoomDetail page', () => {
  it('fetches and renders the room with specs and amenities', async () => {
    api.mockResolvedValue({ room }); // by-id endpoint wraps the room
    render(
      <MemoryRouter initialEntries={['/rooms/r1']}>
        <Routes>
          <Route path="/rooms/:id" element={<RoomDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Deluxe Garden' })).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/api/rooms/r1');
    expect(screen.getByText('₦199')).toBeInTheDocument();
    expect(screen.getByText('Garden view')).toBeInTheDocument();
    expect(screen.getByText('Espresso bar')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reserve this room/i })).toBeInTheDocument();
  });

  it('shows a not-found state when the room is missing', async () => {
    api.mockRejectedValue(new Error('Not found'));
    render(
      <MemoryRouter initialEntries={['/rooms/ghost']}>
        <Routes>
          <Route path="/rooms/:id" element={<RoomDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/taken off the market/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to all rooms/i })).toBeInTheDocument();
  });
});
