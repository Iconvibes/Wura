import { useEffect, useState } from 'react';
import { api, money, fmtDate } from '../api.jsx';
import { I } from './Icons.jsx';

export default function FindBookingModal({ open, onClose }) {
  const [ref, setRef] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [searching, setSearching] = useState(false);

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

  useEffect(() => {
    if (!open) { setRef(''); setResult(null); setError(null); return; }
    if (ref.trim().length < 6) { setResult(null); setError(null); return; }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const { booking } = await api(`/api/bookings/${encodeURIComponent(ref.trim())}`);
        setResult(booking);
        setError(null);
      } catch (e) {
        setResult(null);
        setError(e.message);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [ref, open]);

  if (!open) return null;

  return (
    <div className="modal-backdrop open" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <span className="font-serif text-[19px] text-cream">Look up your stay</span>
          <button className="modal-close" onClick={onClose} aria-label="Close">{I.close({ width: 16, height: 16 })}</button>
        </div>
        <div className="p-6">
          <p className="text-[13px] text-muted mb-4">Enter the reference from your confirmation email.</p>
          <div className="form-field">
            <label htmlFor="fbm-ref">Booking reference</label>
            <input
              id="fbm-ref"
              type="text"
              placeholder="e.g. WU1A2B3C"
              value={ref}
              onChange={(e) => setRef(e.target.value.toUpperCase())}
              autoFocus
              className="tracking-[2px] uppercase font-mono"
            />
          </div>
          {searching && <div className="spinner" style={{ marginTop: 24 }} />}
          {error && <p className="text-red-soft text-[13px] mt-4">{error}</p>}
          {result && (
            <div className="summary mt-5">
              <div className="row"><span>Reference</span><b className="font-mono text-gold-400">{result.ref}</b></div>
              <div className="row"><span>Room</span><b>{result.room_number ? `Room ${result.room_number} · ` : ''}{result.room_name} · {result.room_type}</b></div>
              <div className="row"><span>Guest</span><b>{result.guest_name}</b></div>
              <div className="row"><span>Dates</span><b>{fmtDate(result.check_in)} → {fmtDate(result.check_out)}</b></div>
              <div className="row"><span>Guests</span><b>{result.guests}</b></div>
              <div className="row"><span>Total</span><b>{money(result.total)}</b></div>
              <div className="row"><span>Status</span><span className={`pill ${result.status}`}>{result.status.replace('_', ' ')}</span></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
