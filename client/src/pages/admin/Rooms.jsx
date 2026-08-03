import { useEffect, useState } from 'react';
import { api, money } from '../../api.js';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const EMPTY = { name: '', type: 'Standard', status: 'active', price: 199, capacity: 2, size_sqm: 32, amenities: 'King bed, Free Wi-Fi', description: '' };

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null); // room object or null (new)
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { rooms } = await api('/api/admin/rooms');
      setRooms(rooms);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setModal(false); };
    if (modal) { document.body.style.overflow = 'hidden'; window.addEventListener('keydown', onKey); }
    else { document.body.style.overflow = ''; }
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [modal]);

  const openNew = () => { setEditing(null); setForm(EMPTY); setModal(true); };
  const openEdit = (r) => {
    setEditing(r);
    setForm({
      name: r.name, type: r.type, status: r.status, price: r.price, capacity: r.capacity,
      size_sqm: r.size_sqm, amenities: r.amenities.join(', '), description: r.description,
    });
    setModal(true);
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      price: Number(form.price),
      capacity: Number(form.capacity),
      size_sqm: Number(form.size_sqm),
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      description: form.description.trim(),
    };
    if (!payload.name || !payload.description || !(payload.price > 0) || !(payload.capacity > 0)) {
      return toast('Name, description, price and capacity are required.', false);
    }
    setSaving(true);
    try {
      if (editing) {
        await api(`/api/admin/rooms/${editing.id}`, { method: 'PATCH', body: JSON.stringify(payload) });
        toast('Room updated');
      } else {
        await api('/api/admin/rooms', { method: 'POST', body: JSON.stringify(payload) });
        toast('Room added');
      }
      setModal(false);
      load();
    } catch (e) {
      toast(e.message, false);
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (r) => {
    const next = r.status === 'active' ? 'maintenance' : 'active';
    try {
      await api(`/api/admin/rooms/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      toast(`Room set to ${next}`);
      load();
    } catch (e) {
      toast(e.message, false);
    }
  };

  const remove = async (r) => {
    if (!window.confirm(`Delete “${r.name}”? This cannot be undone.`)) return;
    try {
      await api(`/api/admin/rooms/${r.id}`, { method: 'DELETE' });
      toast('Room deleted');
      load();
    } catch (e) {
      toast(e.message, false);
    }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Rooms &amp; Rates</h1>
          <p className="text-[13px] text-muted mt-0.5">Manage inventory, rates and maintenance status.</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
          <button className="btn btn-gold btn-sm" onClick={openNew}>{Icon({ name: 'edit', size: 14 })} Add room</button>
        </div>
      </div>

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr><th>Room</th><th>Type</th><th>Capacity</th><th>Size</th><th>Rate</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={r.art} alt="" className="w-[54px] h-[38px] object-cover rounded-lg" />
                        <span className="font-bold text-cream">{r.name}</span>
                      </div>
                    </td>
                    <td>{r.type}</td>
                    <td>{r.capacity} guests</td>
                    <td>{r.size_sqm} m²</td>
                    <td className="font-bold">{money(r.price)}<span className="text-dim text-[12px] font-normal"> / night</span></td>
                    <td>
                      <span className={`pill ${r.status === 'active' ? 'checked_in' : 'cancelled'}`}>{r.status}</span>
                    </td>
                    <td>
                      <div className="flex">
                        <button className="icon-btn" title="Edit room" onClick={() => openEdit(r)}>{Icon({ name: 'edit', size: 15 })}</button>
                        <button className="icon-btn" title={r.status === 'active' ? 'Set to maintenance' : 'Set active'} onClick={() => toggleStatus(r)}>{Icon({ name: 'toggle', size: 15 })}</button>
                        <button className="icon-btn danger" title="Delete room" onClick={() => remove(r)}>{Icon({ name: 'trash', size: 15 })}</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* room modal */}
      {modal && (
        <div className="modal-backdrop open" onClick={() => setModal(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <span className="font-serif text-[19px] text-cream">{editing ? 'Edit room' : 'Add a room'}</span>
              <button className="modal-close" onClick={() => setModal(false)} aria-label="Close">{Icon({ name: 'close', size: 16 })}</button>
            </div>
            <div className="p-6">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="form-field">
                  <label>Room name</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Skyline Suite" />
                </div>
                <div className="form-field">
                  <label>Type</label>
                  <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {['Standard', 'Deluxe', 'Suite', 'Penthouse'].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label>Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option value="active">Active</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
                <div className="form-field">
                  <label>Price / night (USD)</label>
                  <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Capacity (guests)</label>
                  <input type="number" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div className="form-field">
                  <label>Size (m²)</label>
                  <input type="number" value={form.size_sqm} onChange={(e) => setForm({ ...form, size_sqm: e.target.value })} />
                </div>
                <div className="form-field sm:col-span-2">
                  <label>Amenities <span className="opacity-50 normal-case">(comma separated)</span></label>
                  <input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} />
                </div>
                <div className="form-field sm:col-span-2">
                  <label>Description</label>
                  <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="A short, evocative description…" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex justify-end gap-3">
              <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
              <button className="btn btn-gold" disabled={saving} onClick={save}>{saving ? 'Saving…' : 'Save room'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
