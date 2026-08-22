import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PageHero from '../components/PageHero.jsx';
import Reveal from '../components/Reveal.jsx';
import { I } from '../components/Icons.jsx';
import { PAGE_HEROS } from '../lib/content.jsx';
import { usePageMeta } from '../hooks/usePageMeta.jsx';
import ResponsiveImage from '../components/ResponsiveImage.jsx';

const PHOTOS = [
  { src: '/images/exterior.jpg', cap: 'Hotel Exterior', cat: 'hotel' },
  { src: '/images/hero.jpg', cap: 'The Entrance', cat: 'hotel' },
  { src: '/images/bar.jpg', cap: 'VIP Bar', cat: 'lounge' },
  { src: '/images/restaurant.jpg', cap: 'The Kitchen', cat: 'dining' },
  { src: '/images/breakfast.jpg', cap: 'Intercontinental Dishes', cat: 'dining' },
  { src: '/images/rooms/suite.jpg', cap: 'Suite Room', cat: 'rooms' },
  { src: '/images/rooms/deluxe.jpg', cap: 'Deluxe Room', cat: 'rooms' },
  { src: '/images/rooms/standard.jpg', cap: 'Classic Room', cat: 'rooms' },
  { src: '/images/rooms/penthouse.jpg', cap: 'The Penthouse', cat: 'rooms' },
  { src: '/images/bath.jpg', cap: 'Room Amenities', cat: 'rooms' },
  { src: '/images/exterior.jpg', cap: 'Hotel Facade at Dusk', cat: 'hotel' },
  { src: '/images/bar.jpg', cap: 'Bar Ambience', cat: 'lounge' },
];

const CATS = [
  ['all', 'All photos'],
  ['rooms', 'Rooms'],
  ['dining', 'Kitchen & Dining'],
  ['lounge', 'Lounge & Bar'],
  ['hotel', 'The Hotel'],
];

// Varied aspect ratios make the masonry feel curated, not uniform.
const RATIOS = ['4/3', '3/4', '16/10', '1/1', '4/5', '3/2', '4/3', '1/1'];

export default function Gallery() {
  usePageMeta('Gallery — De Wura & Alfred Exotic Place Hotel', 'A look inside De Wura & Alfred — our spaces, our food, our people.', '/social/gallery.png', PAGE_HEROS.gallery.image);
  const [lightbox, setLightbox] = useState(null); // index into the filtered list
  const [cat, setCat] = useState('all');

  const filtered = useMemo(() => (cat === 'all' ? PHOTOS : PHOTOS.filter((p) => p.cat === cat)), [cat]);
  const open = (i) => setLightbox(i);
  const close = () => setLightbox(null);
  const step = (dir) => setLightbox((i) => (i + dir + filtered.length) % filtered.length);

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, filtered.length]);

  const catName = (c) => CATS.find(([k]) => k === c)?.[1] || c;

  return (
    <div>
      <Navbar />
      <PageHero {...PAGE_HEROS.gallery} />

      {/* intro + filters */}
      <section className="max-w-6xl mx-auto px-5 pt-12">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <p className="text-[14.5px] leading-relaxed text-muted max-w-xl">
              A quiet record of light, linen and skyline — captured between check-ins.
              Click any frame to view it full size.
            </p>
            <div className="flex flex-wrap gap-2">
              {CATS.map(([key, label]) => {
                const n = key === 'all' ? PHOTOS.length : PHOTOS.filter((p) => p.cat === key).length;
                return (
                  <button key={key} className={`chip ${cat === key ? 'active' : ''}`} onClick={() => setCat(key)}>
                    {label} <span className="opacity-60">· {n}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </Reveal>

        {/* masonry — re-mounts per filter so each collection animates in */}
        <div key={cat} className="mt-8 columns-2 md:columns-3 xl:columns-4 gap-4 [column-fill:_balance]">
          {filtered.map((g, i) => (
            <Reveal
              key={g.cap}
              variant={i % 4 === 0 ? 'zoom' : i % 4 === 1 ? 'left' : i % 4 === 2 ? 'right' : 'up'}
              delay={i % 5}
              className="mb-4 break-inside-avoid"
            >
              <figure
                className="gal-card"
                style={{ aspectRatio: RATIOS[i % RATIOS.length] }}
                onClick={() => open(i)}
              >
                <ResponsiveImage src={g.src} sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw" alt={g.cap} loading="lazy" />
                <div className="gal-overlay" />
                <span className="gal-cat">{catName(g.cat)}</span>
                <figcaption className="gal-cap">
                  <span className="gal-cap-title">{g.cap}</span>
                  <span className="gal-cap-zoom">{I.search({ width: 15, height: 15 })} View</span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        {/* strip */}
        <Reveal className="mt-10">
          <div className="card p-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-center">
            {[['16', 'Frames in the collection'], ['5', 'Categories to explore'], ['1', 'Hotel, every angle']].map(([v, l]) => (
              <div key={l}>
                <div className="font-serif text-[26px] text-gold-400">{v}</div>
                <div className="text-[10.5px] tracking-[2px] uppercase text-dim mt-0.5">{l}</div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* CTA */}
        <Reveal className="mt-10 text-center">
          <h2 className="font-serif text-[clamp(1.6rem,3.5vw,2.3rem)] text-cream">Prefer the real thing?</h2>
          <p className="text-muted text-[14.5px] mt-3 max-w-md mx-auto">
            Every frame above was taken at the hotel — the view is better from a balcony.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link to="/rooms" className="btn btn-gold">{I.calendar({ width: 16, height: 16 })} Book a stay</Link>
            <Link to="/experience" className="btn btn-ghost">Explore the experience</Link>
          </div>
        </Reveal>
      </section>

      {/* lightbox */}
      {lightbox !== null && filtered[lightbox] && (
        <div className="lightbox" role="dialog" aria-label={filtered[lightbox].cap} onClick={close}>
          <button className="lb-btn lb-close" onClick={close} aria-label="Close">{I.close({ width: 18, height: 18 })}</button>
          <button className="lb-btn lb-prev" onClick={(e) => { e.stopPropagation(); step(-1); }} aria-label="Previous">{I.prev({ width: 20, height: 20 })}</button>
          <ResponsiveImage src={filtered[lightbox].src} sizes="100vw" alt={filtered[lightbox].cap} onClick={(e) => e.stopPropagation()} />
          <button className="lb-btn lb-next" onClick={(e) => { e.stopPropagation(); step(1); }} aria-label="Next">{I.next({ width: 20, height: 20 })}</button>
          <span className="cap">
            {filtered[lightbox].cap} · {catName(filtered[lightbox].cat)}
          </span>
          <span className="lb-count">{lightbox + 1} / {filtered.length}</span>
        </div>
      )}

      <Footer />
    </div>
  );
}
