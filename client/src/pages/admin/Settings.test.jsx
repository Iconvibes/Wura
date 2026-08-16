import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, Outlet } from 'react-router-dom';
import Settings from './Settings.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.jsx';

// Settings reads its session role from AdminLayout's <Outlet context>, so tests
// render it inside a route with a real context.
function renderSettings(role = 'admin') {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<Outlet context={{ user: { role } }} />}>
          <Route index element={<Settings />} />
        </Route>
      </Routes>
      <ToastHost />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  api.mockResolvedValue({ ok: true });
});

describe('admin Settings view', () => {
  it('posts the current and new code to the API on submit', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'WURA-1962');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2026');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        '/api/admin/access-code',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ current_code: 'WURA-1962', code: 'STAFF-2026' }),
        })
      );
    });
  });

  it('clears the form after a successful update', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'WURA-1962');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2026');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    await vi.waitFor(() => {
      expect(screen.getByLabelText('New access code').value).toBe('');
    });
  });

  it('forgets the stored username when the access code is rotated', async () => {
    const user = userEvent.setup();
    localStorage.setItem('wura_last_username', 'admin');
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'WURA-1962');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2026');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    await vi.waitFor(() => {
      expect(localStorage.getItem('wura_last_username')).toBeNull();
    });
  });

  it('blocks a mismatched confirmation client-side', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'WURA-1962');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2027');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    expect(await screen.findByText(/do not match/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/api/admin/access-code', expect.anything());
  });

  it('surfaces a server-side error (e.g. wrong current code)', async () => {
    const user = userEvent.setup();
    // Only the access-code call fails — the accounts list load must stay quiet
    // so the error text appears exactly once.
    api.mockImplementation((p, opts) => {
      if (p === '/api/admin/access-code') return Promise.reject(new Error('Current access code is incorrect.'));
      if (p === '/api/admin/users' && !opts?.method) return Promise.resolve({ users: [] });
      return Promise.resolve({ ok: true });
    });
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'NOPE-0000');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2026');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    expect(await screen.findByText('Current access code is incorrect.')).toBeInTheDocument();
  });
});

describe('admin Settings — change password', () => {
  it('posts the current and new password to the API on submit', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current password'), 'admin123');
    await user.type(screen.getByLabelText('New password'), 'BrandNew-2026');
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNew-2026');
    await user.click(screen.getByRole('button', { name: /Update password/ }));

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        '/api/admin/change-password',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ current_password: 'admin123', new_password: 'BrandNew-2026' }),
        })
      );
    });
  });

  it('clears the form after a successful update', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current password'), 'admin123');
    await user.type(screen.getByLabelText('New password'), 'BrandNew-2026');
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNew-2026');
    await user.click(screen.getByRole('button', { name: /Update password/ }));

    await vi.waitFor(() => {
      expect(screen.getByLabelText('New password').value).toBe('');
    });
  });

  it('blocks a mismatched confirmation client-side', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current password'), 'admin123');
    await user.type(screen.getByLabelText('New password'), 'BrandNew-2026');
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNew-2027');
    await user.click(screen.getByRole('button', { name: /Update password/ }));

    expect(await screen.findByText(/do not match/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/api/admin/change-password', expect.anything());
  });

  it('surfaces a server-side error (e.g. wrong current password)', async () => {
    const user = userEvent.setup();
    api.mockImplementation((p, opts) => {
      if (p === '/api/admin/change-password') return Promise.reject(new Error('Current password is incorrect.'));
      if (p === '/api/admin/users' && !opts?.method) return Promise.resolve({ users: [] });
      return Promise.resolve({ ok: true });
    });
    renderSettings();

    await user.type(screen.getByLabelText('Current password'), 'wrong-pass');
    await user.type(screen.getByLabelText('New password'), 'BrandNew-2026');
    await user.type(screen.getByLabelText('Confirm new password'), 'BrandNew-2026');
    await user.click(screen.getByRole('button', { name: /Update password/ }));

    expect(await screen.findByText('Current password is incorrect.')).toBeInTheDocument();
  });
});

describe('admin Settings — roles', () => {
  it('hides the admin-only cards from front-desk staff', async () => {
    renderSettings('staff');

    // Staff still get their own password card…
    expect(screen.getByRole('heading', { name: 'Change your sign-in password' })).toBeInTheDocument();
    // …but no access-code rotation or staff-account management.
    expect(screen.queryByRole('heading', { name: 'Rotate the staff access code' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Staff accounts' })).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/api/admin/users');
  });

  it('loads and lists staff accounts for an admin', async () => {
    api.mockImplementation((path, opts) => {
      if (path === '/api/admin/users' && !opts?.method) {
        return Promise.resolve({
          users: [
            { id: 'u1', username: 'admin', role: 'admin', created_at: '2026-01-01T00:00:00.000Z' },
            { id: 'u2', username: 'desk', role: 'staff', created_at: '2026-02-01T00:00:00.000Z' },
          ],
        });
      }
      return Promise.resolve({ ok: true });
    });
    renderSettings('admin');

    expect(await screen.findByText('desk')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByText('Staff')).toBeInTheDocument(); // the role pill
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('creates a new staff account', async () => {
    const user = userEvent.setup();
    renderSettings('admin');

    await user.type(screen.getByLabelText('Username'), 'maria');
    await user.type(screen.getByLabelText('Password'), 'MariaPass-2026');
    await user.click(screen.getByRole('button', { name: /Add staff account/ }));

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        '/api/admin/users',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'maria', password: 'MariaPass-2026', role: 'staff' }),
        })
      );
    });
  });

  it('deletes an account after confirmation', async () => {
    const user = userEvent.setup();
    api.mockImplementation((path, opts) => {
      if (path === '/api/admin/users' && !opts?.method) {
        return Promise.resolve({ users: [{ id: 'u2', username: 'desk', role: 'staff', created_at: '2026-02-01T00:00:00.000Z' }] });
      }
      return Promise.resolve({ ok: true });
    });
    renderSettings('admin');
    await screen.findByText('desk');

    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const deleteBtn = screen.getAllByTitle('Delete')[0];
    await user.click(deleteBtn);

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/admin/users/u2', { method: 'DELETE' });
    });
    vi.restoreAllMocks();
  });
});
