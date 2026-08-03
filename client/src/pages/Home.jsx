import { useCallback, useEffect, useRef, useState } from 'react';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import Reveal from '../components/Reveal.jsx';
import BookingWidget from '../components/BookingWidget.jsx';
import RoomCard from '../components/RoomCard.jsx';
import BookingModal from '../components/BookingModal.jsx';
import FindBookingModal from '../components/FindBookingModal.jsx';
import { I, Icon } from '../components/Icons.jsx';
import { api, money, fmtDate, addDays, todayISO } from '../api.js';
import { roomArtFor } from '../lib/roomArt.js';
import { toast } from '../components/Toast.jsx';

const AMENITIES = [
  ['pool', 'Skyline Terrace Pool', 'An infinity-edge pool on the 21st floor with panoramic views of the city lights.'],
  ['spa', 'Golden Spa & Hammam', 'Signature gold-infused therapies, sauna and a traditional hammam for two.'],
  ['flame', 'Leaf & Flame Restaurant', 'Farm-to-table dining with a wood-fired kitchen, led by executive chef Elif Karam.'],
  ['yoga', 'Sunrise Yoga Studio', 'Daily guided yoga at dawn on the terrace, followed by a cold-pressed juice bar.'],
  ['car', 'Private Chauffeur', 'Airport transfers and city tours in our classic fleet, on call around the clock.'],
  ['plate', 'Atelier Breakfast', 'A daily spread of local pastries, fresh seafood and made-to-order eggs until noon.'],
];

const GALLERY = [
  [0, 'The Golden Lobby'],
  [3, 'Terrace Pool at dusk'],
  [1, 'Leaf & Flame'],
  [2, 'Skyline Suite'],
  [4, 'Golden Spa'],
];

const STORIES = [
  ['AM', 'Amara Okafor', 'Lagos · Honeymoon stay', 'The check-in felt like a warm welcome home. We watched the sunset from our balcony and never wanted to leave. The Presidential suite is worth every penny.'],
  ['DM', 'Daniel Meyer', 'Berlin · Business trip', 'Impeccable service, quiet luxury and a breakfast spread that ruined all other hotels for me. The staff remembered my name by day two.'],
  ['HB', 'Hannah Berg', 'Oslo · Family getaway', 'We brought our two children and the family suite was genius — separate bedrooms, a kitchenette, and the pool had a shallow end just for them.'],
];

