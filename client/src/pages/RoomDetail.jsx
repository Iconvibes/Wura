import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Reveal from '../components/Reveal.jsx';
import BookingModal from '../components/BookingModal.jsx';
import { I, Icon } from '../components/Icons.jsx';
import { api, money, addDays, todayISO } from '../api.js';
import { toast } from '../components/Toast.jsx';
import { roomPhotos } from '../lib/photos.js';
import { usePageMeta } from '../hooks/usePageMeta.js';
import { useJsonLd } from '../hooks/useJsonLd.js';
import { roomOfferLD } from '../lib/seo.js';

export default function RoomDetail() {
  const { id } = useParams();
  const [room, setRoom] = useState(null);
  const [error, setError] = useState('');
  usePageMeta(room ? `${room.name} — Wura Grand Hotel` : 'Room — Wura Grand Hotel', room ? `${room.name}: ${room.description}` : 'A signature room at Wura Grand Hotel.');
  // Per-room structured data: HotelRoom + Offer (removed when leaving the room).
  useJsonLd('seo-room-offer', room ? roomOfferLD(room) : null);
  const [active, setActive] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [dates, setDates] = useState(() => {
    const ci = todayISO();
    return { checkIn: ci, checkOut: addDays(ci, 2) };
  });
  const [guests, setGuests] = useState(2);

  useEffect(() => {
    let alive = true;
    setRoom(null);
    setError('');
    setActive(0);
    api(`/api/rooms/${id}`)
      .then((data) => { if (alive) setRoom(data.room); })
      .catch((e) => { if (alive) setError(e.message); });
    return () => { alive = false; };
  }, [id]);

  if (error) {
    return (
      <div>
        <Navbar />
        <div className="login-wrap">
          <div className="text-center max-w-md fade-up">
            <div className="font-serif text-[96px] leading-none text-gold-400">404</div>
            <p className="text-muted mt-3">That room has been taken off the market.</p>
            <Link to="/rooms" className="btn btn-gold mt-7 inline-flex">Back to all rooms</Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!room) {
    return (
      <div>
        <Navbar />
        <div className="py-40"><div className="spinner" /></div>
      </div>
    );
  }

  return (
    <div>
      <Navbar />

      {/* breadcrumb */}
      <div className="max-w-6xl mx-auto px-5 pt-24">
        <Reveal variant="up">
          <div className="text-[12.5px] text-dim flex items-center gap-2 flex-wrap">
            <Link to="/" className="hover:text-gold-400 transition-colors">Home</Link>
            <span>·</span>
            <Link to="/rooms" className="hover:text-gold-400 transition-colors">Rooms &amp; Suites</Link>
            <span>·</span>
            <span className="text-muted">{room.name}</span>
          </div>
        </Reveal>
      </div>

      <section className="max-w-6xl mx-auto px-5 pt-8 pb-16">
        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-8 items-start">
          {/* crossfade gallery — the signature motion of this page */}
          <div>
            <Reveal variant="zoom">
              <div className="xfade-stage">
                {roomPhotos(room).map((src, i) => (
                  <div key={src} className={`xfade-img ${i === active ? 'active' : ''}`}>
                    <img src={src} alt={`${room.name} — view ${i + 1}`} />
                  </div>
                ))}
              </div>
              <div className="xfade-thumbs">
                {roomPhotos(room).map((src, i) => (
                  <button key={src} className={`xfade-thumb ${i === active ? 'active' : ''}`} onClick={() => setActive(i)} aria-label={`View ${i + 1}`}>
                    <img src={src} alt="" />
                  </button>
                ))}
              </div>
            </Reveal>

            <Reveal variant="left" delay={1} className="mt-8">
              <h2 className="font-serif text-[22px] text-cream">About this room</h2>
              <p className="text-[14.5px] leading-relaxed text-muted mt-3">{room.description}</p>
              <p className="text-[14.5px] leading-relaxed text-muted mt-3">
                Every stay includes our signature touches: nightly turndown, in-room espresso,
                access to the Skyline Terrace Pool and the morning paper delivered to your door.
                Our front desk arranges anything else — from a late checkout to a private driver.
              </p>
            </Reveal>

            {room.amenities?.length > 0 && (
              <Reveal variant="left" delay={2} className="mt-7">
                <h3 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold">Included amenities</h3>
                <div className="flex flex-wrap gap-2 mt-3">
                  {room.amenities.map((a) => (
                    <span key={a} className="chip">{a}</span>
                  ))}
                </div>
              </Reveal>
            )}
          </div>

          {/* sticky booking column */}
          <div className="lg:sticky lg:top-24 space-y-4">
            <Reveal variant="right" delay={1}>
              <div className="card p-7">
                <span className="text-[10px] tracking-[2.5px] uppercase text-gold-500 font-bold">{room.type}</span>
                <h1 className="font-serif text-[30px] text-cream mt-1.5">{room.name}</h1>
                <div className="flex items-baseline gap-2 mt-4">
                  <span className="font-serif text-[34px] text-gold-400">{money(room.price)}</span>
                  <span className="text-[13px] text-dim">/ night</span>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-6">
                  <div className="rounded-xl border border-white/10 bg-navy-900/60 p-3.5 text-center">
                    <div className="text-gold-400 inline-flex">{Icon({ name: 'users', size: 18 })}</div>
                    <div className="font-serif text-[18px] text-cream mt-1.5">{room.capacity}</div>
                    <div className="text-[10.5px] tracking-[1.5px] uppercase text-dim">Guests</div>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-navy-900/60 p-3.5 text-center">
                    <div className="text-gold-400 inline-flex">{Icon({ name: 'size', size: 18 })}</div>
                    <div className="font-serif text-[18px] text-cream mt-1.5">{room.size_sqm} m²</div>
                    <div className="text-[10.5px] tracking-[1.5px] uppercase text-dim">Size</div>
                  </div>
                </div>

                <button className="btn btn-gold btn-block mt-6" onClick={() => setModalOpen(true)}>
                  {I.calendar({ width: 16, height: 16 })} Reserve this room
                </button>
                <p className="text-[11.5px] text-dim mt-4 flex items-start gap-1.5">
                  <span className="text-gold-500 mt-0.5">{I.check({ width: 13, height: 13 })}</span>
                  Free cancellation up to 48 hours before arrival. No charge until you confirm.
                </p>
              </div>
            </Reveal>

            <Reveal variant="right" delay={2}>
              <div className="card p-6">
                <h3 className="font-serif text-[17px] text-cream">Need a hand?</h3>
                <p className="text-[13px] text-muted mt-2 leading-relaxed">
                  Call the front desk — we'll match you to the right room and hold it for you.
                </p>
                <div className="text-[14px] text-gold-400 font-semibold mt-3 flex items-center gap-2">
                  {I.phone({ width: 15, height: 15 })} +1 (555) 012-1962
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />
      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRoom={room}
        dates={dates}
        setDates={setDates}
        guests={guests}
        setGuests={setGuests}
      />
    </div>
  );
}
