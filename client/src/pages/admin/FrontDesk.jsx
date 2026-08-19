import { useCallback, useEffect, useState } from 'react';
import { api, money, fmtDate } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

function GuestCard({ b, type, onAction, onMarkPaid }) {
  const isArrival = type === 'arrival';
  const label = isArrival ? 'Check in' : 'Check out';
  const statusLabel = isArrival ? 'Arriving today' : 'Departing today';
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [payBusy, setPayBusy] = useState(false);

  const unpaid = b.payment_status !== 'paid';

  const act = async () => {
    setBusy(true);
    try {
      await onAction(b, isArrival ? 'checked_in' : 'checked_out', label);
      setDone(true);
    } catch (e) {
      toast(e.message, false);
      setBusy(false);
    }
  };

  const markPaid = async () => {
    setPayBusy(true);
    try {
      await onMarkPaid(b);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <div className={`card fd-card overflow-hidden ${done ? 'fd-card-success' : ''} ${unpaid ? 'ring-1 ring-amber-500/40' : ''}`}>
      <div className="relative">
        <img src={b.room_art} alt={b.room_name} className="w-full aspect-16/7 object-cover" />
        <span className="absolute top-3 left-3 text-[10px] tracking-[2px] uppercase font-bold text-gold-300 bg-navy-950/75 border border-gold-500/40 rounded-md px-2.5 py-1">
          {b.room_type}
        </span>
        {unpaid && (
          <span className="absolute top-3 right-3 text-[10px] tracking-[2px] uppercase font-bold text-amber-300 bg-amber-900/80 border border-amber-500/50 rounded-md px-2.5 py-1 flex items-center gap-1">
            {Icon({ name: 'shield', size: 11 })} Unpaid
          </span>
        )}
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="fd-guest-avatar">{b.guest_name.charAt(0).toUpperCase()}</div>
            <div>
              <div className="font-bold text-cream">{b.guest_name}</div>
              <div className="text-[12px] text-dim">{b.guest_email}</div>
            </div>
          </div>
          <span className={`pill ${b.status}`}>{statusLabel}</span>
        </div>

        <div className="flex flex-wrap gap-x-5 gap-y-1.5 mt-4 text-[12.5px] text-dim">
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{Icon({ name: 'bookings', size: 13 })}</span> {b.room_number ? `Room ${b.room_number} · ` : ''}{b.room_name}</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{Icon({ name: 'users', size: 13 })}</span> {b.guests} guest{b.guests > 1 ? 's' : ''}</span>
          <span className="inline-flex items-center gap-1.5 font-mono text-[12px] text-gold-400">{b.ref}</span>
        </div>

        {b.notes && <p className="text-[12.5px] italic text-muted mt-3 border-l-2 border-gold-500/40 pl-3">{b.notes}</p>}

        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <button className="btn btn-gold btn-sm" onClick={act} disabled={busy || done}>
              {busy ? (
                <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
              ) : (
                <>{Icon({ name: 'check', size: 14 })} {label}</>
              )}
            </button>
            {unpaid && isArrival && (
              <button className="btn btn-gold btn-sm" onClick={markPaid} disabled={payBusy} title="Mark as paid (pay on arrival)">
                {payBusy ? (
                  <span className="spinner" style={{ width: 16, height: 16, borderWidth: 2, margin: 0 }} />
                ) : (
                  <>{Icon({ name: 'shield', size: 14 })} Collect payment</>
                )}
              </button>
            )}
          </div>
          <div className="font-serif text-[20px] text-gold-400">{money(b.total)}</div>
        </div>
      </div>
    </div>
  );
}

function Column({ title, icon, count, unpaidCount, children }) {
  return (
    <div>
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-9 h-9 rounded-lg grid place-items-center text-gold-400 bg-gold-500/10 border border-gold-500/25">
          {Icon({ name: icon, size: 17 })}
        </span>
        <span className="font-serif text-[18px] text-cream">{title}</span>
        <span className="text-[12px] font-bold text-gold-400 bg-gold-500/12 border border-gold-500/30 rounded-full px-2.5 py-0.5">{count}</span>
        {unpaidCount > 0 && (
          <span className="text-[11px] font-bold text-amber-300 bg-amber-500/15 border border-amber-500/35 rounded-full px-2.5 py-0.5">
            {unpaidCount} unpaid
          </span>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function EmptyState({ msg }) {
  return (
    <div className="card border-dashed p-10 text-center">
      <div className="mx-auto w-12 h-12 rounded-full grid place-items-center text-dim bg-white/5 border border-white/10 mb-3">
        {Icon({ name: 'users', size: 22 })}
      </div>
      <p className="text-[13.5px] text-muted">{msg}</p>
    </div>
  );
}

export default function FrontDesk() {
  const [data, setData] = useState({ arrivals: [], departures: [], today: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api('/api/admin/front-desk'));
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAction = async (b, status, label) => {
    await api(`/api/admin/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
    toast(`${label} — ${b.guest_name}`);
    // Remove the card after a short delay to let the success animation play.
    setTimeout(() => {
      setData((prev) => ({
        ...prev,
        arrivals: prev.arrivals.filter((x) => x.id !== b.id),
        departures: prev.departures.filter((x) => x.id !== b.id),
      }));
    }, 600);
  };

  const handleMarkPaid = async (b) => {
    await api(`/api/admin/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ payment_status: 'paid' }) });
    toast(`Payment recorded — ${b.guest_name}`);
    // Update the card in-place so the "Unpaid" pill disappears.
    setData((prev) => ({
      ...prev,
      arrivals: prev.arrivals.map((x) => x.id === b.id ? { ...x, payment_status: 'paid' } : x),
      departures: prev.departures.map((x) => x.id === b.id ? { ...x, payment_status: 'paid' } : x),
    }));
  };

  // Sort unpaid arrivals to the top so staff see them first.
  const sortedArrivals = [...data.arrivals].sort((a, b) => {
    const aUnpaid = a.payment_status !== 'paid' ? 0 : 1;
    const bUnpaid = b.payment_status !== 'paid' ? 0 : 1;
    return aUnpaid - bUnpaid;
  });
  const unpaidArrivals = data.arrivals.filter((b) => b.payment_status !== 'paid');

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Front Desk</h1>
          <p className="text-[13px] text-muted mt-0.5">
            {data.today ? new Date(`${data.today}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) : ''}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
      </div>

      {unpaidArrivals.length > 0 && (
        <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/8 p-4 flex items-start gap-3">
          <span className="mt-0.5 text-amber-400 flex-shrink-0">{Icon({ name: 'shield', size: 18 })}</span>
          <div>
            <div className="text-[14px] font-bold text-amber-200">
              {unpaidArrivals.length} arrival{unpaidArrivals.length > 1 ? 's' : ''} with unpaid balance
            </div>
            <p className="text-[12.5px] text-amber-300/70 mt-0.5">
              Total outstanding: {money(unpaidArrivals.reduce((sum, b) => sum + b.total, 0))} — collect payment at check-in.
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          <Column title="Arrivals" icon="bell" count={data.arrivals.length} unpaidCount={unpaidArrivals.length}>
            {sortedArrivals.length === 0
              ? <EmptyState msg="No arrivals scheduled today" />
              : sortedArrivals.map((b) => <GuestCard key={b.id} b={b} type="arrival" onAction={handleAction} onMarkPaid={handleMarkPaid} />)}
          </Column>
          <Column title="Departures" icon="bell" count={data.departures.length}>
            {data.departures.length === 0
              ? <EmptyState msg="No departures scheduled today" />
              : data.departures.map((b) => <GuestCard key={b.id} b={b} type="departure" onAction={handleAction} onMarkPaid={handleMarkPaid} />)}
          </Column>
        </div>
      )}
    </div>
  );
}
