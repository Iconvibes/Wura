import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from './Settings.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.jsx';

function renderSettings() {
  return render(
    <>
      <ToastHost />
      <Settings />
    </>
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

  it('blocks a mismatched confirmation client-side', async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'WURA-1962');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2027');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    expect(await screen.findByText(/do not match/)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('surfaces a server-side error (e.g. wrong current code)', async () => {
    const user = userEvent.setup();
    api.mockRejectedValue(new Error('Current access code is incorrect.'));
    renderSettings();

    await user.type(screen.getByLabelText('Current access code'), 'NOPE-0000');
    await user.type(screen.getByLabelText('New access code'), 'STAFF-2026');
    await user.type(screen.getByLabelText('Confirm new access code'), 'STAFF-2026');
    await user.click(screen.getByRole('button', { name: /Update access code/ }));

    expect(await screen.findByText('Current access code is incorrect.')).toBeInTheDocument();
  });
});
