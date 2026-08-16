import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { I } from './Icons.jsx';
import { ADMIN_PATH, ADMIN_HASH } from '../lib/adminPath.jsx';
import { NAV_LINKS } from '../lib/content.jsx';
import { prefetchRoute } from '../lib/routes.jsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  // The admin quick-access link only appears when the secret fragment is in
  // the URL (e.g. https://host/#staff-access-7k2x) — the public site stays clean.
  const [adminVisible, setAdminVisible] = useState(() => window.location.hash === ADMIN_HASH);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onHash = () => setAdminVisible(window.location.hash === ADMIN_HASH);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Close the mobile menu on any route change (the transition interceptor
  // takes over link clicks, so the per-link onClick no longer fires).
  const location = useLocation();
  useEffect(() => { setOpen(false); }, [location.pathname]);

  const close = () => setOpen(false);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || open ? 'bg-navy-950/92 backdrop-blur-md border-b border-white/5 py-2' : 'bg-transparent py-4'
      }`}
    >
      <div className="max-w-6xl mx-auto px-5 flex items-center justify-between">
        <Link to="/" onClick={close} className="flex items-center gap-3 group">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950 text-lg shadow-[0_0_20px_rgba(212,175,55,0.4)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-shadow">
            W
          </span>
          <span className="leading-tight">
            <span className="block font-serif text-[17px] tracking-[2px] text-cream">WURA GRAND</span>
            <span className="block text-[9px] tracking-[3.5px] text-gold-500">HOTEL · EST. 1962</span>
          </span>
        </Link>

        <div className={`${open ? 'flex' : 'hidden'} md:flex absolute md:static top-full left-0 right-0 flex-col md:flex-row md:items-center gap-1 md:gap-2 bg-navy-950/97 md:bg-transparent backdrop-blur-md border-b border-white/5 md:border-0 px-5 py-4 md:p-0`}>
          {NAV_LINKS.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              onClick={close}
              className={({ isActive }) =>
                `px-3 py-2 rounded-lg text-[13.5px] font-medium transition-colors ${
                  isActive ? 'text-gold-400 bg-white/5' : 'text-muted hover:text-cream hover:bg-white/5'
                }`
              }
              onMouseEnter={() => prefetchRoute(to)}
              onFocus={() => prefetchRoute(to)}
            >
              {label}
            </NavLink>
          ))}
          {adminVisible && (
            <Link to={ADMIN_PATH} onClick={close} className="mt-2 md:mt-0 md:ml-2 btn btn-ghost btn-sm">
              Admin
            </Link>
          )}
        </div>

        <button
          className="md:hidden w-10 h-10 grid place-items-center rounded-lg border border-white/10 text-cream"
          aria-label="Menu"
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          {open ? I.close({ width: 20, height: 20 }) : I.menu({ width: 20, height: 20 })}
        </button>
      </div>
    </nav>
  );
}
