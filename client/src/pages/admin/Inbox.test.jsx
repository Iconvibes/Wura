import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inbox from './Inbox.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.js', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.js';

const unreadMsg = {
  id: 'm1', name: 'Grace Oyelaran', email: 'grace@example.com',
  subject: 'Group & events', message: 'Wedding block for 20 rooms in October.',
  read: false, sent_at: '2026-08-16T09:00:00.000Z', created_at: '2026-08-16T09:00:00.000Z',
};
const readMsg = {
  id: 'm2', name: 'Daniel Meyer', email: 'daniel@example.com',
  subject: 'Reservation enquiry', message: 'I left my watch in the gym.',
  read: true, sent_at: '2026-08-15T09:00:00.000Z', created_at: '2026-08-15T09:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
  api.mockImplementation((path, opts) => {
    if (path === '/api/admin/messages' && !opts?.method) {
      return Promise.resolve({ messages: [unreadMsg, readMsg], unread: 1 });
    }
    if (path === '/api/admin/messages/m1' && opts?.method === 'PATCH') {
      return Promise.resolve({ message: { ...unreadMsg, read: true } });
    }
    if (path === '/api/admin/messages/read-all' && opts?.method === 'POST') {
      return Promise.resolve({ ok: true });
    }
    if (path === '/api/admin/messages/m2' && opts?.method === 'DELETE') {
      return Promise.resolve({ ok: true });
    }
    return Promise.reject(new Error(`Unexpected api call: ${path}`));
  });
});

function renderInbox() {
  return render(
    <>
      <ToastHost />
      <Inbox />
    </>
  );
}

describe('admin Inbox', () => {
  it('renders the message list with unread highlight and count', async () => {
    renderInbox();
    expect(await screen.findByText('Grace Oyelaran')).toBeInTheDocument();
    expect(screen.getByText('Daniel Meyer')).toBeInTheDocument();
    expect(screen.getByText(/1 unread message/)).toBeInTheDocument();
  });

  it('opens a message, marks it read, and shows the detail', async () => {
    const user = userEvent.setup();
    renderInbox();
    await screen.findByText('Grace Oyelaran');

    await user.click(screen.getByText('Grace Oyelaran'));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/admin/messages/m1', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ read: true }) }));
    });
    expect(await screen.findByText(/Wedding block for 20 rooms in October/)).toBeInTheDocument();
    expect(screen.getByText(/all caught up|0 unread/)).toBeInTheDocument();
  });

  it('toggles a message back to unread from the detail view', async () => {
    const user = userEvent.setup();
    renderInbox();
    await screen.findByText('Daniel Meyer');

    await user.click(screen.getByText('Daniel Meyer')); // opens (already read — no PATCH)
    const unreadBtn = screen.getByRole('button', { name: /Unread/ });
    await user.click(unreadBtn);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/admin/messages/m2', expect.objectContaining({ method: 'PATCH', body: JSON.stringify({ read: false }) }));
    });
  });

  it('deletes a message from the detail view', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderInbox();
    await screen.findByText('Daniel Meyer');

    await user.click(screen.getByText('Daniel Meyer'));
    await user.click(screen.getByRole('button', { name: /Delete/ }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/admin/messages/m2', { method: 'DELETE' });
    });
    expect(screen.queryByText('Daniel Meyer')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });
});
