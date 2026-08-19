import { useCallback, useEffect, useState } from 'react';
import { api, money, fmtDate } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const ACTION_STYLES = {
  paid: {
    label: 'Payment collected',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    icon: 'check',
  },
  refunded: {
    label: 'Refunded',
    color: 'text-red-300',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    icon: 'close',
  },
};

function EventCard({ e }) {
  const style = ACTION_STYLES[e.action] || ACTION_STYLES.paid;
  const at = e.at ? new Date(e.at) : null;
  const timeStr = at
    ? at.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : '';
  const dateStr = at
    ? at.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
    : '';

  return (
    <div className="card p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-full grid place-items-center flex-shrink-0 ${style.bg} border ${style.border} ${style.color}`}>
        {Icon({ name: style.icon, size: 18 })}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[13px] font-bold ${style.color}`}>{style.label}</span>
          <span className="text-[13px] font-bold text-gold-400">{money(e.total)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-[12.5px] text-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-gold-500">{Icon({ name: 'bookings', size: 12 })}</span>
            <span className="font-mono text-gold-400">{e.ref}</span>
          </span>
          <span>{e.guest_name}</span>
          <span>{e.room_number ? `Room ${e.room_number}` : e.room_name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11.5px] text-dim">
          <span className="inline-flex items-center gap-1.5">
            <span className="text-gold-500">{Icon({ name: 'users', size: 11 })}</span>
            Collected by <b className="text-cream">{e.by}</b>
          </span>
          {dateStr && <span>{dateStr} at {timeStr}</span>}
        </div>
        {e.note && (
          <p className="text-[12px] italic text-muted mt-2 border-l-2 border-gold-500/30 pl-2.5">
            {e.note}
          </p>
        )}
      </div>
    </div>
  );
}

export default function Payments() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/payments');
      setEvents(data.events);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Summary stats
  const totalCollected = events
    .filter((e) => e.action === 'paid')
    .reduce((sum, e) => sum + e.total, 0);
  const totalRefunded = events
    .filter((e) => e.action === 'refunded')
    .reduce((sum, e) => sum + e.total, 0);
  const staffMap = {};
  events.forEach((e) => {
    if (e.action === 'paid') {
      staffMap[e.by] = (staffMap[e.by] || 0) + 1;
    }
  });
  const topStaff = Object.entries(staffMap).sort((a, b) => b[1] - a[1]);

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Payment History</h1>
          <p className="text-[13px] text-muted mt-0.5">All payment collections and refunds across bookings.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
      </div>

      {/* Summary cards */}
      <div className="grid sm:grid-cols-3 gap-4 mb-7">
        <div className="card p-5">
          <div className="text-[10.5px] tracking-[2px] uppercase text-dim font-bold">Total collected</div>
          <div className="font-serif text-[28px] text-green-400 mt-1.5">{money(totalCollected)}</div>
          <div className="text-[11.5px] text-dim mt-1">{events.filter((e) => e.action === 'paid').length} payment{events.filter((e) => e.action === 'paid').length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card p-5">
          <div className="text-[10.5px] tracking-[2px] uppercase text-dim font-bold">Total refunded</div>
          <div className="font-serif text-[28px] text-red-300 mt-1.5">{money(totalRefunded)}</div>
          <div className="text-[11.5px] text-dim mt-1">{events.filter((e) => e.action === 'refunded').length} refund{events.filter((e) => e.action === 'refunded').length !== 1 ? 's' : ''}</div>
        </div>
        <div className="card p-5">
          <div className="text-[10.5px] tracking-[2px] uppercase text-dim font-bold">Top collector</div>
          {topStaff.length > 0 ? (
            <>
              <div className="font-serif text-[22px] text-gold-400 mt-1.5">{topStaff[0][0]}</div>
              <div className="text-[11.5px] text-dim mt-1">{topStaff[0][1]} payment{topStaff[0][1] !== 1 ? 's' : ''} collected</div>
            </>
          ) : (
            <div className="font-serif text-[18px] text-dim mt-1.5">—</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : events.length === 0 ? (
        <div className="card border-dashed p-12 text-center">
          <div className="mx-auto w-14 h-14 rounded-full grid place-items-center text-dim bg-white/5 border border-white/10 mb-4">
            {Icon({ name: 'shield', size: 24 })}
          </div>
          <p className="text-[14px] text-muted">No payment events yet.</p>
          <p className="text-[12.5px] text-dim mt-1">Payments will appear here when staff collect at the front desk.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((e, i) => (
            <EventCard key={`${e.booking_id}-${e.action}-${i}`} e={e} />
          ))}
        </div>
      )}
    </div>
  );
}
