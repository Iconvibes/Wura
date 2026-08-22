import { useCallback, useEffect, useState } from 'react';
import { api, money } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';

const CATEGORIES = [
  { value: 'dining', label: 'Dining' },
  { value: 'transport', label: 'Transport' },
  { value: 'comfort', label: 'Comfort' },
  { value: 'experience', label: 'Experience' },
  { value: 'general', label: 'General' },
];

const ICONS = ['plate', 'car', 'bed', 'star', 'bell', 'spa', 'yoga', 'pool'];

const EMPTY_PRODUCT = {
  name: '', description: '', price: 0, price_unit: 'per night',
  category: 'dining', icon: 'plate', enabled: true, sort_order: 0,
  multiply_by_nights: false, multiply_by_guests: false,
};

function ProductForm({ product, onSave, onCancel }) {
  const [form, setForm] = useState(product || { ...EMPTY_PRODUCT });
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form.name.trim()) return toast('Product name is required.', false);
    if (Number(form.price) < 0) return toast('Price must be non-negative.', false);
    setSaving(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      if (product?.id) {
        await api('/api/admin/upsells/' + product.id, { method: 'PATCH', body: JSON.stringify(payload) });
        toast('Product updated');
      } else {
        await api('/api/admin/upsells', { method: 'POST', body: JSON.stringify(payload) });
        toast('Product created');
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
      <h3 className="font-serif text-[18px] text-cream mb-5">{product?.id ? 'Edit Product' : 'New Upsell Product'}</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="form-field sm:col-span-2">
          <label>Product name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Daily Breakfast, Airport Transfer" />
        </div>
        <div className="form-field sm:col-span-2">
          <label>Description</label>
          <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Continental or full English, served 7-10am" />
        </div>
        <div className="form-field">
          <label>Price (₦)</label>
          <input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} />
        </div>
        <div className="form-field">
          <label>Price unit</label>
          <select value={form.price_unit} onChange={(e) => setForm({ ...form, price_unit: e.target.value })}>
            <option value="per night">Per night</option>
            <option value="per person">Per person</option>
            <option value="flat fee">Flat fee</option>
            <option value="per trip">Per trip</option>
          </select>
        </div>
        <div className="form-field">
          <label>Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="form-field">
          <label>Icon</label>
          <div className="flex gap-1.5 mt-1">
            {ICONS.map((icon) => (
              <button key={icon} type="button"
                className={'w-9 h-9 rounded-lg grid place-items-center border transition-colors ' + (form.icon === icon ? 'bg-gold-500/20 border-gold-500/50 text-gold-300' : 'bg-white/5 border-white/10 text-dim')}
                onClick={() => setForm({ ...form, icon })}>
                {Icon({ name: icon, size: 16 })}
              </button>
            ))}
          </div>
        </div>
        <div className="form-field">
          <label>Multiply by nights</label>
          <select value={form.multiply_by_nights ? '1' : '0'} onChange={(e) => setForm({ ...form, multiply_by_nights: e.target.value === '1' })}>
            <option value="0">No (flat price)</option>
            <option value="1">Yes (price x nights)</option>
          </select>
        </div>
        <div className="form-field">
          <label>Multiply by guests</label>
          <select value={form.multiply_by_guests ? '1' : '0'} onChange={(e) => setForm({ ...form, multiply_by_guests: e.target.value === '1' })}>
            <option value="0">No (flat price)</option>
            <option value="1">Yes (price x guests)</option>
          </select>
        </div>
        <div className="form-field">
          <label>Enabled</label>
          <select value={form.enabled ? '1' : '0'} onChange={(e) => setForm({ ...form, enabled: e.target.value === '1' })}>
            <option value="1">Yes</option>
            <option value="0">No (disabled)</option>
          </select>
        </div>
        <div className="form-field">
          <label>Sort order</label>
          <input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
        </div>
      </div>
      <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-white/5">
        <button className="btn btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="btn btn-gold" disabled={saving} onClick={submit}>
          {saving ? 'Saving...' : product?.id ? 'Update product' : 'Create product'}
        </button>
      </div>
    </div>
  );
}

export default function Upsells() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { products } = await api('/api/admin/upsells');
      setProducts(products);
    } catch (e) {
      toast(e.message, false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggle = async (product) => {
    try {
      await api('/api/admin/upsells/' + product.id, {
        method: 'PATCH', body: JSON.stringify({ enabled: !product.enabled }),
      });
      toast('Product ' + (product.enabled ? 'disabled' : 'enabled'));
      load();
    } catch (e) { toast(e.message, false); }
  };

  const remove = async (product) => {
    if (!window.confirm('Delete "' + product.name + '"? This cannot be undone.')) return;
    try {
      await api('/api/admin/upsells/' + product.id, { method: 'DELETE' });
      toast('Product deleted');
      load();
    } catch (e) { toast(e.message, false); }
  };

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-7">
        <div>
          <h1 className="font-serif text-[26px] text-cream">Upsell Products</h1>
          <p className="text-[13px] text-muted mt-0.5">Add-on services guests can purchase during booking (breakfast, transfers, late checkout).</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={load}>{Icon({ name: 'refresh', size: 15 })} Refresh</button>
          <button className="btn btn-gold btn-sm" onClick={() => { setEditing(null); setShowForm(true); }}>
            {Icon({ name: 'edit', size: 14 })} Add product
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mb-6">
          <ProductForm product={editing} onSave={() => { setShowForm(false); load(); }} onCancel={() => setShowForm(false)} />
        </div>
      )}

      {loading ? (
        <div className="py-24"><div className="spinner" /></div>
      ) : products.length === 0 ? (
        <div className="card p-12 text-center">
                        <div className="text-gold-400 mb-3">{Icon({ name: "star", size: 32 })}</div>
              <h2 className="font-serif text-[20px] text-cream">No upsell products yet</h2>
              <p className="text-[13.5px] text-muted mt-2">Add products that guests can purchase as extras during booking.</p>
              <button className="btn btn-gold mt-5" onClick={() => { setEditing(null); setShowForm(true); }}>Add your first product</button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => (
                <div key={p.id} className="card p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl grid place-items-center text-gold-400 bg-navy-900 border border-gold-500/25 shrink-0">
                    {Icon({ name: p.icon || "star", size: 18 })}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-cream text-[14px] truncate">{p.name}</span>
                      <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-full bg-white/5 text-dim">
                        {CATEGORIES.find((c) => c.value === p.category)?.label || p.category}
                      </span>
                      <span className="font-serif text-gold-400 text-[14px]">{money(p.price)}</span>
                      <span className="text-[11px] text-dim">{p.price_unit}</span>
                      {!p.enabled && <span className="text-[10px] tracking-[1.5px] uppercase px-2 py-0.5 rounded-full bg-red-500/15 text-red-400">disabled</span>}
                    </div>
                    {p.description && <p className="text-[12.5px] text-dim mt-1 truncate">{p.description}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button className="btn btn-ghost btn-xs" onClick={() => toggle(p)}>
                      {p.enabled ? "Disable" : "Enable"}
                    </button>
                    <button className="btn btn-ghost btn-xs" onClick={() => { setEditing(p); setShowForm(true); }}>Edit</button>
                    <button className="btn btn-ghost btn-xs !text-red-400/90 hover:!bg-red-500/10" onClick={() => remove(p)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
      </div>
    );
  }