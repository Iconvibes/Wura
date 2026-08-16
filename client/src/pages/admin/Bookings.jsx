import { useCallback, useEffect, useState } from 'react';
import { api, money, fmtDate } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const STATUSES = ['all', 'confirmed', 'checked_in', 'checked_out', 'cancelled'];
const STATUS_LABELS = {
  all: 'All', confirmed: 'Confirmed', checked_in: 'In-house', checked_out: 'Checked out', cancelled: 'Cancelled',
};
const PAYMENTS = [['all', 'All payments'], ['paid', 'Paid'], ['unpaid', 'Unpaid']];
const PAYMENT_LABELS = { paid: 'Paid', unpaid: 'Unpaid' };

export default function Bookings() {
  const [filter, setFilter] = useState('all');
  const [payment, setPayment] = useState('all');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.set('status', filter);
      if (payment !== 'all') params.set('payment', payment);
      const qs = params.toString();
      const { bookings } = await api(`/api/admin/bookings${qs ? `?${qs}` : ''}`);
      setBookings(bookings);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, [filter, payment]);

  useEffect(() => { load(); }, [load]);

  const action = async (b, status) => {
    const label = { checked_in: 'Check in', checked_out: 'Check out', cancelled: 'Cancel' }[status];
    if (!window.confirm(`${label} this booking?`)) return;
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
      toast(`${label} — booking updated`);
      load();
    } catch (e) {
      toast(e.message, false);
    }
  };

  const remove = async (b) => {
    if (!window.confirm(`Delete booking ${b.ref}? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/bookings/${b.id}`, { method: 'DELETE' });
      toast('Booking deleted');
      load();
    } catch (e) {
      toast(e.message, false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Bookings</h1>
          <p className="text-[13px] text-muted mt-0.5">Manage reservations, check-ins and cancellations.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-5">
        {STATUSES.map((s) => (
          <button key={s} className={`chip ${filter === s ? 'active' : ''}`} onClick={() => setFilter(s)}>
            {STATUS_LABELS[s]}
          </button>
        ))}
        <span className="w-px bg-white/10 mx-1" />
        {PAYMENTS.map(([v, label]) => (
          <button key={v} className={`chip ${payment === v ? 'active' : ''}`} onClick={() => setPayment(v)}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Bookings table (scroll horizontally with Shift + mouse wheel or arrow keys)">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Ref</th><th>Guest</th><th>Room</th><th>Check-in</th><th>Check-out</th>
                  <th>Guests</th><th>Total</th><th>Payment</th><th>Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.length === 0 && (
                  <tr><td colSpan={10} className="text-center text-dim py-10">No bookings{filter !== 'all' || payment !== 'all' ? ` matching the selected filters` : ''}</td></tr>
                )}
                {bookings.map((b) => (
                  <tr key={b.id}>
                    <td className="font-mono text-[12.5px] text-gold-400">{b.ref}</td>
                    <td>
                      <div className="font-bold text-cream">{b.guest_name}</div>
                      <div className="text-[12px] text-dim">{b.guest_email}</div>
                    </td>
                    <td>
                      <div className="font-bold text-cream">{b.room_number ? `Room ${b.room_number}` : b.room_name}</div>
                      <div className="text-[12px] text-dim">{b.room_number ? `${b.room_name} · ${b.room_type}` : b.room_type}</div>
                    </td>
                    <td className="whitespace-nowrap text-[12.5px]">{fmtDate(b.check_in)}</td>
                    <td className="whitespace-nowrap text-[12.5px]">{fmtDate(b.check_out)}</td>
                    <td>{b.guests}</td>
                    <td className="font-bold">{money(b.total)}</td>
                    <td>
                      <span className={`pill ${b.payment_status}`}>{PAYMENT_LABELS[b.payment_status] || b.payment_status}</span>
                    </td>
                    <td><span className={`pill ${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                    <td>
                      <div className="flex">
                        {b.status === 'confirmed' && (
                          <button className="icon-btn" title="Check in" onClick={() => action(b, 'checked_in')}>{Icon({ name: 'check', size: 15 })}</button>
                        )}
                        {b.status === 'checked_in' && (
                          <button className="icon-btn" title="Check out" onClick={() => action(b, 'checked_out')}>{Icon({ name: 'logout', size: 15 })}</button>
                        )}
                        {(b.status === 'confirmed' || b.status === 'checked_in') && (
                          <button className="icon-btn danger" title="Cancel booking" onClick={() => action(b, 'cancelled')}>{Icon({ name: 'trash', size: 15 })}</button>
                        )}
                        {(b.status === 'cancelled' || b.status === 'checked_out') && (
                          <button className="icon-btn danger" title="Delete booking" onClick={() => remove(b)}>{Icon({ name: 'trash', size: 15 })}</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
