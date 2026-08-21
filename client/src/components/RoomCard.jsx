import { Link } from 'react-router-dom';
import { I } from './Icons.jsx';
import { money } from '../api.jsx';
import { roomPhoto } from '../lib/photos.jsx';
import { prefetchRoomDetail } from '../lib/routes.jsx';
import ResponsiveImage from './ResponsiveImage.jsx';

/**
 * RoomCard — one room in a grid. `eager` is for the FIRST card in a grid:
 * it skips lazy-loading (no fetchpriority boost, so the page hero stays the
 * real priority resource).
 */
export default function RoomCard({ room, unavailable, onBook, eager = false }) {
  const photo = roomPhoto(room);
  return (
    <article className="card card-enhanced overflow-hidden group h-full">
      <button
        className="relative block w-full cursor-pointer text-left"
        onClick={() => onBook(room)}
        aria-label={`Book ${room.name}`}
      >
        {/* Real photography — zooms out as the card scrolls into view (.room-art) */}
        <ResponsiveImage
          src={photo}
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          alt={room.name}
          eager={eager}
          pictureClassName="block"
          imgClassName="w-full aspect-[10/7] object-cover room-art"
        />
        {/* Shimmer sweep on hover */}
        <div className="room-shimmer" />
        <span className="absolute top-3 left-3 text-[10px] tracking-[2px] uppercase font-bold text-gold-300 bg-navy-950/75 border border-gold-500/40 rounded-md px-2.5 py-1 backdrop-blur-sm">
          {room.type}
        </span>
        {unavailable ? (
          <span className="absolute top-3 right-3 text-[10px] tracking-[1.5px] uppercase font-bold text-red-soft bg-navy-950/80 border border-red-500/40 rounded-md px-2.5 py-1 backdrop-blur-sm">
            Sold out
          </span>
        ) : (
          <div className="room-price-badge">
            <span className="font-serif text-[17px] text-gold-300 font-bold">{money(room.price)}</span>
            <span className="text-[10px] text-dim">/nt</span>
          </div>
        )}
      </button>
      <div className="p-5">
        <h3 className="font-serif text-[19px] text-cream">
          <Link to={`/rooms/${encodeURIComponent(room.name)}`} className="hover:text-gold-400 transition-colors">{room.name}</Link>
        </h3>
        <p className="text-[13px] text-muted leading-relaxed mt-1.5 line-clamp-2">{room.description}</p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-4 text-[12.5px] text-dim">
          {room.room_number && (
            <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.room({ width: 13, height: 13 })}</span> Room {room.room_number}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.users({ width: 13, height: 13 })}</span> Up to {room.capacity} guests</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.size({ width: 13, height: 13 })}</span> {room.size_sqm} m²</span>
          <span className="inline-flex items-center gap-1.5"><span className="text-gold-500">{I.check({ width: 13, height: 13 })}</span> Free cancellation</span>
        </div>
        <div className="flex items-center justify-end mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center gap-2">
            <Link to={`/rooms/${encodeURIComponent(room.name)}`} onMouseEnter={prefetchRoomDetail} onFocus={prefetchRoomDetail} className="btn btn-ghost btn-sm">Details</Link>
            <button className="btn btn-gold btn-sm" onClick={() => onBook(room)} disabled={unavailable}>
              {unavailable ? 'Sold out' : 'Book now'}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