export default function Home() {
  const [dates, setDates] = useState(() => {
    const ci = todayISO();
    return { checkIn: ci, checkOut: addDays(ci, 2) };
  });
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoom, setModalRoom] = useState(null);
  const [findOpen, setFindOpen] = useState(false);
  const searchTimer = useRef(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('checkIn', dates.checkIn);
      params.set('checkOut', dates.checkOut);
      params.set('guests', guests);
      if (search) params.set('search', search);
      const [sortKey, dir] = sort.split('-');
      params.set('sort', sortKey);
      params.set('dir', dir);
      params.set('page', page);
      params.set('limit', 6);
      const data = await api(`/api/rooms?${params}`);
      setRooms(data.rooms);
      setPagination(data.pagination);
    } catch (e) {
      toast(e.message, false);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [dates.checkIn, dates.checkOut, guests, search, sort, page]);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const list = rooms.filter((r) => filter === 'all' || r.type === filter);
  const types = ['all', ...new Set(rooms.map((r) => r.type))];

  const openBooking = (room) => {
    setModalRoom(room);
    setModalOpen(true);
  };

  const heroArt = roomArtFor(3, 'Suite');

  return (
    <div id="top">
      <Navbar />

      {/* ================================ HERO ================================ */}
      <header className="relative min-h-[92vh] flex items-center overflow-hidden pt-24 pb-16">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_15%_-10%,rgba(212,175,55,0.13),transparent_60%),radial-gradient(700px_420px_at_95%_110%,rgba(212,175,55,0.09),transparent_60%)]" />
          <div className="absolute w-72 h-72 rounded-full border border-gold-500/10 -top-20 -left-20" />
          <div className="absolute w-96 h-96 rounded-full border border-gold-500/8 top-1/3 -right-24" />
          <div className="absolute w-56 h-56 rounded-full border border-gold-500/10 bottom-0 left-1/3" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 w-full grid lg:grid-cols-[1.15fr_0.85fr] gap-12 items-center">
          <div className="fade-up">
            <span className="eyebrow">Five-star hospitality · City of gold</span>
            <h1 className="font-serif text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.08] text-cream mt-5">
              Where every stay feels <em className="text-gold-400 not-italic font-serif" style={{ textShadow: '0 0 40px rgba(212,175,55,0.35)' }}>golden</em>.
            </h1>
            <p className="text-[15.5px] leading-relaxed text-muted mt-5 max-w-lg">
              Wura Grand rises above the skyline with 10 signature rooms and suites, crafted for travellers who expect more — from sunrise espresso on your balcony to a late-night soak under the stars.
            </p>
            <div className="flex flex-wrap gap-3 mt-7">
              <a href="#rooms" className="btn btn-gold">
                {I.calendar({ width: 16, height: 16 })} Book a stay
              </a>
              <a href="#experience" className="btn btn-ghost">Explore the hotel</a>
            </div>

            <BookingWidget dates={dates} setDates={setDates} guests={guests} setGuests={setGuests}
              onSubmit={() => {
                if (!dates.checkIn || !dates.checkOut) return toast('Please choose your dates.');
                if (dates.checkOut <= dates.checkIn) return toast('Check-out must be after check-in.');
                setPage(1);
                loadRooms();
                document.getElementById('rooms')?.scrollIntoView({ behavior: 'smooth' });
                toast(`Checking availability…`);
              }} />
          </div>

          <div className="hidden lg:block relative">
            <div className="card overflow-hidden rotate-1 hover:rotate-0 transition-transform duration-700">
              <img src={heroArt} alt="The Skyline Suite at dusk" className="w-full aspect-[4/3] object-cover" />
            </div>
            <div className="absolute -left-6 top-8 card px-5 py-3.5 flex items-center gap-3 fade-up" style={{ animationDelay: '0.2s' }}>
              <span className="font-serif text-[26px] text-gold-400">4.9<small className="text-[13px] text-muted">/5</small></span>
              <span className="text-[10px] tracking-[1.5px] uppercase text-muted leading-tight">2,400+ guest<br />reviews</span>
            </div>
            <div className="absolute -right-4 bottom-10 card px-5 py-3.5 flex items-center gap-3 fade-up" style={{ animationDelay: '0.4s' }}>
              <span className="font-serif text-[26px] text-gold-400">#1</span>
              <span className="text-[10px] tracking-[1.5px] uppercase text-muted leading-tight">Luxury hotel<br />· 2026</span>
            </div>
          </div>
        </div>
      </header>

      {/* ============================ TRUST STRIP ============================ */}
      <div className="border-y border-white/5 bg-navy-900/40">
        <div className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[['10', 'Rooms & suites'], ['120m', 'Penthouse terrace'], ['24/7', 'Concierge service'], ['1962', 'Serving guests']].map(([v, l]) => (
            <div key={l}>
              <div className="font-serif text-[30px] text-gold-400">{v}</div>
              <div className="text-[11px] tracking-[2px] uppercase text-dim mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ================================ ROOMS =============================== */}
      <section id="rooms" className="max-w-6xl mx-auto px-5 pt-20 pb-6 scroll-mt-20">
        <Reveal className="text-center">
          <span className="eyebrow">Rooms &amp; Suites</span>
          <h2 className="section-title">Choose your sanctuary</h2>
          <p className="section-sub mx-auto">Every room is a quiet composition of linen, light and skyline. Pick your dates to see live availability.</p>
        </Reveal>

        <Reveal className="mt-10">
          <div className="card p-4 flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500">{I.search({ width: 16, height: 16 })}</span>
                <input
                  type="text"
                  placeholder="Search rooms…"
                  className="pl-10 rounded-xl"
                  style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '12px 14px 12px 40px', fontSize: 14, outline: 'none', width: '100%' }}
                  onChange={(e) => {
                    clearTimeout(searchTimer.current);
                    const v = e.target.value.trim();
                    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
                  }}
                />
              </div>
              <select
                value={sort}
                onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="rounded-xl sm:w-44"
                style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '12px 14px', fontSize: 14, outline: 'none' }}
              >
                <option value="name-asc">Name ↑</option>
                <option value="name-desc">Name ↓</option>
                <option value="price-asc">Price ↑</option>
                <option value="price-desc">Price ↓</option>
                <option value="capacity-asc">Capacity ↑</option>
                <option value="capacity-desc">Capacity ↓</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="text-[13px] text-muted">
                <b className="text-cream">{pagination.total}</b> rooms &amp; suites
                <span className="text-dim"> · {fmtDate(dates.checkIn)} – {fmtDate(dates.checkOut)}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {types.map((t) => (
                  <button key={t} className={`chip ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                    {t === 'all' ? 'All rooms' : t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Reveal>

        {/* rooms grid */}
        {loading ? (
          <div className="py-20"><div className="spinner" /></div>
        ) : list.length === 0 ? (
          <div className="text-center py-16 card mt-6">
            <div className="font-serif text-[20px] text-cream">Nothing matches — yet.</div>
            <p className="text-[13.5px] text-muted mt-2">Try different dates, or more guests, or clear the search.</p>
            <button className="btn btn-ghost btn-sm mt-5" onClick={() => { setSearch(''); setFilter('all'); setDates({ checkIn: todayISO(), checkOut: addDays(todayISO(), 2) }); setPage(1); }}>
              Show all rooms
            </button>
          </div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-6">
              {list.map((r) => (
                <RoomCard key={r.id} room={r} onBook={openBooking} />
              ))}
            </div>
            {pagination.totalPages > 1 && (
              <div className="pagination">
                <button className="page-btn" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>{I.prev({ width: 16, height: 16 })}</button>
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter((p) => Math.abs(p - page) <= 2 || p === 1 || p === pagination.totalPages)
                  .map((p) => (
                    <button key={p} className={`page-btn ${page === p ? 'active' : ''}`} onClick={() => setPage(p)}>{p}</button>
                  ))}
                <button className="page-btn" disabled={page >= pagination.totalPages} onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}>{I.next({ width: 16, height: 16 })}</button>
              </div>
            )}
          </>
        )}
      </section>

      {/* ============================ EXPERIENCE ============================ */}
      <section id="experience" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal>
          <span className="eyebrow">The Experience</span>
          <h2 className="section-title">Little rituals, grand details</h2>
          <p className="section-sub">From the moment the doors open, everything is arranged around your comfort.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {AMENITIES.map(([icon, title, desc], i) => (
            <Reveal key={title} delay={i % 3}>
              <div className="card p-6 h-full hover:border-gold-500/40 hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl grid place-items-center text-gold-400 bg-gold-500/10 border border-gold-500/25 mb-4">
                  {Icon({ name: icon, size: 22 })}
                </div>
                <h3 className="font-serif text-[18px] text-cream">{title}</h3>
                <p className="text-[13.5px] text-muted leading-relaxed mt-2">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================== GALLERY ============================== */}
      <section id="gallery" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal className="text-center">
          <span className="eyebrow">Gallery</span>
          <h2 className="section-title">Moments from the hotel</h2>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[150px] md:auto-rows-[190px] gap-3.5 mt-10">
          {GALLERY.map(([idx, cap], i) => (
            <Reveal key={cap} className={`gal-item ${i === 0 ? 'col-span-2 row-span-2' : ''}`} delay={i}>
              <img src={roomArtFor(idx * 2 + 1, 'Suite')} alt={cap} />
              <span className="cap">{cap}</span>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ============================ TESTIMONIALS ============================ */}
      <section id="stories" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal className="text-center">
          <span className="eyebrow">Guest Stories</span>
          <h2 className="section-title">Loved by travellers</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {STORIES.map(([init, name, tag, quote], i) => (
            <Reveal key={name} delay={i}>
              <div className="card p-6 h-full flex flex-col">
                <div className="text-gold-400 tracking-[4px] text-sm">★★★★★</div>
                <blockquote className="text-[14px] leading-relaxed text-cream/90 mt-4 flex-1">"{quote}"</blockquote>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
                  <div className="fd-guest-avatar !w-10 !h-10 !text-[15px]">{init}</div>
                  <div>
                    <div className="text-[14px] font-bold text-cream">{name}</div>
                    <div className="text-[12px] text-dim">{tag}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ================================ CTA ================================ */}
      <section className="max-w-6xl mx-auto px-5 pt-20">
        <Reveal>
          <div className="card p-10 md:p-14 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
            <span className="eyebrow">Reserve</span>
            <h2 className="font-serif text-[clamp(1.9rem,4vw,2.8rem)] text-cream mt-4">Your golden room is waiting</h2>
            <p className="text-muted text-[14.5px] mt-3 max-w-md mx-auto">Reserve in under a minute — instant confirmation, free cancellation up to 48 hours before arrival.</p>
            <a href="#rooms" className="btn btn-gold mt-7">{I.calendar({ width: 16, height: 16 })} Check availability</a>
          </div>
        </Reveal>
      </section>

      <Footer onFindBooking={() => setFindOpen(true)} />

      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRoom={modalRoom}
        dates={dates}
        setDates={setDates}
        guests={guests}
        setGuests={setGuests}
        onBooked={loadRooms}
      />
      <FindBookingModal open={findOpen} onClose={() => setFindOpen(false)} />
    </div>
  );
}
