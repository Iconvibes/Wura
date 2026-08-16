import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import { api, money, fmtDate } from '../api.jsx';
import { I } from '../components/Icons.jsx';

export default function BookingSuccess() {
  const [params] = useSearchParams();
  const ref = params.get('ref') || '';
  const sessionId = params.get('session_id') || '';
  const [booking, setBooking] = useState(null);
  const [state, setState] = useState('loading'); // loading | ok | pending | error

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!ref) { setState('error'); return; }
      try {
        // Verifies the checkout session completed (covers the case where the
        // webhook hasn't landed yet) and marks the booking paid.
        const data = await api(`/api/bookings/${encodeURIComponent(ref)}/payment/complete`, {
          method: 'POST',
          body: JSON.stringify({ session_id: sessionId }),
        });
        if (!alive) return;
        setBooking(data.booking);
        setState(data.booking.payment_status === 'paid' ? 'ok' : 'pending');
      } catch (e) {
        if (!alive) return;
        if (e.message.includes('Payment for this booking is still pending')) {
          // Paid on Stripe's side but our webhook/verify hasn't landed yet —
          // show the reference so the guest has it, and let them retry.
          try {
            const { booking: b } = await api(`/api/bookings/${encodeURIComponent(ref)}`);
            if (!alive) return;
            setBooking(b);
            setState(b.payment_status === 'paid' ? 'ok' : 'pending');
          } catch {
            if (!alive) return;
            setState('error');
          }
        } else {
          setState('error');
        }
      }
    })();
    return () => { alive = false; };
  }, [ref, sessionId]);

  const confirmAgain = () => window.location.reload();

  return (
    <div className="min-h-screen bg-navy-950">
      <Navbar />
      {/* div, not <main> — App.jsx already provides the single main landmark */}
      <div className="max-w-xl mx-auto px-5 pt-36 pb-20">
        {state === 'loading' && (
          <div className="card p-12 text-center">
            <div className="spinner mx-auto" />
            <p className="text-[14px] text-muted mt-5">Confirming your payment…</p>
          </div>
        )}

        {state === 'ok' && booking && (
          <div className="card p-8 md:p-10 text-center fade-up">
            <div className="success-ring mx-auto">{I.check({ width: 26, height: 26 })}</div>
            <span className="eyebrow mt-6 inline-block">Payment received</span>
            <h1 className="font-serif text-[clamp(1.7rem,4vw,2.3rem)] text-cream mt-2">
              You're booked, {booking.guest_name.split(' ')[0]}!
            </h1>
            <p className="text-[14px] text-muted mt-2 mb-5">
              A confirmation has been sent to <b className="text-cream">{booking.guest_email}</b>
            </p>

            <div className="ref-code">{booking.ref}</div>

            <div className="summary text-left mt-5">
              <div className="row"><span>Room</span><b>{booking.room_number ? `Room ${booking.room_number} · ` : ''}{booking.room_name}{booking.room_type ? ` · ${booking.room_type}` : ''}</b></div>
              <div className="row"><span>Dates</span><b>{fmtDate(booking.check_in)} → {fmtDate(booking.check_out)}</b></div>
              <div className="row"><span>Guests</span><b>{booking.guests}</b></div>
              <div className="row"><span>Payment</span><b className="text-green-400 flex items-center gap-1.5">{I.check({ width: 13, height: 13 })} Paid</b></div>
              <div className="row total"><span>Total</span><b>{money(booking.total)}</b></div>
            </div>

            <p className="mt-5 text-[12px] text-dim">Keep your reference — you'll need it at check-in. Free cancellation up to 48h before arrival.</p>

            <div className="flex flex-col sm:flex-row justify-center gap-3 mt-7">
              <Link to="/#rooms" className="btn btn-gold">{I.calendar({ width: 15, height: 15 })} Back to rooms</Link>
              <Link to="/" className="btn btn-ghost">Return home</Link>
            </div>
          </div>
        )}

        {state === 'pending' && booking && (
          <div className="card p-8 md:p-10 text-center">
            <div className="mx-auto w-14 h-14 rounded-full grid place-items-center text-gold-400 bg-gold-500/10 border border-gold-500/30">
              {I.shield({ width: 24, height: 24 })}
            </div>
            <h1 className="font-serif text-[22px] text-cream mt-5">We're confirming your payment</h1>
            <p className="text-[13.5px] text-muted mt-2">
              Your booking <b className="text-gold-400 font-mono">{booking.ref}</b> is on hold. Payment confirmation is on its way — if it doesn't appear in a minute, refresh below.
            </p>
            <button className="btn btn-gold mt-6" onClick={confirmAgain}>Check payment status</button>
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
      <Footer onFindBooking={() => {}} />
    </div>
  );
}
