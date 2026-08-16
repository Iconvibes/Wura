import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Contact from './Contact.jsx';
import { ToastHost } from '../components/Toast.jsx';

vi.mock('../api.jsx', async (importOriginal) => {
  const actual = await importOriginal();
  return { ...actual, api: vi.fn() };
});

import { api } from '../api.jsx';

beforeEach(() => {
  vi.clearAllMocks();
  api.mockResolvedValue({ ok: true });
});

describe('Contact page', () => {
  it('renders the info cards and the form', () => {
    render(
      <MemoryRouter>
        <ToastHost />
        <Contact />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { name: 'We are at your service' })).toBeInTheDocument();
    expect(screen.getByText('Front desk')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
  });

  it('validates required fields before calling the API', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastHost />
        <Contact />
      </MemoryRouter>
    );

    await user.click(screen.getByRole('button', { name: /send message/i }));
    expect(await screen.findByText(/please fill in your name, email and message/i)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('posts the enquiry to /api/contact and confirms', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastHost />
        <Contact />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Amara Okafor'), 'Amara');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'amara@example.com');
    await user.selectOptions(screen.getByRole('combobox'), 'Lost property');
    await user.type(screen.getByPlaceholderText(/tell us about your stay/i), 'Left a watch in the gym.');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/our front desk will be in touch shortly/i)).toBeInTheDocument();
    expect(api).toHaveBeenCalledWith('/api/contact', expect.objectContaining({ method: 'POST' }));
    const payload = JSON.parse(api.mock.calls[0][1].body);
    expect(payload).toEqual({
      name: 'Amara',
      email: 'amara@example.com',
      subject: 'Lost property',
      message: 'Left a watch in the gym.',
      started_at: expect.any(Number),
    });
  });

  it('never sends the API request when the honeypot is filled', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastHost />
        <Contact />
      </MemoryRouter>
    );

    await user.type(screen.getByLabelText('Website'), 'http://spam.example');
    await user.type(screen.getByPlaceholderText('Amara Okafor'), 'Bot');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'bot@example.com');
    await user.type(screen.getByPlaceholderText(/tell us about your stay/i), 'Buy our SEO services');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    // The fake success toast shows, but nothing ever reaches the API.
    expect(await screen.findByText(/our front desk will be in touch shortly/i)).toBeInTheDocument();
    expect(api).not.toHaveBeenCalled();
  });

  it('surfaces a server error instead of a fake success', async () => {
    api.mockRejectedValue(new Error('Too many messages. Please try again in a few minutes.'));
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <ToastHost />
        <Contact />
      </MemoryRouter>
    );

    await user.type(screen.getByPlaceholderText('Amara Okafor'), 'Amara');
    await user.type(screen.getByPlaceholderText('you@example.com'), 'amara@example.com');
    await user.type(screen.getByPlaceholderText(/tell us about your stay/i), 'Hi there');
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText(/too many messages/i)).toBeInTheDocument();
  });
});
