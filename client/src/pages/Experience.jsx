import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PageHero from '../components/PageHero.jsx';
import Reveal from '../components/Reveal.jsx';
import ParallaxImage from '../components/ParallaxImage.jsx';
import { Icon } from '../components/Icons.jsx';
import { AMENITIES, PAGE_HEROS } from '../lib/content.js';
import { EXPERIENCE_PHOTOS } from '../lib/photos.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function Experience() {
  usePageMeta('The Experience — Wura Grand Hotel', 'Terrace pool, golden spa, wood-fired dining and more — every experience at Wura Grand is included with your stay.');
  return (
    <div>
      <Navbar />
      <PageHero {...PAGE_HEROS.experience} />

      <section className="max-w-6xl mx-auto px-5 pt-14 pb-10 space-y-20">
        {AMENITIES.map(([icon, title, desc], i) => {
          const left = i % 2 === 0;
          const photo = (
            <div className="relative rounded-2xl overflow-hidden border border-gold-500/25 group h-64 md:h-80">
              <ParallaxImage src={EXPERIENCE_PHOTOS[icon]} alt={title} speed={0.12}
                imgClassName="transition-transform duration-700 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
              <div className="absolute left-4 bottom-4 w-12 h-12 rounded-xl grid place-items-center text-gold-400 bg-navy-950/70 border border-gold-500/30 backdrop-blur-sm pop-chip">
                {Icon({ name: icon, size: 22 })}
              </div>
            </div>
          );
          const text = (
            <div className="flex flex-col justify-center">
              <span className="eyebrow">The Experience · 0{i + 1}</span>
              <h2 className="font-serif text-[clamp(1.6rem,3vw,2.2rem)] text-cream mt-3">{title}</h2>
              <p className="text-[14.5px] leading-relaxed text-muted mt-4">{desc}</p>
              <p className="text-[13px] text-dim mt-4 leading-relaxed">
                Included with every stay — no booking required. Ask the front desk to reserve your slot on arrival.
              </p>
            </div>
          );

          return (
            <div key={title} className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
              {left ? (
                <>
                  <Reveal variant="left">{photo}</Reveal>
                  <Reveal variant="right" delay={1}>{text}</Reveal>
                </>
              ) : (
                <>
                  <Reveal variant="left" delay={1} className="md:order-2">{photo}</Reveal>
                  <Reveal variant="right" className="md:order-1">{text}</Reveal>
                </>
              )}
            </div>
          );
        })}
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pt-8">
        <Reveal variant="zoom">
          <div className="card p-10 md:p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(600px_300px_at_50%_0%,rgba(212,175,55,0.12),transparent_70%)] pointer-events-none" />
            <span className="eyebrow">Plan your stay</span>
            <h2 className="font-serif text-[clamp(1.8rem,3.5vw,2.6rem)] text-cream mt-4">The best part of the hotel is what you do with it</h2>
            <p className="text-muted text-[14.5px] mt-3 max-w-md mx-auto">Every experience is included — book your room and the rest arranges itself.</p>
            <Link to="/rooms" className="btn btn-gold mt-7 inline-flex">Browse rooms &amp; suites</Link>
          </div>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
