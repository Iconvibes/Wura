import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home.jsx';

vi.mock('../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.jsx';

const rooms = [
  { id: 'r1', name: 'Deluxe Garden', type: 'Deluxe', price: 199, capacity: 3, size_sqm: 36, art: 'data:image/svg+xml,x', description: 'Wake to the gardens.' },
  { id: 'r2', name: 'Skyline Suite', type: 'Suite', price: 399, capacity: 4, size_sqm: 60, art: 'data:image/svg+xml,y', description: 'Corner suite.' },
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

describe('Home page', () => {
  it('loads and renders available rooms from the API', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Deluxe Garden' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Skyline Suite' })).toBeInTheDocument();
    expect(screen.getByText(/rooms & suites/)).toBeInTheDocument();

    expect(api).toHaveBeenCalledWith(expect.stringContaining('/api/rooms?'));
  });

  it('sends the selected dates and guest count with the rooms query', async () => {
    render(
      <MemoryRouter>
        <Home />
      </MemoryRouter>
    );

    await screen.findByText('Deluxe Garden');
    const call = api.mock.calls.find(([p]) => p.startsWith('/api/rooms'));
    expect(call[0]).toContain('checkIn=');
    expect(call[0]).toContain('checkOut=');
    expect(call[0]).toContain('guests=2');
  });
});
