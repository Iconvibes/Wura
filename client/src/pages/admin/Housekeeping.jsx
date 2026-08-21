import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const STATUS_CONFIG = {
  dirty: { label: 'Dirty', color: 'bg-red-500/15 text-red-300 border-red-500/30', dot: 'bg-red-400' },
  in_progress: { label: 'In Progress', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30', dot: 'bg-amber-400' },
  clean: { label: 'Clean', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  inspected: { label: 'Inspected', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30', dot: 'bg-blue-400' },
};

const PRIORITY_CONFIG = {
  normal: { label: 'Normal', color: '' },
  high: { label: 'High', color: 'text-amber-400' },
  urgent: { label: 'Urgent', color: 'text-red-400' },
};

export default function Housekeeping() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [filter, setFilter] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api('/api/admin/housekeeping?date=' + date);
      setTasks(data.tasks || []);
    } catch (e) { toast(e.message, false); }
    finally { setLoading(false); }
  }, [date]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (task, newStatus) => {
    try {
      await api('/api/admin/housekeeping/' + task.id, { method: 'PATCH', body: JSON.stringify({ status: newStatus }) });
      toast('Room ' + (task.room_number || task.room_name) + ': ' + STATUS_CONFIG[newStatus].label);
      load();
    } catch (e) { toast(e.message, false); }
  };

  const assign = async (task, name) => {
    try {
      await api('/api/admin/housekeeping/' + task.id, { method: 'PATCH', body: JSON.stringify({ assigned_to: name }) });
      toast('Assigned to ' + name);
      load();
    } catch (e) { toast(e.message, false); }
  };

  const filtered = tasks.filter((t) => filter === 'all' || t.status === filter);
  const counts = { dirty: 0, in_progress: 0, clean: 0, inspected: 0 };
  tasks.forEach((t) => { if (counts[t.status] !== undefined) counts[t.status]++; });

  // Group by floor
  const byFloor = {};
  filtered.forEach((t) => {
    const f = t.floor || 0;
    if (!byFloor[f]) byFloor[f] = [];
    byFloor[f].push(t);
  });

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Housekeeping</h1>
          <p className="text-[13px] text-muted mt-0.5">Room cleaning status and staff assignments.</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="rounded-lg text-[13px]" style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '8px 12px' }} />
          <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
        </div>
      </div>

      {/* Status summary bar */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <button key={key} onClick={() => setFilter(filter === key ? 'all' : key)}
            className={'card p-3 text-center transition-all ' + (filter === key ? 'ring-1 ring-gold-500/50' : '')}>
            <div className={'w-3 h-3 rounded-full mx-auto mb-1.5 ' + cfg.dot} />
            <div className="text-[18px] font-bold text-cream">{counts[key]}</div>
            <div className="text-[11px] text-dim">{cfg.label}</div>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : Object.keys(byFloor).length === 0 ? (
        <div className="card p-12 text-center">
          <div className="font-serif text-[18px] text-cream">All rooms are clean!</div>
          <p className="text-[13px] text-muted mt-2">No tasks match the current filter.</p>
        </div>
      ) : (
        Object.entries(byFloor).sort((a, b) => Number(b[0]) - Number(a[0])).map(([floor, floorTasks]) => (
          <div key={floor} className="mb-6">
            <h3 className="text-[12px] tracking-[2px] uppercase text-gold-500 font-bold mb-3">
              {Number(floor) > 0 ? 'Floor ' + floor : 'Ground / Villas'}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {floorTasks.map((task) => {
                const cfg = STATUS_CONFIG[task.status] || STATUS_CONFIG.dirty;
                const pri = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.normal;
                return (
                  <div key={task.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[14px] font-bold text-gold-400">{task.room_number || '--'}</span>
                          <span className="text-[13px] text-cream">{task.room_name}</span>
                        </div>
                        <div className="text-[11px] text-dim">{task.room_type}</div>
                      </div>
                      <span className={'text-[10px] tracking-wide uppercase px-2 py-0.5 rounded-full border ' + cfg.color}>{cfg.label}</span>
                    </div>
                    {task.assigned_to && (
                      <div className="text-[11px] text-dim mb-2">Assigned: <span className="text-cream">{task.assigned_to}</span></div>
                    )}
                    {task.priority !== 'normal' && (
                      <div className={'text-[11px] font-bold mb-2 ' + pri.color}>{pri.label} priority</div>
                    )}
                    <div className="flex gap-1.5 mt-3 pt-3 border-t border-white/5">
                      {task.status === 'dirty' && (
                        <button className="btn btn-gold btn-xs" onClick={() => updateStatus(task, 'in_progress')}>
                          {Icon({ name: 'bell', size: 12 })} Start cleaning
                        </button>
                      )}
                      {task.status === 'in_progress' && (
                        <button className="btn btn-gold btn-xs" onClick={() => updateStatus(task, 'clean')}>
                          {Icon({ name: 'check', size: 12 })} Mark clean
                        </button>
                      )}
                      {task.status === 'clean' && (
                        <button className="btn btn-gold btn-xs" onClick={() => updateStatus(task, 'inspected')}>
                          {Icon({ name: 'shield', size: 12 })} Inspect
                        </button>
                      )}
                      {task.status !== 'dirty' && (
                        <button className="btn btn-ghost btn-xs" onClick={() => updateStatus(task, 'dirty')}>
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
