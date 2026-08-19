import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api, money, fmtDate } from '../api.jsx';
import { I } from '../components/Icons.jsx';

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const [booking, setBooking] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | error

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!ref) { setState('error'); return; }
      try {
        const { booking: b } = await api(`/api/bookings/${encodeURIComponent(ref)}`);
        if (!alive) return;
        setBooking(b);
        setState('ok');
      } catch {
        if (!alive) return;
        setState('error');
      }
    })();
    return () => { alive = false; };
  }, [ref]);

  return (
    <div className="min-h-screen bg-navy-950">
      <Navbar />
      <div className="max-w-xl mx-auto px-5 pt-36 pb-20">
        {state === 'loading' && (
          <div className="card p-12 text-center">
            <div className="spinner mx-auto" />
            <p className="text-[14px] text-muted mt-5">Loading your booking…</p>
          </div>
        )}

        {state === 'ok' && booking && (
          <div className="card p-8 md:p-10 text-center fade-up">
            <div className="success-ring mx-auto">{I.check({ width: 26, height: 26 })}</div>
            <span className="eyebrow mt-6 inline-block">Booking confirmed</span>
            <h1 className="font-serif text-[clamp(1.7rem,4vw,2.3rem)] text-cream mt-2">
              You're booked, {booking.guest_name.split(' ')[0]}!
            </h1>
            <p className="text-[14px] text-muted mt-2 mb-5">
              A confirmation has been sent to <b className="text-cream">{booking.guest_email}</b>
            </p>

            <div className="ref-code">{booking.ref}</div>

            <p className="text-[13px] text-muted mt-3">
              Show this reference at the front desk when you arrive.
            </p>

            <div className="summary text-left mt-5">
              <div className="row"><span>Room</span><b>{booking.room_number ? `Room ${booking.room_number} · ` : ''}{booking.room_name}{booking.room_type ? ` · ${booking.room_type}` : ''}</b></div>
              <div className="row"><span>Dates</span><b>{fmtDate(booking.check_in)} → {fmtDate(booking.check_out)}</b></div>
              <div className="row"><span>Guests</span><b>{booking.guests}</b></div>
              <div className="row"><span>Payment</span><b className="text-gold-400">Pay at front desk</b></div>
              <div className="row total"><span>Total</span><b>{money(booking.total)}</b></div>
            </div>

            <p className="mt-5 text-[12px] text-dim">Free cancellation up to 48 hours before arrival. Payment is due at check-in.</p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
              <Link to="/rooms" className="btn btn-gold">{I.calendar({ width: 15, height: 15 })} Browse more rooms</Link>
              <Link to="/" className="btn btn-ghost">Return home</Link>
            </div>
          </div>
        )}

        {state === 'error' && (
          <div className="card p-8 md:p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full grid place-items-center text-red-300 bg-red-500/10 border border-red-500/30">
              {I.close({ width: 22, height: 22 })}
            </div>
            <h1 className="font-serif text-[22px] text-cream mt-5">We couldn't find that booking</h1>
            <p className="text-[13.5px] text-muted mt-2">Check the link or use "Find my booking" with your reference.</p>
            <Link to="/" className="btn btn-gold mt-6">Return home</Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
