import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PageHero from '../components/PageHero.jsx';
import Reveal from '../components/Reveal.jsx';
import RoomCard from '../components/RoomCard.jsx';
import BookingModal from '../components/BookingModal.jsx';
import { I } from '../components/Icons.jsx';
import { api, fmtDate, addDays, todayISO } from '../api.jsx';
import { toast } from '../components/Toast.jsx';
import { PAGE_HEROS } from '../lib/content.jsx';
import { usePageMeta } from '../hooks/usePageMeta.jsx';

export default function Rooms() {
  usePageMeta('Rooms & Suites — Wura Grand Hotel', 'Browse 50 rooms and suites across five tiers with live availability, free cancellation and skyline views. Book directly with Wura Grand.', '/social/rooms.png', PAGE_HEROS.rooms.image);
  const [params, setParams] = useSearchParams();
  const [dates, setDates] = useState(() => ({
    checkIn: params.get('checkIn') || todayISO(),
    checkOut: params.get('checkOut') || addDays(todayISO(), 2),
  }));
  const [guests, setGuests] = useState(Number(params.get('guests')) || 2);
  const [rooms, setRooms] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 6, total: 0, totalPages: 1 });
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('name-asc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoom, setModalRoom] = useState(null);
  const searchTimer = useRef(null);

  const loadRooms = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      p.set('checkIn', dates.checkIn);
      p.set('checkOut', dates.checkOut);
      p.set('guests', guests);
      if (search) p.set('search', search);
      const [sortKey, dir] = sort.split('-');
      p.set('sort', sortKey);
      p.set('dir', dir);
      p.set('page', page);
      p.set('limit', 6);
      const data = await api(`/api/rooms?${p}`);
      setRooms(data.rooms);
      setPagination(data.pagination);
    } catch (e) {
      toast(e.message, false);
      setRooms([]);
    } finally {
      setLoading(false);
    }
  }, [dates.checkIn, dates.checkOut, guests, search, sort, page]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  const list = rooms.filter((r) => filter === 'all' || r.type === filter);
  const types = ['all', ...new Set(rooms.map((r) => r.type))];

  const openBooking = (room) => { setModalRoom(room); setModalOpen(true); };

  return (
    <div>
      <Navbar />
      <PageHero {...PAGE_HEROS.rooms} />

      {/* filter toolbar */}
      <section className="max-w-6xl mx-auto px-5 -mt-6 relative z-10">
        <Reveal variant="up" delay={0}>
          <div className="card p-5 flex flex-col gap-4">
            <div className="grid sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-end">
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gold-500">{I.search({ width: 16, height: 16 })}</span>
                <input
                  type="text"
                  placeholder="Search rooms, views, amenities…"
                  className="pl-10 rounded-xl"
                  style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '11px 14px 11px 40px', fontSize: 14, outline: 'none', width: '100%' }}
                  onChange={(e) => {
                    clearTimeout(searchTimer.current);
                    const v = e.target.value.trim();
                    searchTimer.current = setTimeout(() => { setSearch(v); setPage(1); }, 300);
                  }}
                />
              </div>
              <div className="flex items-end gap-2">
                <label className="text-[10.5px] tracking-[1.5px] uppercase text-dim">Check-in
                  <input type="date" value={dates.checkIn} onChange={(e) => setDates((d) => ({ ...d, checkIn: e.target.value }))}
                    className="rounded-lg ml-2" style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '9px 10px', fontSize: 13, outline: 'none' }} />
                </label>
                <label className="text-[10.5px] tracking-[1.5px] uppercase text-dim">Check-out
                  <input type="date" value={dates.checkOut} onChange={(e) => setDates((d) => ({ ...d, checkOut: e.target.value }))}
                    className="rounded-lg ml-2" style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '9px 10px', fontSize: 13, outline: 'none' }} />
                </label>
                <select value={guests} onChange={(e) => setGuests(Number(e.target.value))}
                  className="rounded-lg" style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '9px 10px', fontSize: 13, outline: 'none' }}>
                  {[1, 2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} guest{n > 1 ? 's' : ''}</option>)}
                </select>
                <button className="btn btn-gold btn-sm" onClick={() => { setPage(1); loadRooms(); }}>Update</button>
              </div>
              <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }}
                className="rounded-xl sm:w-40" style={{ background: 'var(--color-navy-900)', border: '1px solid rgba(148,163,184,0.22)', color: 'var(--color-cream)', padding: '11px 14px', fontSize: 14, outline: 'none' }}>
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
      </section>

      {/* rooms grid — zoom-in entrance, unique to this page */}
      <section className="max-w-6xl mx-auto px-5 pt-10">
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
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {list.map((r, i) => (
                <Reveal key={r.id} variant="zoom" delay={i % 3}>
                  {/* first card skips lazy-loading so the grid paints fast */}
                  <RoomCard room={r} onBook={openBooking} eager={i === 0} />
                </Reveal>
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

      <Footer />
      <BookingModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        initialRoom={modalRoom}
        dates={dates}
        setDates={setDates}
        guests={guests}
        setGuests={setGuests}
      />
    </div>
  );
}
