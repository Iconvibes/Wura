import { useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PageHero from '../components/PageHero.jsx';
import Reveal from '../components/Reveal.jsx';
import { I, Icon } from '../components/Icons.jsx';
import { api } from '../api.js';
import { toast } from '../components/Toast.jsx';
import { PAGE_HEROS } from '../lib/content.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

const INFO = [
  ['room', 'The address', '1 Golden Crescent, City Centre', 'Two blocks from the river promenade, ten minutes from the airport.'],
  ['phone', 'Front desk', '+1 (555) 012-1962', 'Answering around the clock — real people, no menus.'],
  ['calendar', 'Reservations', 'stay@wuragrand.example', 'Group bookings, anniversaries and long stays get an answer within the hour.'],
];

export default function Contact() {
  usePageMeta('Contact — Wura Grand Hotel', 'The front desk answers around the clock. Reservations, group stays and special requests at Wura Grand Hotel.');
  const [form, setForm] = useState({ name: '', email: '', subject: 'Reservation enquiry', message: '' });
  const [busy, setBusy] = useState(false);
  const [honeypot, setHoneypot] = useState('');
  // When the guest started filling the form — sent to the API so the server can
  // drop instant bot submissions while a human-speed reply sails through.
  const [startedAt] = useState(() => Date.now());

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    // Honeypot filled → pretend success, never call the API. Real users never
    // see this field, so it's only ever bots.
    if (honeypot.trim()) {
      toast('Message sent — our front desk will be in touch shortly.');
      return;
    }
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      return toast('Please fill in your name, email and message.', false);
    }
    setBusy(true);
    try {
      await api('/api/contact', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject,
          message: form.message.trim(),
          started_at: startedAt,
        }),
      });
      toast('Message sent — our front desk will be in touch shortly.');
      setForm({ name: '', email: '', subject: 'Reservation enquiry', message: '' });
    } catch (err) {
      toast(err.message, false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <Navbar />
      <PageHero {...PAGE_HEROS.contact} />

      <section className="max-w-6xl mx-auto px-5 pt-14">
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-8 items-start">
          {/* info cards — slide in from the left */}
          <div className="space-y-4">
            {INFO.map(([icon, title, value, sub], i) => (
              <Reveal key={title} variant="left" delay={i}>
                <div className="card p-6 flex gap-4 items-start">
                  <div className="w-11 h-11 shrink-0 rounded-xl grid place-items-center text-gold-400 bg-navy-900 border border-gold-500/25">
                    {Icon({ name: icon, size: 20 })}
                  </div>
                  <div>
                    <div className="text-[11px] tracking-[2px] uppercase text-gold-500 font-bold">{title}</div>
                    <div className="text-[15px] font-semibold text-cream mt-1">{value}</div>
                    <div className="text-[12.5px] text-dim mt-1 leading-relaxed">{sub}</div>
                  </div>
                </div>
              </Reveal>
            ))}
            <Reveal variant="left" delay={3}>
              <div className="card p-6">
                <div className="text-[11px] tracking-[2px] uppercase text-gold-500 font-bold">Arriving by car?</div>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Valet parking is complimentary for guests, and the hotel's electric-car fleet
                  is available for hire from the front drive.
                </p>
              </div>
            </Reveal>
          </div>

          {/* form — fields stagger in from the right */}
          <Reveal variant="right" delay={1}>
            <form className="card p-8" onSubmit={submit}>
              <h2 className="font-serif text-[22px] text-cream">Send a message</h2>
              <p className="text-[13px] text-muted mt-1.5">We reply within the hour, day or night.</p>

              <div className="grid sm:grid-cols-2 gap-4 mt-6">
                <div className="form-field">
                  <label>Your name</label>
                  <input value={form.name} onChange={set('name')} placeholder="Amara Okafor" />
                </div>
                <div className="form-field">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
                </div>
              </div>
              <div className="form-field mt-4">
                <label>Subject</label>
                <select value={form.subject} onChange={set('subject')}>
                  <option>Reservation enquiry</option>
                  <option>Group &amp; events</option>
                  <option>Lost property</option>
                  <option>Feedback</option>
                </select>
              </div>
              <div className="form-field mt-4">
                <label>Message</label>
                <textarea rows={5} value={form.message} onChange={set('message')} placeholder="Tell us about your stay, dates and any special requests…" />
              </div>

              {/* Honeypot — hidden from humans, tempting to bots. Do NOT style it visible. */}
              <div aria-hidden="true" style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px', overflow: 'hidden' }}>
                <label htmlFor="contact-website">Website</label>
                <input
                  id="contact-website"
                  name="website"
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                />
              </div>
              <button className="btn btn-gold btn-block mt-6" disabled={busy}>
                {busy ? 'Sending…' : 'Send message'}
              </button>
              <p className="text-[11.5px] text-dim mt-4 flex items-center gap-1.5">
                <span className="text-gold-500">{I.shield({ width: 13, height: 13 })}</span>
                Your details are only used to reply to this enquiry.
              </p>
            </form>
          </Reveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
