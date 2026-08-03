import { I } from './Icons.jsx';
import { money } from '../api.js';

export default function RoomCard({ room, unavailable, onBook }) {
  return (
    <article className={`card overflow-hidden group fade-up ${unavailable ? 'opacity-55' : ''}`}>
      <button
        className="relative block w-full cursor-pointer text-left"
        onClick={() => onBook(room)}
        aria-label={`Book ${room.name}`}
      >
        <img src={room.art} alt={room.name} loading="lazy" className="w-full aspect-[10/7] object-cover transition-transform duration-700 group-hover:scale-105" />
        <span className="absolute top-3 left-3 text-[10px] tracking-[2px] uppercase font-bold text-gold-300 bg-navy-950/75 border border-gold-500/40 rounded-md px-2.5 py-1">
          {room.type}
        </span>
        {unavailable && (
          <span className="absolute top-3 right-3 text-[10px] tracking-[1.5px] uppercase font-bold text-red-soft bg-navy-950/80 border border-red-500/40 rounded-md px-2.5 py-1">
            Sold out
          </span>
        )}
      </button>
      <div className="p-5">
        <h3 className="font-serif text-[19px] text-cream">{room.name}</h3>
        <p className="text-[13px] text-muted leading-relaxed mt-1.5 line-clamp-2">{room.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[12.5px] text-dim">
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.users({ width: 13, height: 13 })}</span> Up to {room.capacity} guests</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.size({ width: 13, height: 13 })}</span> {room.size_sqm} m²</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.check({ width: 13, height: 13 })}</span> Free cancellation</span>
        </div>
        <div className="flex items-center justify-between mt-5 pt-4 border-t border-white/5">
          <div>
            <span className="font-serif text-[22px] text-gold-400">{money(room.price)}</span>{' '}
            <span className="text-[12px] text-dim">/ night</span>
          </div>
          <button className="btn btn-gold btn-sm" onClick={() => onBook(room)} disabled={unavailable}>
            {unavailable ? 'Sold out' : 'Book now'}
          </button>
        </div>
      </div>
    </article>
  );
}
