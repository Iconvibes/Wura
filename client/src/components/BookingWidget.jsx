import { I } from './Icons.jsx';
import { addDays, todayISO } from '../api.jsx';

export default function BookingWidget({ dates, setDates, guests, setGuests, onSubmit }) {
  const today = todayISO();

  return (
    <form
      className="card p-5 sm:p-6 mt-8"
      onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
    >
      <div className="grid sm:grid-cols-[1fr_1fr_1fr_auto] gap-3">
        <div className="field">
          <label htmlFor="bw-checkin">Check-in</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500">{I.calendar({ width: 16, height: 16 })}</span>
            <input
              id="bw-checkin"
              type="date"
              value={dates.checkIn}
              min={today}
              onChange={(e) => {
                const ci = e.target.value;
                const next = { ...dates, checkIn: ci };
                if (dates.checkOut && dates.checkOut <= ci) next.checkOut = addDays(ci, 1);
                setDates(next);
              }}
              className="pl-10"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="bw-checkout">Check-out</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500">{I.calendar({ width: 16, height: 16 })}</span>
            <input
              id="bw-checkout"
              type="date"
              value={dates.checkOut}
              min={addDays(dates.checkIn, 1)}
              onChange={(e) => setDates({ ...dates, checkOut: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="bw-guests">Guests</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gold-500">{I.users({ width: 16, height: 16 })}</span>
            <select id="bw-guests" value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="pl-10">
              {[1, 2, 3, 4, 5, 6].map((g) => (
                <option key={g} value={g}>{g} {g === 1 ? 'guest' : 'guests'}</option>
              ))}
            </select>
          </div>
        </div>
        <button type="submit" className="btn btn-gold self-end sm:min-w-[170px]">
          Check availability
        </button>
      </div>
      <p className="flex items-center gap-2 mt-4 text-[12px] text-dim">
        <span className="text-gold-500">{I.shield({ width: 14, height: 14 })}</span>
        Free cancellation up to 48 hours before arrival
      </p>
    </form>
  );
}
