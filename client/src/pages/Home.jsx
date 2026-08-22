import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import AIConcierge from '../components/AIConcierge.jsx';
import Reveal from '../components/Reveal.jsx';
import BookingWidget from '../components/BookingWidget.jsx';
import RoomCard from '../components/RoomCard.jsx';
import BookingModal from '../components/BookingModal.jsx';
import ParallaxImage from '../components/ParallaxImage.jsx';
import { I, Icon } from '../components/Icons.jsx';
import { api, addDays, todayISO } from '../api.jsx';
import { toast } from '../components/Toast.jsx';
import { useParallax } from '../hooks/useParallax.jsx';
import { usePageMeta } from '../hooks/usePageMeta.jsx';
import { HERO_IMAGE, GALLERY_PHOTOS, EXPERIENCE_PHOTOS } from '../lib/photos.jsx';
import ResponsiveImage from '../components/ResponsiveImage.jsx';
import { AMENITIES, STORIES, TRUST_STRIP } from '../lib/content.jsx';

export default function Home() {
  usePageMeta('De Wura & Alfred Exotic Place Hotel — Hospitality At Its Peak', 'Five-star rooms, skyline views and warm hospitality at the city’s most loved hotel, est. 1962. Book your stay online.', '/social/home.png', HERO_IMAGE);
  const nav = useNavigate();
  const [dates, setDates] = useState(() => {
    const ci = todayISO();
    return { checkIn: ci, checkOut: addDays(ci, 1) };
  });
  const [guests, setGuests] = useState(2);
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalRoom, setModalRoom] = useState(null);

  const loadFeatured = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('checkIn', dates.checkIn);
      params.set('checkOut', dates.checkOut);
      params.set('guests', guests);
      params.set('limit', 3);
      const data = await api(`/api/rooms?${params}`);
      setFeatured(data.rooms.slice(0, 3));
    } catch (e) {
      toast(e.message, false);
      setFeatured([]);
    } finally {
      setLoading(false);
    }
  }, [dates.checkIn, dates.checkOut, guests]);

  useEffect(() => {
    loadFeatured();
    // If the guest bailed out of checkout, say so (no charge was made).
    const cancelled = new URLSearchParams(window.location.search).get('cancelled');
    if (cancelled) {
      toast(`Payment cancelled — no charge was made. Booking ${cancelled} is not confirmed.`, false);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [loadFeatured]);

  const openBooking = (room) => { setModalRoom(room); setModalOpen(true); };
  const heroParallax = useParallax(0.3, 0.2);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div id="top">
      <Navbar />

      {/* ================================ HERO ================================ */}
      <header className="relative min-h-[92vh] flex items-center overflow-hidden pt-28 pb-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div ref={heroParallax} className="absolute -inset-y-[20%] inset-x-0 parallax-layer">
            <ResponsiveImage src={HERO_IMAGE} sizes="100vw" alt="" eager fetchPriority="high" imgClassName="w-full h-full object-cover kenburns" />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-navy-950/85 via-navy-950/45 to-navy-950/95" />
          <div className="absolute inset-0 bg-[radial-gradient(900px_520px_at_20%_15%,rgba(212,175,55,0.12),transparent_60%)]" />
          <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-navy-950 to-transparent" />
        </div>

        <div className="relative max-w-6xl mx-auto px-5 w-full">
          <div className="max-w-2xl">
            <div className="hero-stagger">
              <span className="eyebrow">Hospitality at its peak · Lagos</span>
              <h1 className="font-serif text-[clamp(2.4rem,5.5vw,4rem)] leading-[1.08] text-cream mt-5">
                Where <em className="text-gold-400 not-italic font-serif" style={{ textShadow: '0 0 40px rgba(212,175,55,0.35)' }}>hospitality</em> meets excellence.
              </h1>
              <p className="text-[15.5px] leading-relaxed text-muted mt-5 max-w-lg">
                De Wura & Alfred Exotic Place Hotel offers premium lodging, fine dining, a VIP bar, night club and world-class services — all under one roof with 24-hour power and maximum security.
              </p>
              <div className="flex flex-wrap gap-3 mt-7">
                <Link to="/rooms" className="btn btn-gold">
                  {I.calendar({ width: 16, height: 16 })} Book a stay
                </Link>
                <Link to="/experience" className="btn btn-ghost">Our services</Link>
              </div>
            </div>

            <BookingWidget dates={dates} setDates={setDates} guests={guests} setGuests={setGuests}
              onSubmit={() => {
                if (!dates.checkIn || !dates.checkOut) return toast('Please choose your dates.');
                if (dates.checkOut <= dates.checkIn) return toast('Check-out must be after check-in.');
                const q = new URLSearchParams({ checkIn: dates.checkIn, checkOut: dates.checkOut, guests });
                nav(`/rooms?${q}`);
              }} />
          </div>
        </div>

        {/* floating trust badges over the banner */}
        <div className="hidden xl:flex absolute right-10 top-1/2 -translate-y-1/2 flex-col gap-4 pointer-events-none">
          <div className="card px-5 py-3.5 flex items-center gap-3 backdrop-blur-sm">
            <span className="font-serif text-[26px] text-gold-400">4.9<small className="text-[13px] text-muted">/5</small></span>
            <span className="text-[10px] tracking-[1.5px] uppercase text-muted leading-tight">2,400+ guest<br />reviews</span>
          </div>
          <div className="card px-5 py-3.5 flex items-center gap-3 backdrop-blur-sm">
            <span className="font-serif text-[26px] text-gold-400">#1</span>
            <span className="text-[10px] tracking-[1.5px] uppercase text-muted leading-tight">Luxury hotel<br />· 2026</span>
          </div>
        </div>
      </header>

      {/* ============================ TRUST STRIP ============================ */}
      <div className="border-y border-white/5 bg-navy-900/40">
        <div className="max-w-6xl mx-auto px-5 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {TRUST_STRIP.map(([v, l]) => (
            <div key={l}>
              <div className="font-serif text-[30px] text-gold-400">{v}</div>
              <div className="text-[11px] tracking-[2px] uppercase text-dim mt-1">{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ========================= WURA DIVIDER ============================ */}
      <div className="max-w-6xl mx-auto px-5 py-10">
        <div className="wura-divider"><span className="w-medallion">D</span></div>
      </div>

      {/* ========================= FEATURED ROOMS ========================= */}
      <section id="rooms" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal className="text-center">
          <span className="eyebrow">Rooms &amp; Suites</span>
          <h2 className="section-title">Featured rooms</h2>
          <p className="section-sub mx-auto">A taste of what's waiting — every room is a quiet composition of linen, light and skyline.</p>
        </Reveal>

        {loading ? (
          <div className="py-20"><div className="spinner" /></div>
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
              {featured.map((r, i) => (
                <Reveal key={r.id} variant="zoom" delay={i % 3}>
                  <RoomCard room={r} onBook={openBooking} eager={i === 0} />
                </Reveal>
              ))}
            </div>
            <Reveal className="text-center mt-10">
              <Link to="/rooms" className="btn btn-ghost">View all rooms &amp; suites</Link>
            </Reveal>
          </>
        )}
      </section>

      {/* ========================= EXPERIENCE TEASER ========================= */}
      <section id="experience" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal>
          <span className="eyebrow">The Experience</span>
          <h2 className="section-title">Our services</h2>
          <p className="section-sub">From lodging to nightlife, dining to security — every service is designed around your comfort.</p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
          {AMENITIES.slice(0, 3).map(([icon, title, desc], i) => (
            <Reveal key={title} variant="left" delay={i % 3}>
              <div className="card card-enhanced p-0 overflow-hidden h-full group exp-card">
                <div className="relative h-48 overflow-hidden">
                  <ParallaxImage src={EXPERIENCE_PHOTOS[icon]} alt={title} speed={0.12}
                    imgClassName="transition-transform duration-700 group-hover:scale-105 exp-card-image" />
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-r from-navy-950/40 to-transparent exp-card-overlay" />
                  <div className="absolute left-4 bottom-4 w-12 h-12 rounded-xl grid place-items-center text-gold-400 bg-navy-950/70 border border-gold-500/30 backdrop-blur-sm">
                    {Icon({ name: icon, size: 22 })}
                  </div>
                </div>
                <div className="p-6 pt-5">
                  <h3 className="font-serif text-[19px] text-cream">{title}</h3>
                  <p className="text-[13.5px] text-muted leading-relaxed mt-2.5">{desc}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
        <Reveal className="text-center mt-10">
          <Link to="/experience" className="btn btn-ghost">View all services</Link>
        </Reveal>
      </section>

      {/* ========================== GALLERY TEASER ========================== */}
      <section id="gallery" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal className="text-center">
          <span className="eyebrow">Gallery</span>
          <h2 className="section-title">Moments from the hotel</h2>
        </Reveal>
        <div className="grid grid-cols-2 md:grid-cols-4 auto-rows-[150px] md:auto-rows-[190px] gap-3.5 mt-10">
          {GALLERY_PHOTOS.slice(0, 4).map((g, i) => (
            <Reveal key={g.cap} variant="zoom" className={`gal-item ${i === 0 ? 'col-span-2 row-span-2' : ''}`} delay={i}>
              <ParallaxImage src={g.src} alt={g.cap} speed={0.05 + (i % 3) * 0.04} />
              <span className="cap">{g.cap}</span>
            </Reveal>
          ))}
        </div>
        <Reveal className="text-center mt-10">
          <Link to="/gallery" className="btn btn-ghost">See the full gallery</Link>
        </Reveal>
      </section>

      {/* ========================== STORIES TEASER ========================== */}
      <section id="stories" className="max-w-6xl mx-auto px-5 pt-20 scroll-mt-20">
        <Reveal className="text-center">
          <span className="eyebrow">Guest Stories</span>
          <h2 className="section-title">Loved by travellers</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {STORIES.map(([init, name, tag, quote], i) => (
            <Reveal key={name} variant="flip" delay={i}>
              <div className="card card-enhanced p-6 pt-8 h-full flex flex-col relative">
                <span className="quote-mark" aria-hidden="true">&ldquo;</span>
                <div className="text-gold-400 tracking-[4px] text-sm relative z-10">★★★★★</div>
                <blockquote className="text-[14px] leading-relaxed text-cream/90 mt-3 flex-1 relative z-10 font-serif italic">{quote}</blockquote>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5 relative z-10">
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
        <Reveal className="text-center mt-10">
          <Link to="/stories" className="btn btn-ghost">Read more stories</Link>
        </Reveal>
      </section>

      {/* ================================ CTA ================================ */}
      <section className="max-w-6xl mx-auto px-5 pt-20">
        <Reveal variant="zoom">
          <div className="card p-10 md:p-14 text-center relative overflow-hidden">
            {/* Ambient glow orbs */}
            <div className="cta-glow" style={{ top: '-60px', left: '15%' }} aria-hidden="true" />
            <div className="cta-glow" style={{ bottom: '-80px', right: '10%', animationDelay: '2s' }} aria-hidden="true" />
            <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
            <span className="eyebrow">Reserve</span>
            <h2 className="font-serif text-[clamp(1.9rem,4vw,2.8rem)] text-cream mt-4">Your perfect room is waiting</h2>
            <p className="text-muted text-[14.5px] mt-3 max-w-md mx-auto">Reserve in under a minute — instant confirmation, free cancellation up to 48 hours before arrival.</p>
            <Link to="/rooms" className="btn btn-gold mt-7 inline-flex">{I.calendar({ width: 16, height: 16 })} Check availability</Link>
          </div>
        </Reveal>
      </section>

      <Footer />

      {/* Scroll to top */}
      <button
        className={`scroll-top-btn ${showTop ? 'visible' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
      >
        {I.arrowUp({ width: 18, height: 18 })}
      </button>

      <AIConcierge />
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
