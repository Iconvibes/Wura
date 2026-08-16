import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PageHero from '../components/PageHero.jsx';
import Reveal from '../components/Reveal.jsx';
import ParallaxImage from '../components/ParallaxImage.jsx';
import { Icon } from '../components/Icons.jsx';
import { PAGE_HEROS, TIMELINE, VALUES, TRUST_STRIP } from '../lib/content.jsx';
import { HERO_IMAGE } from '../lib/photos.jsx';
import { usePageMeta } from '../hooks/usePageMeta.jsx';

export default function About() {
  usePageMeta('Our Story — Wura Grand Hotel', 'Sixty years of quiet luxury: the history of Wura Grand, from Mariam Wura’s ten-room guesthouse in 1962 to the city’s most loved address.', '/social/about.png', PAGE_HEROS.about.image);
  return (
    <div>
      <Navbar />
      <PageHero {...PAGE_HEROS.about} />

      {/* founder story */}
      <section className="max-w-6xl mx-auto px-5 pt-16">
        <div className="grid md:grid-cols-[1.1fr_1fr] gap-10 items-center">
          <Reveal variant="left">
            <div className="relative rounded-2xl overflow-hidden border border-gold-500/25 h-72 md:h-96">
              <ParallaxImage src={HERO_IMAGE} alt="The Golden Lobby" speed={0.12} />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/80 via-transparent to-transparent" />
              <div className="absolute left-5 bottom-5">
                <div className="font-serif text-[15px] text-gold-300">The Golden Lobby, 2026</div>
                <div className="text-[11px] tracking-[2px] uppercase text-dim">— photographed for the house archive</div>
              </div>
            </div>
          </Reveal>
          <Reveal variant="right" delay={1}>
            <span className="eyebrow">Since 1962</span>
            <h2 className="section-title">A guesthouse with one rule</h2>
            <p className="section-sub">
              Mariam Wura opened the doors in 1962 with ten rooms, a borrowed piano
              and a rule she wrote in her own hand: <em className="text-gold-400 not-italic font-serif">every guest leaves knowing their name</em>.
            </p>
            <p className="text-[14.5px] leading-relaxed text-muted mt-4">
              Sixty years later the hotel has grown wings, a spa, a pool and a restaurant that
              locals reserve months ahead — but the ledger is still kept the old way, and the rule
              has never been broken. Today her granddaughter Adaeze hosts in her place, on the
              same corner of Golden Crescent.
            </p>
            <blockquote className="mt-6 pl-5 border-l-2 border-gold-500 text-[15.5px] font-serif text-cream/90 italic leading-relaxed">
              "A hotel is not rooms. It is the hour you remember being asked how your day was — and meant."
            </blockquote>
            <div className="text-[12.5px] text-dim mt-3">— Mariam Wura, founder, writing in the 1962 ledger</div>
          </Reveal>
        </div>
      </section>

      {/* timeline */}
      <section className="max-w-4xl mx-auto px-5 pt-20">
        <Reveal className="text-center">
          <span className="eyebrow">The Years</span>
          <h2 className="section-title">A century of small revolutions</h2>
        </Reveal>
        <div className="mt-12 relative">
          <div className="absolute left-[15px] md:left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-gold-500/40 to-transparent" aria-hidden="true" />
          <div className="space-y-10">
            {TIMELINE.map(([year, title, text], i) => {
              const left = i % 2 === 0;
              return (
                <div key={year} className="relative flex md:justify-between items-start pl-11 md:pl-0">
                  {/* node */}
                  <span className={`absolute left-[9px] md:left-1/2 md:-translate-x-1/2 top-1.5 w-3.5 h-3.5 rounded-full bg-navy-950 border-2 border-gold-500 shadow-[0_0_12px_rgba(212,175,55,0.5)] ${left ? 'md:ml-[-7px]' : 'md:ml-[-7px]'}`} aria-hidden="true" />
                  <Reveal
                    variant={left ? 'left' : 'right'}
                    className={`w-full md:w-[46%] ${left ? 'md:mr-auto' : 'md:ml-auto'}`}
                  >
                    <div className="card p-5 hover:border-gold-500/40 transition-colors">
                      <div className="font-serif text-[20px] text-gold-400">{year}</div>
                      <div className="font-bold text-cream mt-1">{title}</div>
                      <p className="text-[13px] text-muted leading-relaxed mt-1.5">{text}</p>
                    </div>
                  </Reveal>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* values */}
      <section className="max-w-6xl mx-auto px-5 pt-20">
        <Reveal className="text-center">
          <span className="eyebrow">What we stand for</span>
          <h2 className="section-title">The house rules</h2>
        </Reveal>
        <div className="grid sm:grid-cols-3 gap-5 mt-10">
          {VALUES.map(([icon, title, desc], i) => (
            <Reveal key={title} variant="zoom" delay={i % 3}>
              <div className="card p-7 h-full text-center">
                <div className="w-12 h-12 mx-auto rounded-xl grid place-items-center text-gold-400 bg-navy-900 border border-gold-500/25">
                  {Icon({ name: icon, size: 22 })}
                </div>
                <h3 className="font-serif text-[18px] text-cream mt-4">{title}</h3>
                <p className="text-[13px] text-muted leading-relaxed mt-2">{desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* trust strip */}
      <section className="max-w-6xl mx-auto px-5 pt-16">
        <Reveal variant="up">
          <div className="card p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {TRUST_STRIP.map(([v, l]) => (
              <div key={l}>
                <div className="font-serif text-[28px] text-gold-400">{v}</div>
                <div className="text-[11px] tracking-[2px] uppercase text-dim mt-1">{l}</div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-5 pt-16 text-center">
        <Reveal variant="zoom">
          <h2 className="font-serif text-[clamp(1.7rem,3.5vw,2.4rem)] text-cream">Come and add a page to the ledger</h2>
          <p className="text-muted text-[14.5px] mt-3 max-w-md mx-auto">Sixty years of guests, and the first one is still welcome back at the same rate.</p>
          <Link to="/rooms" className="btn btn-gold mt-7 inline-flex">Check availability</Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
