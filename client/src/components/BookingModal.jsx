import { useEffect, useState } from 'react';
import { api, money, fmtDate, addDays, nightsBetween, todayISO } from '../api.js';
import { I } from './Icons.jsx';
import { toast } from './Toast.jsx';

const STEPS = [1, 2, 3];

export default function BookingModal({ open, onClose, initialRoom, dates, setDates, guests, setGuests, onBooked }) {
  const [step, setStep] = useState(1);
  const [room, setRoom] = useState(initialRoom);
  const [available, setAvailable] = useState([]);
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [fetchedFor, setFetchedFor] = useState(null); // dates+guests the picker was loaded for
  const [form, setForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Reset state each time the modal opens with a new room.
  useEffect(() => {
    if (open) {
      setStep(initialRoom ? 2 : 1);
      setRoom(initialRoom || null);
      setResult(null);
      setAvailable([]);
      setFetchedFor(null);
      setForm({ name: '', email: '', phone: '', notes: '' });
      setErrors({});
    }
  }, [open, initialRoom]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    if (open) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', onKey);
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [open, onClose]);

  // When we reach step 2, fetch availability fresh for the current dates/guests.
  useEffect(() => {
    if (!open || step !== 2) return;
    const key = `${dates.checkIn}|${dates.checkOut}|${guests}`;
    if (fetchedFor === key) return;
    setLoadingRooms(true);
    api(`/api/rooms?checkIn=${dates.checkIn}&checkOut=${dates.checkOut}&guests=${guests}`)
      .then(({ rooms }) => { setAvailable(rooms); setFetchedFor(key); })
      .catch((e) => { toast(e.message, false); setAvailable([]); setFetchedFor(key); })
      .finally(() => setLoadingRooms(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step, dates.checkIn, dates.checkOut, guests, fetchedFor]);

  if (!open) return null;
  const nights = nightsBetween(dates.checkIn, dates.checkOut) || 1;

  const validateAndSubmit = async () => {
    const errs = {};
    if (form.name.trim().length < 2) errs.name = 'Please enter your full name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errs.email = 'Please enter a valid email.';
    setErrors(errs);
    if (Object.keys(errs).length) return;

    setSubmitting(true);
    try {
      const { booking } = await api('/api/bookings', {
        method: 'POST',
        body: JSON.stringify({
          room_id: room.id,
          guest_name: form.name,
          guest_email: form.email,
          guest_phone: form.phone,
          check_in: dates.checkIn,
          check_out: dates.checkOut,
          guests,
          notes: form.notes,
        }),
      });
      setResult(booking);
      setStep(4);
      onBooked();
    } catch (e) {
      toast(e.message, false);
    } finally {
      setSubmitting(false);
    }
  };

  const nextFromDates = () => {
    if (!dates.checkIn || !dates.checkOut) return toast('Please choose both dates.');
    if (dates.checkOut <= dates.checkIn) return toast('Check-out must be after check-in.');
    setStep(2);
  };

  return (
    <div className={`modal-backdrop ${open ? 'open' : ''}`} onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="font-serif text-[19px] text-cream">
            {step === 4 ? 'Booking confirmed' : 'Reserve your stay'}
          </span>
          <button className="modal-close" onClick={onClose} aria-label="Close">{I.close({ width: 16, height: 16 })}</button>
        </div>

        <div className="p-6">
          {step < 4 && (
            <div className="steps">
              {STEPS.map((s) => <span key={s} className={`step-dot ${s <= step ? 'done' : ''}`} />)}
            </div>
          )}

          {/* STEP 1 — dates */}
          {step === 1 && (
            <>
              <h4 className="font-serif text-[20px] text-cream mb-4">When would you like to stay?</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label>Check-in</label>
                  <input type="date" value={dates.checkIn} min={todayISO()} onChange={(e) => setDates({ ...dates, checkIn: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Check-out</label>
                  <input type="date" value={dates.checkOut} min={addDays(dates.checkIn, 1)} onChange={(e) => setDates({ ...dates, checkOut: e.target.value })} />
                </div>
                <div className="form-field sm:col-span-2">
                  <label>Guests</label>
                  <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6].map((g) => <option key={g} value={g}>{g} {g === 1 ? 'guest' : 'guests'}</option>)}
                  </select>
                </div>
              </div>
              <div className="mt-5 p-4 rounded-xl bg-gold-500/8 border border-gold-500/25 text-[13px] text-muted">
                {I.calendar({ width: 15, height: 15 })}{' '}
                <b className="text-cream">{fmtDate(dates.checkIn)}</b> → <b className="text-cream">{fmtDate(dates.checkOut)}</b> · {nights} night{nights > 1 ? 's' : ''}
              </div>
            </>
          )}

          {/* STEP 2 — pick room */}
          {step === 2 && (
            <>
              <h4 className="font-serif text-[20px] text-cream mb-1">Choose your room</h4>
              <p className="text-[13px] text-muted mb-4">
                {fmtDate(dates.checkIn)} → {fmtDate(dates.checkOut)} · {nights} night{nights > 1 ? 's' : ''} · {guests} guest{guests > 1 ? 's' : ''}
              </p>
              {loadingRooms && <div className="spinner" />}
              {!loadingRooms && available.length === 0 && !room && (
                <div className="text-center py-8">
                  <div className="font-serif text-[18px] text-cream">Sold out</div>
                  <p className="text-[13px] text-muted mt-1">No rooms match those dates. Try shifting your stay.</p>
                </div>
              )}
              {!loadingRooms && available.length === 0 && room && (
                <div className="text-center py-8">
                  <div className="font-serif text-[18px] text-cream">{room.name}</div>
                  <p className="text-[13px] text-muted mt-1">{room.type} · up to {room.capacity} guests · {money(room.price)} / night</p>
                </div>
              )}
              {!loadingRooms && available.map((r) => (
                <div
                  key={r.id}
                  className={`bp-row ${room?.id === r.id ? 'selected' : ''}`}
                  onClick={() => setRoom(r)}
                >
                  <img src={r.art} alt={r.name} />
                  <div className="min-w-0">
                    <div className="bp-name">{r.name}</div>
                    <div className="bp-meta">{r.type} · up to {r.capacity} guests · {r.size_sqm} m²</div>
                  </div>
                  <div className="bp-price">{money(r.price)} <span className="font-sans text-[11px] text-dim font-normal">/nt</span></div>
                </div>
              ))}
            </>
          )}

          {/* STEP 3 — guest details */}
          {step === 3 && room && (
            <>
              <h4 className="font-serif text-[20px] text-cream mb-4">Your details</h4>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field sm:col-span-2">
                  <label>Full name</label>
                  <input type="text" placeholder="e.g. Amara Okafor" className={errors.name ? 'invalid' : ''} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  <span className="err">{errors.name || ''}</span>
                </div>
                <div className="form-field sm:col-span-2">
                  <label>Email</label>
                  <input type="email" placeholder="you@example.com" className={errors.email ? 'invalid' : ''} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  <span className="err">{errors.email || ''}</span>
                </div>
                <div className="form-field sm:col-span-2">
                  <label>Phone <span className="opacity-50 normal-case">(optional)</span></label>
                  <input type="tel" placeholder="+1 555 000 0000" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-field sm:col-span-2">
                  <label>Special requests <span className="opacity-50 normal-case">(optional)</span></label>
                  <textarea rows={2} placeholder="Late arrival, airport pickup, anniversary…" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="summary mt-5">
                <div className="row"><span>{room.name}</span><b>{money(room.price)} × {nights} night{nights > 1 ? 's' : ''}</b></div>
                <div className="row"><span>Dates</span><b>{fmtDate(dates.checkIn)} → {fmtDate(dates.checkOut)}</b></div>
                <div className="row"><span>Guests</span><b>{guests}</b></div>
                <div className="row total"><span>Total</span><b>{money(room.price * nights)}</b></div>
              </div>
            </>
          )}

          {/* STEP 4 — success */}
          {step === 4 && result && (
            <div className="text-center py-2">
              <div className="success-ring">{I.check({ width: 26, height: 26 })}</div>
              <h4 className="font-serif text-[24px] text-cream mb-2">You're booked, {result.guest_name.split(' ')[0]}!</h4>
              <p className="text-[14px] text-muted mb-1">
                A confirmation has been sent to <b className="text-cream">{result.guest_email}</b>
              </p>
              <div className="ref-code">{result.ref}</div>
              <div className="summary text-left">
                <div className="row"><span>Room</span><b>{result.room_name} {result.room_type ? `· ${result.room_type}` : ''}</b></div>
                <div className="row"><span>Dates</span><b>{fmtDate(result.check_in)} → {fmtDate(result.check_out)}</b></div>
                <div className="row"><span>Guests</span><b>{result.guests}</b></div>
                <div className="row total"><span>Total</span><b>{money(result.total)}</b></div>
              </div>
              <p className="mt-4 text-[12px] text-dim">Keep your reference — you'll need it at check-in. Free cancellation up to 48h before arrival.</p>
            </div>
          )}
        </div>

        {/* footer buttons */}
        <div className="px-6 pb-6 pt-1 flex justify-end gap-3">
          {step === 1 && (
            <>
              <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
              <button className="btn btn-gold" onClick={nextFromDates}>Continue</button>
            </>
          )}
          {step === 2 && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep(1)}>Back</button>
              <button className="btn btn-gold" disabled={!room} onClick={() => setStep(3)}>Continue</button>
            </>
          )}
          {step === 3 && (
            <>
              <button className="btn btn-ghost" onClick={() => setStep(2)}>Back</button>
              <button className="btn btn-gold" disabled={submitting} onClick={validateAndSubmit}>
                {submitting ? 'Confirming…' : 'Confirm booking'}
              </button>
            </>
          )}
          {step === 4 && (
            <button className="btn btn-gold btn-block" onClick={onClose}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
}
