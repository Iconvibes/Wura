import { useCallback, useEffect, useState } from 'react';
import { api, money } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const TIER_CONFIG = {
  silver: { label: 'Silver', color: 'bg-slate-400/15 text-slate-300 border-slate-400/30', icon: 'shield' },
  gold: { label: 'Gold', color: 'bg-gold-500/15 text-gold-300 border-gold-500/30', icon: 'star' },
  platinum: { label: 'Platinum', color: 'bg-purple-500/15 text-purple-300 border-purple-500/30', icon: 'star' },
};

export default function Loyalty() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/loyalty');
      setMembers(data.members || []);
    } catch (e) { toast(e.message, false); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateTier = async (member, tier) => {
    try {
      await api('/api/admin/loyalty/' + member.id, { method: 'PATCH', body: JSON.stringify({ tier }) });
      toast(member.guest_name + ' upgraded to ' + TIER_CONFIG[tier].label);
      load();
    } catch (e) { toast(e.message, false); }
  };

  const stats = {
    total: members.length,
    silver: members.filter((m) => m.tier === 'silver').length,
    gold: members.filter((m) => m.tier === 'gold').length,
    platinum: members.filter((m) => m.tier === 'platinum').length,
    totalPoints: members.reduce((s, m) => s + m.points, 0),
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Loyalty Program</h1>
          <p className="text-[13px] text-muted mt-0.5">Guest points, tiers, and preference tracking.</p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <div className="card p-3 text-center">
          <div className="text-[18px] font-bold text-cream">{stats.total}</div>
          <div className="text-[11px] text-dim">Total members</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[18px] font-bold text-slate-300">{stats.silver}</div>
          <div className="text-[11px] text-dim">Silver</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[18px] font-bold text-gold-400">{stats.gold}</div>
          <div className="text-[11px] text-dim">Gold</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-[18px] font-bold text-purple-400">{stats.platinum}</div>
          <div className="text-[11px] text-dim">Platinum</div>
        </div>
      </div>

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : members.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="mx-auto w-12 h-12 rounded-full grid place-items-center text-dim bg-white/5 border border-white/10 mb-3">
            {Icon({ name: 'star', size: 22 })}
          </div>
          <div className="font-serif text-[18px] text-cream">No loyalty members yet</div>
          <p className="text-[13px] text-muted mt-2 max-w-md mx-auto">
            Members are automatically created when guests complete bookings. Points are earned at 10 points per ₦1,000 spent.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Guest</th><th>Tier</th><th>Points</th><th>Total Spent</th><th>Stays</th><th>Last Stay</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const tier = TIER_CONFIG[m.tier] || TIER_CONFIG.silver;
                  return (
                    <tr key={m.id}>
                      <td>
                        <div className="font-bold text-cream">{m.guest_name || m.guest_email}</div>
                        <div className="text-[12px] text-dim">{m.guest_email}</div>
                      </td>
                      <td>
                        <span className={'text-[11px] tracking-wide uppercase px-2 py-0.5 rounded-full border ' + tier.color}>{tier.label}</span>
                      </td>
                      <td className="font-bold text-gold-400">{m.points.toLocaleString()}</td>
                      <td className="font-bold">{money(m.total_spent)}</td>
                      <td>{m.total_stays}</td>
                      <td className="text-[12px] text-dim">{m.last_stay ? new Date(m.last_stay).toLocaleDateString() : 'Never'}</td>
                      <td>
                        <div className="flex gap-1">
                          {m.tier !== 'gold' && <button className="btn btn-ghost btn-xs" onClick={() => updateTier(m, 'gold')}>Gold</button>}
                          {m.tier !== 'platinum' && <button className="btn btn-ghost btn-xs" onClick={() => updateTier(m, 'platinum')}>Platinum</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
