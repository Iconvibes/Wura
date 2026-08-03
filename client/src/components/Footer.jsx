import { Link } from 'react-router-dom';
import { I } from './Icons.jsx';

export default function Footer({ onFindBooking }) {
  return (
    <footer id="contact" className="border-t border-white/5 bg-navy-900/60 mt-24">
      <div className="max-w-6xl mx-auto px-5 py-16 grid gap-10 md:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950">W</span>
            <span className="leading-tight">
              <span className="block font-serif text-[16px] tracking-[2px] text-cream">WURA GRAND</span>
              <span className="block text-[9px] tracking-[3.5px] text-gold-500">HOTEL · EST. 1962</span>
            </span>
          </div>
          <p className="text-[13.5px] leading-relaxed text-muted max-w-xs">
            Ten rooms, one standard of excellence. Rising above the city since 1962, Wura Grand pairs old-world warmth with modern luxury.
          </p>
        </div>

        <div>
          <h4 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold mb-4">Explore</h4>
          <ul className="space-y-2.5 text-[13.5px] text-muted">
            <li><a href="#rooms" className="hover:text-gold-400 transition-colors">Rooms &amp; Suites</a></li>
            <li><a href="#experience" className="hover:text-gold-400 transition-colors">Experience</a></li>
            <li><a href="#gallery" className="hover:text-gold-400 transition-colors">Gallery</a></li>
            <li><a href="#stories" className="hover:text-gold-400 transition-colors">Guest stories</a></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold mb-4">Stay with us</h4>
          <ul className="space-y-2.5 text-[13.5px] text-muted">
            <li>
              <button onClick={onFindBooking} className="hover:text-gold-400 transition-colors">Find my booking</button>
            </li>
            <li><Link to="/admin" className="hover:text-gold-400 transition-colors">Staff portal</Link></li>
            <li><span className="cursor-default">Gift cards</span></li>
            <li><span className="cursor-default">Corporate rates</span></li>
          </ul>
        </div>

        <div>
          <h4 className="text-[11px] tracking-[3px] uppercase text-gold-500 font-bold mb-4">Contact</h4>
          <ul className="space-y-3 text-[13.5px] text-muted">
            <li className="flex items-start gap-3">
              <span className="text-gold-500 mt-0.5">{I.room({ width: 16, height: 16 })}</span>
              1 Golden Crescent, City Centre
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold-500 mt-0.5">{I.phone({ width: 16, height: 16 })}</span>
              +1 (555) 012-1962
            </li>
            <li className="flex items-start gap-3">
              <span className="text-gold-500 mt-0.5">{I.calendar({ width: 16, height: 16 })}</span>
              stay@wuragrand.example
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5 py-5 px-5 text-center text-[12px] text-dim">
        © 2026 Wura Grand Hotel. All rights reserved. · Built with React + Express + MongoDB — MERN stack.
      </div>
    </footer>
  );
}
