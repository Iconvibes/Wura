import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import Overview from './Overview.jsx';

vi.mock('../../api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.js';

const overview = {
  stats: {
    arrivals: 2,
    departures: 1,
    occupancy30: 74,
    occupancy: Array.from({ length: 30 }, (_, i) => ({ day: '2026-08-01', pct: 50 + (i % 40) })),
    revenueMonth: 2400,
    revenueTotal: 30000,
    revenueSeries: Array.from({ length: 30 }, (_, i) => ({ day: '2026-08-01', amount: (i % 5) * 120 })),
    byStatus: { confirmed: 4, checked_in: 2, checked_out: 1, cancelled: 1 },
    byType: { Deluxe: 3, Suite: 2, Standard: 1 },
    byPayment: { paid: 6, unpaid: 2 },
    inHouse: 2,
    totalBookings: 8,
    totalRooms: 10,
    activeRooms: 8,
  },
  recent: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  api.mockResolvedValue(overview);
});

describe('Overview dashboard', () => {
  it('renders the KPI cards and chart sections', async () => {
    render(<Overview />);

    expect(await screen.findByText('Revenue outlook — next 30 days')).toBeInTheDocument();
    expect(screen.getByText('Bookings by room type')).toBeInTheDocument();
    expect(screen.getByText('Occupancy — next 30 days')).toBeInTheDocument();
    expect(screen.getByText('Booking status')).toBeInTheDocument();

    // KPI values
    expect(screen.getByText('$2,400')).toBeInTheDocument();
    expect(screen.getByText('In-house now')).toBeInTheDocument();

    // Donut legend + status rows
    expect(screen.getByText('Deluxe')).toBeInTheDocument();
    expect(screen.getByText('Confirmed')).toBeInTheDocument();
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });

  it('charts render an SVG area and donut', async () => {
    render(<Overview />);

    await screen.findByText('Revenue outlook — next 30 days');
    const svgs = document.querySelectorAll('svg');
    // area chart + sparkline + donut (plus 2 inline svg icons per stat card)
    expect(svgs.length).toBeGreaterThan(3);
    expect(document.querySelector('.donut-seg')).toBeInTheDocument();
  });
});
