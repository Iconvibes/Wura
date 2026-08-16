import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import AdminLayout from './AdminLayout.jsx';
import { ToastHost } from '../../components/Toast.jsx';
import { ADMIN_PATH } from '../../lib/adminPath.jsx';

vi.mock('../../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.jsx';

// Renders inside AdminLayout's <Outlet>, so tests can read the final location.
function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="child-page">{loc.pathname}</div>;
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.setItem('wura_token', 'test-token');
});

function renderAdmin(path, role) {
  api.mockImplementation((p, opts) => {
    if (p === '/api/admin/me') {
      return Promise.resolve({ user: { username: role === 'staff' ? 'desk' : 'admin', role } });
    }
    if (p === '/api/admin/messages' && !opts?.method) {
      return Promise.resolve({ messages: [], unread: 0 });
    }
    return Promise.reject(new Error(`Unexpected api call: ${p}`));
  });

  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<AdminLayout />}>
          <Route path="*" element={<LocationProbe />} />
        </Route>
      </Routes>
      <ToastHost />
    </MemoryRouter>
  );
}

describe('AdminLayout roles', () => {
  // The sidebar (desktop) and top bar (mobile) both render the nav, so each
  // visible item appears twice for admins and zero times for staff.
  it('shows every nav item to an administrator', async () => {
    renderAdmin(`${ADMIN_PATH}/`, 'admin');
    await screen.findAllByText('Overview');
    for (const label of ['Overview', 'Front Desk', 'Bookings', 'Rooms & Rates', 'Inbox', 'Settings']) {
      expect(screen.getAllByText(label).length).toBe(2);
    }
    // Real role label, not the hardcoded one.
    expect(screen.getByText('Administrator')).toBeInTheDocument();
    expect(screen.getAllByText('admin').length).toBeGreaterThan(0);
  });

  it('limits front-desk staff to Front Desk + Inbox', async () => {
    renderAdmin(`${ADMIN_PATH}/front-desk`, 'staff');
    await screen.findAllByText('Front Desk');
    expect(screen.getAllByText('Front Desk').length).toBe(2);
    expect(screen.getAllByText('Inbox').length).toBe(2);
    for (const label of ['Overview', 'Bookings', 'Rooms & Rates', 'Settings']) {
      expect(screen.queryAllByText(label).length).toBe(0);
    }
    expect(screen.getByText('Front desk staff')).toBeInTheDocument();
    expect(screen.getByText('desk')).toBeInTheDocument();
  });

  it('sends staff who open an admin-only view to the front desk', async () => {
    renderAdmin(`${ADMIN_PATH}/rooms`, 'staff');
    await waitFor(() => {
      expect(screen.getByTestId('child-page').textContent).toBe(`${ADMIN_PATH}/front-desk`);
    });
  });

  it('redirects staff away from the dashboard landing page', async () => {
    renderAdmin(`${ADMIN_PATH}/`, 'staff');
    await waitFor(() => {
      expect(screen.getByTestId('child-page').textContent).toBe(`${ADMIN_PATH}/front-desk`);
    });
  });

  it('lets an administrator stay on the dashboard', async () => {
    renderAdmin(`${ADMIN_PATH}/`, 'admin');
    await waitFor(() => {
      expect(screen.getByTestId('child-page').textContent).toBe(`${ADMIN_PATH}/`);
    });
  });
});
