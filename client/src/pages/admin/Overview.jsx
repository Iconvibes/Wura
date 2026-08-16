import { useCallback, useEffect, useState } from 'react';
import { api, money, fmtDate } from '../../api.js';
import { Icon } from '../../components/Icons.jsx';
import { AreaChart, Donut, StatusBars, GOLD, STATUS_COLORS } from './charts.jsx';

const INITIAL = {
  stats: {
    arrivals: 0, departures: 0, occupancy30: 0, occupancy: [],
    revenueMonth: 0, revenueTotal: 0, revenueSeries: [], byStatus: {}, byType: {}, byPayment: {},
    inHouse: 0, totalBookings: 0, totalRooms: 0, activeRooms: 0,
  },
  recent: [],
};

/* Tiny sparkline for the revenue KPI card — accepts { value } or { amount }. */
function Sparkline({ data, w = 130, h = 36 }) {
  if (data.length < 2) return null;
  const vals = data.map((d) => d.value ?? d.amount ?? 0);
  const max = Math.max(1, ...vals);
  const pts = vals.map((v, i) => `${(i / (data.length - 1)) * w},${h - (v / max) * h}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="block mt-3">
      <polyline points={pts} fill="none" stroke="#d4af37" strokeWidth="2" strokeLinecap="round" opacity="0.9" />
      <polygon points={`0,${h} ${pts} ${w},${h}`} fill="rgba(212,175,55,0.12)" />
    </svg>
  );
}

const STATUS_LABELS = {
  confirmed: 'Confirmed', checked_in: 'In-house', checked_out: 'Checked out', cancelled: 'Cancelled',
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

  const typeSegs = Object.entries(stats.byType)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value], i) => ({ label, value, color: GOLD[i % GOLD.length] }));

  const statusRows = ['confirmed', 'checked_in', 'checked_out', 'cancelled']
    .map((s) => ({ label: STATUS_LABELS[s], value: stats.byStatus[s] || 0, color: STATUS_COLORS[s] }));

  const payRows = [
    { label: 'Paid', value: stats.byPayment.paid || 0, color: '#4ade80' },
    { label: 'Unpaid', value: stats.byPayment.unpaid || 0, color: '#f87171' },
  ];

  const typeTotal = typeSegs.reduce((s, x) => s + x.value, 0);

  return (
    <div className="max-w-6xl">
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
          {/* ============================== KPIs ============================== */}
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
              <div className="label flex items-center gap-2">{Icon({ name: 'users', size: 15 })} In-house now</div>
              <div className="value">{stats.inHouse}</div>
              <div className={`delta ${stats.inHouse ? 'up' : ''}`}>{stats.inHouse ? 'Guests on property' : 'No guests in-house'}</div>
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
              <Sparkline data={stats.revenueSeries} />
            </div>
            <div className="stat-card">
              <div className="label flex items-center gap-2">{Icon({ name: 'bookings', size: 15 })} Bookings</div>
              <div className="value">{stats.totalBookings}</div>
              <div className="delta">{stats.byStatus.confirmed || 0} confirmed · {stats.inHouse} in-house</div>
            </div>
          </div>

          {/* ======================= revenue + room mix ======================= */}
          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <div className="card p-6 lg:col-span-2">
              <div className="flex items-baseline justify-between">
                <h2 className="font-serif text-[18px] text-cream">Revenue outlook — next 30 days</h2>
                <span className="text-[12px] text-dim">By check-in date</span>
              </div>
              <div className="mt-4">
                <AreaChart data={stats.revenueSeries.map((r) => ({ label: r.day, tip: fmtDate(r.day), value: r.amount }))} />
              </div>
            </div>

            <div className="card p-6">
              <h2 className="font-serif text-[18px] text-cream">Bookings by room type</h2>
              <div className="flex flex-col items-center mt-5">
                <Donut segments={typeSegs} centerValue={typeTotal || 0} centerLabel="bookings" />
                <div className="w-full mt-6 space-y-2">
                  {typeSegs.map((s) => (
                    <div key={s.label} className="flex items-center justify-between text-[12.5px]">
                      <span className="text-muted flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <span className="text-cream font-bold">{s.value} <span className="text-dim font-normal">· {typeTotal ? Math.round((s.value / typeTotal) * 100) : 0}%</span></span>
                    </div>
                  ))}
                  {typeSegs.length === 0 && <div className="text-[12.5px] text-dim text-center py-4">No bookings yet</div>}
                </div>
              </div>
            </div>
          </div>

          {/* ====================== occupancy + status ======================= */}
          <div className="grid lg:grid-cols-3 gap-4 mt-4">
            <div className="card p-6 lg:col-span-2">
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
                      title={`${fmtDate(o.day)} · ${o.pct}%`}
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

            <div className="card p-6">
              <h2 className="font-serif text-[18px] text-cream">Booking status</h2>
              <div className="mt-5">
                <StatusBars rows={statusRows} />
              </div>
              <div className="border-t border-white/5 mt-6 pt-5">
                <h3 className="text-[11px] tracking-[2.5px] uppercase text-gold-500 font-bold mb-4">Payments</h3>
                <StatusBars rows={payRows} />
              </div>
            </div>
          </div>

          {/* ========================= recent bookings ======================== */}
          <div className="card p-6 mt-4">
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
