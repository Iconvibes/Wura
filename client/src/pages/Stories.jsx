import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import PageHero from '../components/PageHero.jsx';
import Reveal from '../components/Reveal.jsx';
import { STORIES, PAGE_HEROS } from '../lib/content.js';
import { usePageMeta } from '../hooks/usePageMeta.js';

export default function Stories() {
  usePageMeta('Guest Stories — Wura Grand Hotel', 'Five-star words from the people who know us best: 2,400+ verified guest reviews of Wura Grand Hotel.');
  const [init, name, tag, quote] = STORIES[0];

  return (
    <div>
      <Navbar />
      <PageHero {...PAGE_HEROS.stories} />

      {/* featured quote */}
      <section className="max-w-4xl mx-auto px-5 pt-14 text-center">
        <Reveal variant="zoom">
          <div className="text-gold-400 tracking-[6px] text-xl">★★★★★</div>
          <blockquote className="font-serif text-[clamp(1.5rem,3.2vw,2.2rem)] leading-snug text-cream mt-6">
            "{quote}"
          </blockquote>
          <div className="flex items-center justify-center gap-3 mt-7">
            <div className="fd-guest-avatar !w-11 !h-11 !text-[16px]">{init}</div>
            <div className="text-left">
              <div className="text-[15px] font-bold text-cream">{name}</div>
              <div className="text-[12.5px] text-dim">{tag}</div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* flip-in story cards */}
      <section className="max-w-6xl mx-auto px-5 pt-16">
        <div className="grid md:grid-cols-3 gap-5">
          {STORIES.map(([inits, nm, tg, qt], i) => (
            <Reveal key={nm} variant="flip" delay={i * 1.2}>
              <div className="card p-7 h-full flex flex-col hover:border-gold-500/40 hover:-translate-y-1 transition-all duration-300">
                <div className="text-gold-400 tracking-[4px] text-sm">★★★★★</div>
                <blockquote className="text-[14px] leading-relaxed text-cream/90 mt-4 flex-1">"{qt}"</blockquote>
                <div className="flex items-center gap-3 mt-5 pt-4 border-t border-white/5">
                  <div className="fd-guest-avatar !w-10 !h-10 !text-[15px]">{inits}</div>
                  <div>
                    <div className="text-[14px] font-bold text-cream">{nm}</div>
                    <div className="text-[12px] text-dim">{tg}</div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* stats strip */}
      <section className="max-w-6xl mx-auto px-5 pt-16">
        <Reveal variant="up">
          <div className="card p-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[['4.9 / 5', 'Average guest score'], ['2,400+', 'Verified reviews'], ['92%', 'Guests return'], ['#1', 'City luxury hotel']].map(([v, l]) => (
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
        <Reveal variant="up">
          <h2 className="font-serif text-[clamp(1.7rem,3.5vw,2.4rem)] text-cream">Write your own story here</h2>
          <p className="text-muted text-[14.5px] mt-3 max-w-md mx-auto">The reviews are lovely — but they're better when you're in one.</p>
          <Link to="/rooms" className="btn btn-gold mt-7 inline-flex">Check availability</Link>
        </Reveal>
      </section>

      <Footer />
    </div>
  );
}
