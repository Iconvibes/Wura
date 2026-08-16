import { useEffect, useRef, useState } from 'react';
import { api, money } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';
import PhotoPicker from './PhotoPicker.jsx';

const EMPTY = { name: '', room_number: '', type: 'Standard', status: 'active', price: 199, capacity: 2, size_sqm: 32, amenities: 'King bed, Free Wi-Fi', description: '', photos: [] };

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null); // room object or null (new)
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

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
      name: r.name, room_number: r.room_number || '', type: r.type, status: r.status, price: r.price,
      capacity: r.capacity, size_sqm: r.size_sqm, amenities: r.amenities.join(', '), description: r.description,
      photos: r.photos || [],
    });
    setModal(true);
  };

  const togglePhoto = (src) => {
    setForm((f) => ({
      ...f,
      photos: f.photos.includes(src)
        ? f.photos.filter((p) => p !== src)
        : f.photos.length >= 2 ? f.photos : [...f.photos, src],
    }));
  };

  const removePhoto = (i) => setForm((f) => ({ ...f, photos: f.photos.filter((_, idx) => idx !== i) }));

  const uploadRef = useRef(null);
  const onUpload = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return toast('Image must be under 8 MB.', false);
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const { url } = await api('/api/admin/upload', { method: 'POST', body: JSON.stringify({ image: reader.result }) });
        setForm((f) => ({ ...f, photos: f.photos.length >= 2 ? f.photos : [...f.photos, url] }));
        toast('Photo uploaded');
      } catch (err) {
        toast(err.message, false);
      }
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    const payload = {
      name: form.name.trim(),
      room_number: form.room_number.trim(),
      type: form.type,
      status: form.status,
      price: Number(form.price),
      capacity: Number(form.capacity),
      size_sqm: Number(form.size_sqm),
      amenities: form.amenities.split(',').map((s) => s.trim()).filter(Boolean),
      description: form.description.trim(),
      photos: form.photos,
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
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Rooms table (scroll horizontally with Shift + mouse wheel or arrow keys)">
            <table className="data-table">
              <thead>
                <tr><th>№</th><th>Room</th><th>Type</th><th>Capacity</th><th>Size</th><th>Rate</th><th>Status</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {rooms.map((r) => (
                  <tr key={r.id}>
                    <td className="font-mono text-gold-400">{r.room_number || '—'}</td>
                    <td>
                      <div className="flex items-center gap-3">
                        <img src={r.photos?.[0] || r.art} alt="" className="w-[54px] h-[38px] object-cover rounded-lg" />
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

      {/* photo browser — above the room modal (z-120 > z-100) */}
      {pickerOpen && (
        <PhotoPicker selected={form.photos} onToggle={togglePhoto} onClose={() => setPickerOpen(false)} />
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
                  <label>Room number <span className="opacity-50 normal-case">(blank = auto)</span></label>
                  <input value={form.room_number} onChange={(e) => setForm({ ...form, room_number: e.target.value })} placeholder="e.g. 1204 or V4" className="font-mono" />
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
                <div className="form-field sm:col-span-2">
                  <label>Photos <span className="opacity-50 normal-case">(up to 2 — pick from our rooms or upload your own; the first is the card image)</span></label>
                  <div className="flex flex-wrap gap-3">
                    {[0, 1].map((i) => (
                      <div key={i} className={`relative w-44 h-24 rounded-lg border overflow-hidden ${form.photos[i] ? 'border-gold-500' : 'border-dashed border-slate-500'}`}>
                        {form.photos[i] ? (
                          <>
                            <img src={form.photos[i]} alt="" className="w-full h-full object-cover" />
                            <span className="absolute top-1 left-1 text-[9px] px-1.5 py-0.5 rounded bg-black/60 text-gold-300 font-bold">{i === 0 ? 'CARD IMAGE' : 'GALLERY'}</span>
                            <button type="button" className="absolute top-1 right-1 w-5 h-5 grid place-items-center rounded-full bg-black/70 text-cream text-[12px] leading-none" onClick={() => removePhoto(i)} aria-label="Remove photo">×</button>
                          </>
                        ) : (
                          <span className="w-full h-full grid place-items-center text-[11px] text-dim">{i === 0 ? 'Card image' : 'Gallery photo'}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button type="button" className="btn btn-gold btn-sm" onClick={() => setPickerOpen(true)}>{Icon({ name: 'search', size: 13 })} Browse all 100 photos</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => uploadRef.current && uploadRef.current.click()}>{Icon({ name: 'edit', size: 13 })} Upload your own</button>
                    <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onUpload} />
                  </div>
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
