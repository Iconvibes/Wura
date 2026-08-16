import { useState } from 'react';
import { ROOM_PHOTOS_BY_NAME } from '../../lib/photos.jsx';
import ResponsiveImage from '../../components/ResponsiveImage.jsx';
import { Icon } from '../../components/Icons.jsx';

// Every photo in the shared 100-photo pool, labelled with the room that owns it.
const POOL = Object.entries(ROOM_PHOTOS_BY_NAME).flatMap(([name, arr]) => arr.map((src) => ({ src, name })));

const TIERS = ['All', 'Classic', 'Deluxe', 'Suite', 'Penthouse', 'Villa'];

function tierOf(name) {
  const n = String(name).toLowerCase();
  if (n.includes('villa')) return 'Villa';
  if (n.includes('penthouse')) return 'Penthouse';
  if (n.includes('suite')) return 'Suite';
  if (n.includes('deluxe')) return 'Deluxe';
  if (n.includes('studio')) return 'Deluxe';
  return 'Classic';
}

/**
 * Full-screen photo browser for the room modal: large tiles (so you can
 * actually see what you're picking), room-name labels, search + tier filter,
 * and live selection up to 2. Rendered above the form modal (z-120 > z-100).
 */
export default function PhotoPicker({ selected = [], onToggle, onClose }) {
  const [q, setQ] = useState('');
  const [tier, setTier] = useState('All');

  const list = POOL.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) && (tier === 'All' || tierOf(p.name) === tier)
  );
  const full = selected.length >= 2;

  return (
    <div className="fixed inset-0 z-[120] bg-black/75 backdrop-blur-sm grid place-items-center p-3 sm:p-6" onClick={onClose}>
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-navy-900 border border-slate-700/50 shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* header */}
        <div className="px-5 py-4 border-b border-slate-700/40 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h2 className="font-serif text-[19px] text-cream leading-tight">Choose photos</h2>
            <p className="text-[12px] text-muted mt-0.5">
              {selected.length} of 2 selected · the first is the card image
            </p>
          </div>
          <div className="flex gap-2">
            {TIERS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`px-3 py-1.5 rounded-full text-[11.5px] tracking-wide border transition-colors ${
                  tier === t ? 'bg-gold-500 text-navy-950 border-gold-500 font-bold' : 'text-dim border-slate-600 hover:text-cream hover:border-gold-500/60'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a room…"
            className="w-44 px-3 py-2 rounded-lg bg-navy-800 border border-slate-600/60 text-cream text-[13px] outline-none focus:border-gold-500 placeholder:text-dim"
          />
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close photo picker">{Icon({ name: 'close', size: 16 })}</button>
        </div>

        {/* grid — explicit auto-rows so tiles can never collapse to a sliver
            (absolute-fill imgs never influence row sizing) */}
        <div className="flex-1 overflow-y-auto p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 auto-rows-[150px] sm:auto-rows-[170px] gap-3">
          {list.map(({ src, name }) => {
            const sel = selected.includes(src);
            const disabled = !sel && full;
            return (
              <button
                key={src}
                type="button"
                title={disabled ? 'Remove a photo first (max 2)' : `${name} — ${sel ? 'remove' : 'select'}`}
                onClick={() => !disabled && onToggle(src)}
                className={`relative h-full rounded-xl overflow-hidden text-left group transition ${
                  sel
                    ? 'ring-2 ring-gold-500'
                    : disabled
                      ? 'opacity-35 cursor-not-allowed'
                      : 'ring-1 ring-slate-700 hover:ring-gold-400/70'
                }`}
              >
                <ResponsiveImage src={src} sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw" alt={name} loading="lazy" imgClassName="absolute inset-0 w-full h-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 px-2.5 py-1.5 text-[11.5px] text-cream bg-gradient-to-t from-black/85 via-black/45 to-transparent">
                  {name}
                </span>
                {sel && (
                  <span className="absolute top-2 right-2 w-6 h-6 grid place-items-center rounded-full bg-gold-500 text-navy-950 shadow">
                    {Icon({ name: 'check', size: 14 })}
                  </span>
                )}
              </button>
            );
          })}
          {list.length === 0 && (
            <p className="col-span-full py-16 text-center text-dim text-[14px]">No photos match “{q}”.</p>
          )}
        </div>

        {/* footer */}
        <div className="px-5 py-3.5 border-t border-slate-700/40 flex justify-end gap-3">
          <button type="button" className="btn btn-gold btn-sm" onClick={onClose}>
            Done · {selected.length}/2
          </button>
        </div>
      </div>
    </div>
  );
}
