import { useCallback, useEffect, useState } from 'react';
import { api, money } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const RULE_TYPES = [
  { value: 'weekend', label: 'Weekend Surcharge', icon: 'calendar' },
  { value: 'seasonal', label: 'Seasonal Pricing', icon: 'chart' },
  { value: 'occupancy', label: 'Occupancy-Based', icon: 'occupancy' },
  { value: 'early_bird', label: 'Early Bird Discount', icon: 'bell' },
  { value: 'last_minute', label: 'Last-Minute Deal', icon: 'flash' },
  { value: 'minimum_stay', label: 'Minimum Stay', icon: 'shield' },
  { value: 'event', label: 'Event / Holiday', icon: 'star' },
];

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const EMPTY_RULE = {
  name: '', type: 'weekend', enabled: true, priority: 0,
  room_types: [], days_of_week: [5, 6],
  weekend_surcharge_pct: 15,
  start_date: '', end_date: '', seasonal_multiplier: 1.15,
  occupancy_threshold_pct: 80, occupancy_adjustment_pct: 20,
  advance_days_min: 30, early_bird_discount_pct: 10,
  last_minute_days_max: 1, last_minute_discount_pct: 15,
  min_nights: 2, description: '',
};

function RuleForm({ rule, onSave, onCancel }) {
  const [form, setForm] = useState(rule || { ...EMPTY_RULE });
  const [saving, setSaving] = useState(false);

  const toggleDay = (d) => {
    setForm((f) => ({
      ...f,
      days_of_week: f.days_of_week.includes(d)
        ? f.days_of_week.filter((x) => x !== d)
        : [...f.days_of_week, d],
    }));
  };

  const toggleType = (t) => {
    setForm((f) => ({
      ...f,
      room_types: f.room_types.includes(t)
        ? f.room_types.filter((x) => x !== t)
        : [...f.room_types, t],
    }));
  };

  const submit = async () => {
    if (!form.name.trim()) return toast('Rule name is required.', false);
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      if (rule?.id) {
        await api('/api/admin/pricing/' + rule.id, { method: 'PATCH', body: JSON.stringify(payload) });
        toast('Rule updated');
      } else {
        await api('/api/admin/pricing', { method: 'POST', body: JSON.stringify(payload) });
        toast('Rule created');
      }
      onSave();
    } catch (e) {
      toast(e.message, false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="font-serif text-[18px] text-cream mb-5">{rule?.id ? 'Edit Rule' : 'New Pricing Rule'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-field sm:col-span-2">
          <label>Rule name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Weekend Premium, Summer Season" />
        </div>
        <div className="form-field">
          <label>Rule type</label>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            {RULE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Priority <span className="opacity-50 normal-case">(higher = applied first)</span></label>
          <input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })} />
        </div>
        <div className="form-field sm:col-span-2">
          <label>Applies to room types <span className="opacity-50 normal-case">(empty = all types)</span></label>
          <div className="flex gap-2 mt-1">
            {['Standard', 'Deluxe', 'Suite', 'Penthouse'].map((t) => (
              <button key={t} type="button"
                className={'chip ' + (form.room_types.includes(t) ? 'active' : '')}
                onClick={() => toggleType(t)}>{t}</button>
            ))}
          </div>
        </div>
        <div className="form-field sm:col-span-2">
          <label>Description <span className="opacity-50 normal-case">(shown to admin only)</span></label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional note about this rule" />
        </div>
        <div className="form-field">
          <label>Enabled</label>
          <select value={form.enabled ? '1' : '0'} onChange={(e) => setForm({ ...form, enabled: e.target.value === '1' })}>
            <option value="1">Yes</option>
            <option value="0">No (disabled)</option>
          </select>
        </div>
      </div>

      {form.type === 'weekend' && (
        <div className="mt-5 p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <h4 className="text-[13px] font-bold text-gold-400 mb-3">Weekend Settings</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label>Days of week</label>
              <div className="flex gap-1.5 mt-1">
                {DAYS.map((d, i) => (
                  <button key={i} type="button"
                    className={'w-9 h-9 rounded-lg text-[11px] font-bold border transition-colors ' + (form.days_of_week.includes(i) ? 'bg-gold-500/20 border-gold-500/50 text-gold-300' : 'bg-white/5 border-white/10 text-dim')}
                    onClick={() => toggleDay(i)}>{d}</button>
                ))}
              </div>
            </div>
            <div className="form-field">
              <label>Surcharge (%)</label>
              <input type="number" value={form.weekend_surcharge_pct}
                onChange={(e) => setForm({ ...form, weekend_surcharge_pct: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      {(form.type === 'seasonal' || form.type === 'event') && (
        <div className="mt-5 p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <h4 className="text-[13px] font-bold text-gold-400 mb-3">
            {form.type === 'event' ? 'Event Date Range' : 'Seasonal Period'}
          </h4>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="form-field">
              <label>Start date</label>
              <input type="date" value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
            </div>
            <div className="form-field">
              <label>End date</label>
              <input type="date" value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
            </div>
            <div className="form-field">
              <label>Price multiplier</label>
              <input type="number" step="0.05" value={form.seasonal_multiplier}
                onChange={(e) => setForm({ ...form, seasonal_multiplier: Number(e.target.value) })} />
              <span className="text-[11px] text-dim mt-1">
                {form.seasonal_multiplier >= 1
                  ? '+' + Math.round((form.seasonal_multiplier - 1) * 100) + '% markup'
                  : Math.round((form.seasonal_multiplier - 1) * 100) + '% discount'}
              </span>
            </div>
          </div>
        </div>
      )}

      {form.type === 'occupancy' && (
        <div className="mt-5 p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <h4 className="text-[13px] font-bold text-gold-400 mb-3">Occupancy Threshold</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label>When occupancy exceeds (%)</label>
              <input type="number" value={form.occupancy_threshold_pct}
                onChange={(e) => setForm({ ...form, occupancy_threshold_pct: Number(e.target.value) })} />
            </div>
            <div className="form-field">
              <label>Price adjustment (%)</label>
                              onChange={(e) => setForm({ ...form, occupancy_adjustment_pct: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      {form.type === 'early_bird' && (
        <div className="mt-5 p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <h4 className="text-[13px] font-bold text-gold-400 mb-3">Early Bird Settings</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label>Book N+ days in advance</label>
              <input type="number" value={form.advance_days_min}
                onChange={(e) => setForm({ ...form, advance_days_min: Number(e.target.value) })} />
            </div>
            <div className="form-field">
              <label>Discount (%)</label>
              <input type="number" value={form.early_bird_discount_pct}
                onChange={(e) => setForm({ ...form, early_bird_discount_pct: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      {form.type === 'last_minute' && (
        <div className="mt-5 p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <h4 className="text-[13px] font-bold text-gold-400 mb-3">Last-Minute Settings</h4>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="form-field">
              <label>Book within N days</label>
              <input type="number" value={form.last_minute_days_max}
                onChange={(e) => setForm({ ...form, last_minute_days_max: Number(e.target.value) })} />
            </div>
            <div className="form-field">
              <label>Discount (%)</label>
              <input type="number" value={form.last_minute_discount_pct}
                onChange={(e) => setForm({ ...form, last_minute_discount_pct: Number(e.target.value) })} />
            </div>
          </div>
        </div>
      )}

      {form.type === 'minimum_stay' && (
        <div className="mt-5 p-4 rounded-xl bg-gold-500/5 border border-gold-500/20">
          <h4 className="text-[13px] font-bold text-gold-400 mb-3">Minimum Stay</h4>
          <div className="form-field">
            <label>Minimum nights</label>
            <input type="number" value={form.min_nights}
              onChange={(e) => setForm({ ...form, min_nights: Number(e.target.value) })} />
          </div>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <button className="btn btn-gold" disabled={saving} onClick={submit}>
          {Icon({ name: 'shield', size: 15 })} {saving ? 'Saving...' : (rule?.id ? 'Update Rule' : 'Create Rule')}
        </button>
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

export default function Pricing() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list view, false = new rule, object = edit rule

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/pricing');
      setRules(data.rules || []);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (rule) => {
    try {
      await api('/api/admin/pricing/' + rule.id, { method: 'PATCH', body: JSON.stringify({ enabled: !rule.enabled }) });
      toast(rule.enabled ? 'Rule disabled' : 'Rule enabled');
      await load();
    } catch (e) { toast(e.message, false); }
  };

  const remove = async (rule) => {
    if (!window.confirm('Delete pricing rule "' + rule.name + '"?')) return;
    try {
      await api('/api/admin/pricing/' + rule.id, { method: 'DELETE' });
      toast('Rule deleted');
      await load();
    } catch (e) { toast(e.message, false); }
  };

  if (editing !== null) {
    return (
      <RuleForm
        rule={editing === false ? null : editing}
        onSave={() => { setEditing(null); load(); }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Dynamic Pricing</h1>
          <p className="text-[13px] text-muted mt-0.5">Manage pricing rules that adjust rates automatically</p>
        </div>
        <button className="btn btn-gold" onClick={() => setEditing(false)}>
          {Icon({ name: 'star', size: 15 })} New Rule
        </button>
      </div>

      {loading ? (
        <div className="py-20"><div className="spinner" /></div>
      ) : rules.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-gold-400 mb-3">{Icon({ name: 'chart', size: 32 })}</div>
          <h2 className="font-serif text-[20px] text-cream">No pricing rules yet</h2>
          <p className="text-[13.5px] text-muted mt-2">Create rules to adjust rates for weekends, seasons, occupancy and more.</p>
          <button className="btn btn-gold mt-5" onClick={() => setEditing(false)}>Create your first rule</button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map((r) => (
            <div key={r.id} className="card p-5 flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl grid place-items-center text-gold-400 bg-navy-900 border border-gold-500/25 shrink-0">
                {Icon({ name: RULE_TYPES.find((t) => t.value === r.type)?.icon || 'chart', size: 18 })}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-cream text-[14px] truncate">{r.name}</span>
                  <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-full bg-white/5 text-dim">
                    {RULE_TYPES.find((t) => t.value === r.type)?.label || r.type}
                  </span>
                  {!r.enabled && <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">disabled</span>}
                </div>
                {r.description && <p className="text-[12.5px] text-dim mt-1 truncate">{r.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button className="btn btn-ghost btn-xs" onClick={() => toggle(r)}>
                  {r.enabled ? 'Disable' : 'Enable'}
                </button>
                <button className="btn btn-ghost btn-xs" onClick={() => setEditing(r)}>Edit</button>
                <button className="btn btn-ghost btn-xs !text-red-400/90 hover:!bg-red-500/10" onClick={() => remove(r)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}