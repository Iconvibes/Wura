import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Rooms from './Rooms.jsx';

vi.mock('../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.jsx';

const rooms = [
  { id: 'r1', name: 'Deluxe Garden', type: 'Deluxe', price: 199, capacity: 3, size_sqm: 36, art: 'x', description: 'Wake to the gardens.' },
  { id: 'r2', name: 'Skyline Suite', type: 'Suite', price: 399, capacity: 4, size_sqm: 60, art: 'y', description: 'Corner suite.' },
];

beforeEach(() => {
  vi.clearAllMocks();
  api.mockImplementation((path) => {
    if (path.startsWith('/api/rooms')) {
      return Promise.resolve({ rooms, pagination: { page: 1, limit: 6, total: 2, totalPages: 1 } });
    }
    return Promise.reject(new Error(`Unexpected api call: ${path}`));
  });
});

describe('Rooms page', () => {
  it('renders the page hero and rooms from the API', async () => {
    render(
      <MemoryRouter>
        <Rooms />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Find your perfect room' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Deluxe Garden' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Skyline Suite' })).toBeInTheDocument();
    // Result count renders as <b>2</b> rooms & suites — check the bold count.
    expect(screen.getByText((_, el) => el?.tagName === 'B' && el?.textContent === '2')).toBeInTheDocument();
  });

  it('reads dates and guests from the URL query string', async () => {
    render(
      <MemoryRouter initialEntries={['/rooms?checkIn=2026-09-01&checkOut=2026-09-03&guests=4']}>
        <Rooms />
      </MemoryRouter>
    );

    await screen.findByRole('heading', { name: 'Deluxe Garden' });
    const call = api.mock.calls.find(([p]) => p.startsWith('/api/rooms'));
    expect(call[0]).toContain('checkIn=2026-09-01');
    expect(call[0]).toContain('checkOut=2026-09-03');
    expect(call[0]).toContain('guests=4');
  });
});
