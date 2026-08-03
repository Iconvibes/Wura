import { useCallback, useEffect, useState } from 'react';
import { api, money, fmtDate } from '../../api.js';
import { Icon } from '../../components/Icons.jsx';

const INITIAL = {
  stats: {
    arrivals: 0, departures: 0, occupancy30: 0, occupancy: [],
    revenueMonth: 0, revenueTotal: 0, byStatus: {},
    totalBookings: 0, totalRooms: 0, activeRooms: 0,
  },
  recent: [],
};

export default function Overview() {
  const [data, setData] = useState(INITIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api('/api/admin/overview');
      setData(d);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const { stats, recent } = data;
  const pctClass = stats.occupancy30 >= 80 ? 'up' : stats.occupancy30 >= 50 ? 'warn' : '';

  return (
    <div className="max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Good day, admin 👋</h1>
          <p className="text-[13px] text-muted mt-0.5">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
      </div>

      {error && <p className="text-red-soft text-[14px] mb-5">{error}</p>}

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : (
        <>
          {/* stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="label flex items-center gap-2">{Icon({ name: 'bell', size: 15 })} Arrivals today</div>
              <div className="value">{stats.arrivals}</div>
              <div className={`delta ${stats.arrivals ? 'warn' : ''}`}>{stats.arrivals ? 'Check-ins expected' : 'No arrivals scheduled'}</div>
            </div>
            <div className="stat-card">
              <div className="label flex items-center gap-2">{Icon({ name: 'bell', size: 15 })} Departures today</div>
              <div className="value">{stats.departures}</div>
              <div className="delta">{stats.departures ? 'Housekeeping alerted' : 'All quiet'}</div>
            </div>
            <div className="stat-card">
              <div className="label flex items-center gap-2">{Icon({ name: 'occupancy', size: 15 })} Occupancy · 30 days</div>
              <div className="value">{stats.occupancy30}<small>%</small></div>
              <div className={`delta ${pctClass}`}>{stats.activeRooms} active rooms</div>
            </div>
            <div className="stat-card">
              <div className="label flex items-center gap-2">{Icon({ name: 'revenue', size: 15 })} Revenue · this month</div>
              <div className="value">{money(stats.revenueMonth)}</div>
              <div className="delta up">{money(stats.revenueTotal)} all-time</div>
            </div>
            <div className="stat-card">
              <div className="label flex items-center gap-2">{Icon({ name: 'bookings', size: 15 })} Bookings</div>
              <div className="value">{stats.totalBookings}</div>
              <div className="delta">{stats.byStatus.confirmed || 0} confirmed · {stats.byStatus.checked_in || 0} in-house</div>
            </div>
          </div>

          {/* occupancy chart */}
          <div className="card p-6 mt-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-serif text-[18px] text-cream">Occupancy — next 30 days</h2>
              <span className="text-[12px] text-dim">30-day average shown in the stat card</span>
            </div>
            <div className="flex items-end gap-[3px] h-40 mt-5">
              {stats.occupancy.map((o) => {
                const hot = o.pct >= 90;
                return (
                  <div
                    key={o.day}
                    className={`occ-bar ${hot ? 'hot' : ''}`}
                    style={{ height: `${Math.max(3, o.pct)}%` }}
                    title={`${o.day} · ${o.pct}%`}
                  />
                );
              })}
            </div>
            <div className="flex justify-between text-[10.5px] text-dim mt-2">
              {stats.occupancy.filter((_, i) => i % 5 === 0).map((o) => (
                <span key={o.day}>{fmtDate(o.day)}</span>
              ))}
            </div>
          </div>

          {/* recent bookings */}
          <div className="card p-6 mt-6">
            <div className="flex items-baseline justify-between mb-4">
              <h2 className="font-serif text-[18px] text-cream">Recent bookings</h2>
              <span className="text-[12px] text-dim">Latest activity</span>
            </div>
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ref</th><th>Guest</th><th>Room</th><th>Dates</th><th>Total</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.length === 0 && (
                    <tr><td colSpan={6} className="text-center text-dim py-8">No bookings yet</td></tr>
                  )}
                  {recent.map((b) => (
                    <tr key={b.id}>
                      <td className="font-mono text-[12.5px] text-gold-400">{b.ref}</td>
                      <td>
                        <div className="font-bold text-cream">{b.guest_name}</div>
                        <div className="text-[12px] text-dim">{b.guest_email}</div>
                      </td>
                      <td>{b.room_name}</td>
                      <td className="whitespace-nowrap text-[12.5px]">{fmtDate(b.check_in)} → {fmtDate(b.check_out)}</td>
                      <td className="font-bold">{money(b.total)}</td>
                      <td><span className={`pill ${b.status}`}>{b.status.replace('_', ' ')}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
