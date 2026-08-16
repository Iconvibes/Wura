import { useParallax } from '../hooks/useParallax.jsx';
import ResponsiveImage from './ResponsiveImage.jsx';

// Inner-page banner: full-bleed photo that drifts on scroll, with a slow
// ken-burns zoom and the standard gold-on-navy overlay.
export default function PageHero({ eyebrow, title, sub, image }) {
  const parallax = useParallax(0.25, 0.15);

  return (
    <header className="relative min-h-[46vh] flex items-end overflow-hidden pt-32 pb-14">
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div ref={parallax} className="absolute -inset-y-[18%] inset-x-0 parallax-layer">
          {/* LCP image on inner pages — eager, high priority, AVIF/WebP */}
          <ResponsiveImage src={image} sizes="100vw" alt="" eager fetchPriority="high" imgClassName="w-full h-full object-cover kenburns" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-navy-950/80 via-navy-950/40 to-navy-950" />
        <div className="absolute inset-0 bg-[radial-gradient(800px_400px_at_15%_10%,rgba(212,175,55,0.10),transparent_60%)]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-5 w-full">
        <div className="max-w-2xl">
          <span className="eyebrow">{eyebrow}</span>
          <h1 className="font-serif text-[clamp(2rem,4.5vw,3.2rem)] leading-[1.1] text-cream mt-4 hero-rise">{title}</h1>
          {sub && <p className="text-[15px] leading-relaxed text-muted mt-4 max-w-lg">{sub}</p>}
        </div>
      </div>
    </header>
  );
}
