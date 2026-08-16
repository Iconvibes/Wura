import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inbox from './Inbox.jsx';
import { ToastHost } from '../../components/Toast.jsx';

vi.mock('../../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../../api.jsx';

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
    if (path.startsWith('/api/admin/messages?limit=') && !opts?.method) {
      return Promise.resolve({ messages: [unreadMsg, readMsg], unread: 1, total: 2 });
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

// The gesture code only activates on narrow screens — fake matchMedia for it.
function mockMobileViewport() {
  const mq = { matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  vi.stubGlobal('matchMedia', vi.fn(() => mq));
  return mq;
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
    // The list's swipe-delete buttons are also named "Delete …" — the detail
    // one is exactly "Delete", so match exactly.
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/admin/messages/m2', { method: 'DELETE' });
    });
    expect(screen.queryByText('Daniel Meyer')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('swipes a row open and deletes from the revealed button', async () => {
    const user = userEvent.setup();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    renderInbox();
    await screen.findByText('Daniel Meyer');

    const row = screen.getByText('Daniel Meyer').closest('button');
    fireEvent.touchStart(row, { touches: [{ clientX: 300 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 80 }] });
    fireEvent.touchEnd(row);

    // Row slides left 72px to reveal the delete action.
    expect(row.style.transform).toBe('translateX(-72px)');
    await user.click(screen.getByRole('button', { name: 'Delete message from Daniel Meyer' }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/api/admin/messages/m2', { method: 'DELETE' });
    });
    expect(screen.queryByText('Daniel Meyer')).not.toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it('a short tap still opens the message (swipe is suppressed)', async () => {
    const user = userEvent.setup();
    renderInbox();
    await screen.findByText('Daniel Meyer');

    const row = screen.getByText('Daniel Meyer').closest('button');
    fireEvent.touchStart(row, { touches: [{ clientX: 150 }] });
    fireEvent.touchMove(row, { touches: [{ clientX: 156 }] }); // under the 10px dead zone
    fireEvent.touchEnd(row);
    await user.click(row);

    expect(await screen.findByText(/I left my watch in the gym/)).toBeInTheDocument();
  });

  it('pull-to-refresh reloads the list when pulled past the threshold', async () => {
    mockMobileViewport();
    renderInbox();
    await screen.findByText('Daniel Meyer');

    const list = screen.getByText('Daniel Meyer').closest('div[class*="overflow-y-auto"]');
    fireEvent.touchStart(list, { touches: [{ clientY: 40 }] });
    fireEvent.touchMove(list, { touches: [{ clientY: 320 }] }); // 280px → pull ≈ 88 ≥ 60
    fireEvent.touchEnd(list);

    await waitFor(() => {
      expect(api).toHaveBeenCalledTimes(2); // initial load + the pull refresh
    });
    expect(api).toHaveBeenCalledWith('/api/admin/messages?limit=25&offset=0');
    vi.unstubAllGlobals();
  });

  it('shows Load more when older messages exist and appends them', async () => {
    const page1 = Array.from({ length: 25 }, (_, i) => ({
      id: `p1-${i}`, name: `Page One ${i}`, email: 'a@example.com',
      subject: 'First page', message: 'body', read: false,
      sent_at: `2026-08-01T0${i % 10}:00:00.000Z`, created_at: `2026-08-01T0${i % 10}:00:00.000Z`,
    }));
    const page2 = Array.from({ length: 5 }, (_, i) => ({
      id: `p2-${i}`, name: `Page Two ${i}`, email: 'b@example.com',
      subject: 'Second page', message: 'older', read: false,
      sent_at: `2026-07-01T0${i}:00:00.000Z`, created_at: `2026-07-01T0${i}:00:00.000Z`,
    }));

    api.mockImplementation((path, opts) => {
      if (path.startsWith('/api/admin/messages?limit=') && !opts?.method) {
        const offset = Number(new URL(path, 'http://x').searchParams.get('offset'));
        return Promise.resolve({
          messages: offset === 0 ? page1 : page2,
          total: 30,
          unread: 30,
        });
      }
      return Promise.reject(new Error(`Unexpected api call: ${path}`));
    });

    const user = userEvent.setup();
    renderInbox();
    await screen.findByText('Page One 24');

    // Only the first 25 are loaded; the button shows exactly what remains.
    expect(screen.getByRole('button', { name: 'Load 5 more' })).toBeInTheDocument();
    expect(screen.queryByText('Page Two 0')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Load 5 more' }));

    expect(await screen.findByText('Page Two 4')).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/api/admin/messages?limit=25&offset=25');
    // All 30 are loaded now — the button disappears.
    expect(screen.queryByRole('button', { name: /Load .* more/ })).not.toBeInTheDocument();
  });
});
