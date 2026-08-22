import { useState } from 'react';
import { Link } from 'react-router-dom';
import { I } from './Icons.jsx';
import FindBookingModal from './FindBookingModal.jsx';
import { prefetchRoute } from '../lib/routes.jsx';

export default function Footer() {
  const [findOpen, setFindOpen] = useState(false);

  return (
    <>
      <footer id="contact" className="border-t border-white/5 bg-navy-900/60 mt-24">
        <div className="max-w-6xl mx-auto px-5 py-16 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
          <div>
            <Link to="/" className="flex items-center gap-3 mb-4">
              <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950">D</span>
              <span className="leading-tight">
                <span className="block font-serif text-[16px] tracking-[2px] text-cream">DE WURA</span>
                <span className="block text-[9px] tracking-[3.5px] text-gold-500">ALFRED · EXOTIC PLACE</span>
              </span>
            </Link>
            <p className="text-[13.5px] leading-relaxed text-muted max-w-xs">
              De Wura & Alfred Exotic Place Hotel — lodging, lounge, VIP bar, kitchen, night club, laundry and more. Hospitality at its peak.
            </p>
          </div>

          <div>
            {/* h2 (not h4) — the footer headings were skipping from the page's h2 down to h4, a heading-order violation */}
            <h2 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold mb-4">Explore</h2>
            <ul className="space-y-2.5 text-[13.5px] text-muted">
              <li><Link to="/rooms" onMouseEnter={() => prefetchRoute('/rooms')} onFocus={() => prefetchRoute('/rooms')} className="hover:text-gold-400 transition-colors">Rooms &amp; Suites</Link></li>
              <li><Link to="/experience" onMouseEnter={() => prefetchRoute('/experience')} onFocus={() => prefetchRoute('/experience')} className="hover:text-gold-400 transition-colors">Experience</Link></li>
              <li><Link to="/gallery" onMouseEnter={() => prefetchRoute('/gallery')} onFocus={() => prefetchRoute('/gallery')} className="hover:text-gold-400 transition-colors">Gallery</Link></li>
              <li><Link to="/stories" onMouseEnter={() => prefetchRoute('/stories')} onFocus={() => prefetchRoute('/stories')} className="hover:text-gold-400 transition-colors">Guest stories</Link></li>
              <li><Link to="/about" onMouseEnter={() => prefetchRoute('/about')} onFocus={() => prefetchRoute('/about')} className="hover:text-gold-400 transition-colors">About the hotel</Link></li>
              <li><Link to="/contact" onMouseEnter={() => prefetchRoute('/contact')} onFocus={() => prefetchRoute('/contact')} className="hover:text-gold-400 transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold mb-4">Stay with us</h2>
            <ul className="space-y-2.5 text-[13.5px] text-muted">
              <li>
                <button onClick={() => setFindOpen(true)} className="hover:text-gold-400 transition-colors">Find my booking</button>
              </li>
              <li><span className="cursor-default">Gift cards</span></li>
              <li><span className="cursor-default">Corporate rates</span></li>
            </ul>
          </div>

          <div>
            <h2 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold mb-4">Contact</h2>
            <ul className="space-y-3 text-[13.5px] text-muted">
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">{I.room({ width: 16, height: 16 })}</span>
                9 & 11, Lekan Oyekunle Street, Meran, Lagos
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">{I.phone({ width: 16, height: 16 })}</span>
                <a href="tel:08101035359" className="hover:text-gold-400 transition-colors">08101035359</a> / <a href="tel:08088476099" className="hover:text-gold-400 transition-colors">08088476099</a>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-gold-500 mt-0.5">{I.calendar({ width: 16, height: 16 })}</span>
                <a href="mailto:Goldfred@gmail.com" className="hover:text-gold-400 transition-colors">Goldfred@gmail.com</a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/5 py-5 px-5 text-center text-[12px] text-dim">
          © 2026 De Wura & Alfred Exotic Place Hotel. All rights reserved.
        </div>
      </footer>

      <FindBookingModal open={findOpen} onClose={() => setFindOpen(false)} />
    </>
  );
}
