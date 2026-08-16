import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminLogin from './AdminLogin.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.jsx';

function renderLogin() {
  return render(
    <MemoryRouter>
      <ToastHost />
      <AdminLogin />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.removeItem('wura_last_username');
  api.mockResolvedValue({ ok: true });
});

describe('admin login — access code recovery', () => {
  it('reveals the recovery form from the code step', async () => {
    const user = userEvent.setup();
    renderLogin();

    await user.click(screen.getByRole('button', { name: /Forgot the access code/i }));

    expect(screen.getByLabelText('Recovery secret')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Set new access code/i })).toBeInTheDocument();
  });

  it('posts the recovery secret and new code to the API', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /Forgot the access code/i }));

    await user.type(screen.getByLabelText('Recovery secret'), 'correct-horse-battery-staple');
    await user.type(screen.getByLabelText('New access code'), 'RECOVERED-26');
    await user.type(screen.getByLabelText('Confirm new access code'), 'RECOVERED-26');
    await user.click(screen.getByRole('button', { name: /Set new access code/i }));

    await vi.waitFor(() => {
      expect(api).toHaveBeenCalledWith(
        '/api/admin/recover-access-code',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ reset_secret: 'correct-horse-battery-staple', code: 'RECOVERED-26' }),
        })
      );
    });
  });

  it('forgets the stored username when the code is recovered', async () => {
    const user = userEvent.setup();
    localStorage.setItem('wura_last_username', 'desk');
    renderLogin();
    await user.click(screen.getByRole('button', { name: /Forgot the access code/i }));

    await user.type(screen.getByLabelText('Recovery secret'), 'correct-horse-battery-staple');
    await user.type(screen.getByLabelText('New access code'), 'RECOVERED-26');
    await user.type(screen.getByLabelText('Confirm new access code'), 'RECOVERED-26');
    await user.click(screen.getByRole('button', { name: /Set new access code/i }));

    await vi.waitFor(() => {
      expect(localStorage.getItem('wura_last_username')).toBeNull();
    });
  });

  it('blocks a mismatched confirmation client-side', async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.click(screen.getByRole('button', { name: /Forgot the access code/i }));

    await user.type(screen.getByLabelText('Recovery secret'), 'correct-horse-battery-staple');
    await user.type(screen.getByLabelText('New access code'), 'RECOVERED-26');
    await user.type(screen.getByLabelText('Confirm new access code'), 'RECOVERED-27');
    await user.click(screen.getByRole('button', { name: /Set new access code/i }));

    expect(await screen.findByText(/do not match/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('surfaces a server error when recovery is not configured', async () => {
    const user = userEvent.setup();
    api.mockRejectedValue(new Error('Recovery is not configured on this server (ADMIN_RESET_SECRET unset).'));
    renderLogin();
    await user.click(screen.getByRole('button', { name: /Forgot the access code/i }));

    await user.type(screen.getByLabelText('Recovery secret'), 'secret');
    await user.type(screen.getByLabelText('New access code'), 'RECOVERED-26');
    await user.type(screen.getByLabelText('Confirm new access code'), 'RECOVERED-26');
    await user.click(screen.getByRole('button', { name: /Set new access code/i }));

    expect(await screen.findByText(/Recovery is not configured/)).toBeInTheDocument();
  });
});

describe('admin login — role badge', () => {
  // Reach the credential step (after the code gate) with a role-aware mock.
  async function reachCredentials(roleFor = (u) => (u === 'admin' ? 'admin' : u === 'desk' ? 'staff' : null)) {
    const user = userEvent.setup();
    api.mockImplementation((path, opts) => {
      if (path === '/api/admin/verify-code') return Promise.resolve({});
      if (path === '/api/admin/account-info') {
        const u = JSON.parse(opts.body).username;
        return Promise.resolve({ role: roleFor(u) });
      }
      return Promise.resolve({ ok: true });
    });
    renderLogin();
    await user.type(screen.getByLabelText('Staff access code'), 'WURA-1962');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    return user;
  }

  it('shows an administrator badge when an admin username is typed', async () => {
    const user = await reachCredentials();
    await user.type(screen.getByLabelText('Username'), 'admin');

    expect(await screen.findByText('Administrator account')).toBeInTheDocument();
    expect(screen.queryByText('Front desk staff account')).not.toBeInTheDocument();
  });

  it('shows a front-desk badge for a staff username', async () => {
    const user = await reachCredentials();
    await user.type(screen.getByLabelText('Username'), 'desk');

    expect(await screen.findByText('Front desk staff account')).toBeInTheDocument();
  });

  it('hints when the typed account does not exist', async () => {
    const user = await reachCredentials();
    await user.type(screen.getByLabelText('Username'), 'ghost');

    expect(await screen.findByText('No account with that username')).toBeInTheDocument();
  });

  it('does not look up the role before the access code is accepted', async () => {
    renderLogin();

    // The credential form isn't visible yet — no username field, no lookups.
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument();
    expect(api).not.toHaveBeenCalledWith('/api/admin/account-info', expect.anything());
  });
});

describe('admin login — remembered username', () => {
  it('saves the username after a successful sign-in', async () => {
    const user = userEvent.setup();
    api.mockImplementation((path, opts) => {
      if (path === '/api/admin/verify-code') return Promise.resolve({});
      if (path === '/api/admin/account-info') return Promise.resolve({ role: 'admin' });
      if (path === '/api/admin/login') {
        return Promise.resolve({ token: 't', user: { username: 'admin', role: 'admin' } });
      }
      return Promise.resolve({ ok: true });
    });
    renderLogin();

    await user.type(screen.getByLabelText('Staff access code'), 'WURA-1962');
    await user.click(screen.getByRole('button', { name: /Continue/ }));
    await user.type(screen.getByLabelText('Username'), 'admin');
    await user.type(screen.getByLabelText('Password'), 'admin123');
    await user.click(screen.getByRole('button', { name: /Sign in/ }));

    await vi.waitFor(() => {
      expect(localStorage.getItem('wura_last_username')).toBe('admin');
    });
  });

  it('pre-fills the remembered username and the badge confirms its role', async () => {
    localStorage.setItem('wura_last_username', 'desk');
    const user = userEvent.setup();
    api.mockImplementation((path, opts) => {
      if (path === '/api/admin/verify-code') return Promise.resolve({});
      if (path === '/api/admin/account-info') {
        return Promise.resolve({ role: JSON.parse(opts.body).username === 'desk' ? 'staff' : null });
      }
      return Promise.resolve({ ok: true });
    });
    renderLogin();

    await user.type(screen.getByLabelText('Staff access code'), 'WURA-1962');
    await user.click(screen.getByRole('button', { name: /Continue/ }));

    // The username is already there — no retyping.
    expect(screen.getByLabelText('Username').value).toBe('desk');
    // …and the role badge confirms which account it is.
    expect(await screen.findByText('Front desk staff account')).toBeInTheDocument();
  });
});
