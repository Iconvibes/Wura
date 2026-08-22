import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api.jsx';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';
import { ADMIN_PATH } from '../../lib/adminPath.jsx';
import { usePageMeta } from '../../hooks/usePageMeta.jsx';

const NAV_ALL = [
  [ADMIN_PATH, 'overview', 'Overview', 'chart'],
  [`${ADMIN_PATH}/front-desk`, 'front-desk', 'Front Desk', 'bell'],
  [`${ADMIN_PATH}/bookings`, 'bookings', 'Bookings', 'bookings'],
  [`${ADMIN_PATH}/payments`, 'payments', 'Payments', 'shield'],
  [`${ADMIN_PATH}/rooms`, 'rooms', 'Rooms & Rates', 'room'],
  [`${ADMIN_PATH}/pricing`, 'pricing', 'Dynamic Pricing', 'chart'],
  [`${ADMIN_PATH}/upsells`, 'upsells', 'Upsells', 'star'],
  [`${ADMIN_PATH}/inbox`, 'inbox', 'Inbox', 'mail'],
  [`${ADMIN_PATH}/settings`, 'settings', 'Settings', 'shield'],
];

// Front-desk staff see the desk + inbox only; everything else is admin.
const NAV_BY_ROLE = {
  admin: NAV_ALL,
  staff: NAV_ALL.filter(([, key]) => key === 'front-desk' || key === 'inbox'),
};
const ADMIN_ONLY_VIEWS = new Set(['overview', 'bookings', 'payments', 'rooms', 'settings', 'pricing', 'upsells', 'housekeeping', 'guest-messages', 'loyalty']);
const ROLE_LABELS = { admin: 'Administrator', staff: 'Front desk staff' };

// Per-view tab labels so the staff portal never shows the guest home title.
const VIEW_TITLES = {
  overview: 'Dashboard',
  'front-desk': 'Front Desk',
  bookings: 'Bookings',
  payments: 'Payment History',
  rooms: 'Rooms & Rates',
  inbox: 'Inbox',
  pricing: 'Dynamic Pricing',
  upsells: 'Upsells',
  housekeeping: 'Housekeeping',
  'guest-messages': 'Guest Messages',
  loyalty: 'Loyalty Program',
  settings: 'Settings',
};

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('wura_token');
  const [unread, setUnread] = useState(0);
  const [user, setUser] = useState(null); // { username, role } from /me
  const [hidden, setHidden] = useState(false); // mobile top bar slides away on scroll down

  // Staff titles + drops the guest-site hero preload (admin has no hero — the
  // server strips it too, this keeps the head clean after SPA navigation).
  const rel = location.pathname.slice(ADMIN_PATH.length).replace(/^\/+/, '').split('/')[0] || 'overview';
  usePageMeta(`${VIEW_TITLES[rel] || 'Staff Portal'} — De Wura & Alfred Staff Portal`, 'Staff portal for De Wura & Alfred Hotel — bookings, front desk, rooms and guest messages.');

  // Verify the stored token on mount and learn the session's role. api()
  // already redirects to /admin/login on a 401, so the catch here only handles
  // non-auth failures quietly.
  useEffect(() => {
    if (!token) return;
    api('/api/admin/me')
      .then((d) => setUser(d.user))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Mobile top bar mirrors the guest navbar: hide once the user scrolls down
  // past the header, reappear the moment they scroll back up.
  useEffect(() => {
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      setHidden(y > 160 && y > lastY);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Every navigation lands at the top of the new view, so unhide the bar.
  useEffect(() => { setHidden(false); }, [location.pathname]);

  useEffect(() => {
    if (!token) return;
    const refresh = () => {
      api('/api/admin/messages')
        .then((d) => setUnread(d.unread ?? 0))
        .catch(() => {});
    };
    refresh();
    // Inbox dispatches this after read/unread/delete mutations so the badge
    // stays live even without navigating.
    window.addEventListener('wura-inbox-changed', refresh);
    return () => window.removeEventListener('wura-inbox-changed', refresh);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, location.pathname]);

  if (!token) return <Navigate to={`${ADMIN_PATH}/login`} replace />;

  // Staff land on the front desk and are redirected away from admin-only views.
  const isStaff = user?.role === 'staff';
  if (isStaff && ADMIN_ONLY_VIEWS.has(rel)) {
    return <Navigate to={`${ADMIN_PATH}/front-desk`} replace />;
  }
  const navItems = user ? NAV_BY_ROLE[user.role] || NAV_BY_ROLE.staff : [];

  const logout = () => {
    localStorage.removeItem('wura_token');
    toast('Signed out');
    nav(`${ADMIN_PATH}/login`);
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--color-navy-950)' }}>
      {/* sidebar */}
      <aside className="w-[230px] flex-none border-r border-white/5 bg-navy-900/60 hidden md:flex flex-col p-4 sticky top-0 h-screen">
        <a href="/" className="flex items-center gap-3 mb-8 px-2">
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950">D</span>
          <span className="leading-tight">
            <span className="block font-serif text-[15px] tracking-[1.5px] text-cream">DE WURA & ALFRED</span>
            <span className="block text-[8.5px] tracking-[3px] text-gold-500">STAFF PORTAL</span>
          </span>
        </a>

        <nav className="space-y-1">
          {navItems.map(([path, key, label, icon]) => (
            <NavLink key={path} to={path} end={path === ADMIN_PATH}
              className={({ isActive }) => `side-item ${isActive ? 'active' : ''}`}>
              {Icon({ name: icon, size: 18 })}
              {label}
              {key === 'inbox' && unread > 0 && (
                <span className="ml-auto text-[10px] font-bold text-navy-950 bg-gold-400 rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-3">
          <div className="flex items-center gap-3 px-2 pt-4 border-t border-white/5">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-bold text-navy-950 text-sm">
              {user?.username?.charAt(0).toUpperCase() || 'W'}
            </div>
            <div>
              <div className="text-[13px] font-bold text-cream">{user?.username || '…'}</div>
              <div className="text-[11px] text-dim">{ROLE_LABELS[user?.role] || 'Staff'}</div>
            </div>
          </div>
          <button className="side-item" onClick={logout}>
            {Icon({ name: 'logout', size: 18 })}
            Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar + nav — same slide/fade choreography as the guest navbar */}
      <div aria-hidden="true"
        className={`md:hidden fixed top-0 left-0 right-0 z-30 h-16 pointer-events-none backdrop-blur-[8px] bg-gradient-to-b from-navy-950/40 to-transparent transition-opacity duration-[400ms] ease-(--ease-soft) ${
          hidden ? 'opacity-100' : 'opacity-0'
        }`} />
      <div className={`md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-900/95 backdrop-blur border-b border-white/5 transition-all duration-[400ms] ease-(--ease-soft) ${
        hidden ? '-translate-y-full' : ''
      }`}>
        <div className={`flex items-center justify-between px-4 py-3 transition-opacity duration-[400ms] ease-(--ease-soft) ${
          hidden ? 'opacity-0' : 'opacity-100'
        }`}>
          <span className="font-serif text-[15px] tracking-[1.5px] text-cream">DE WURA & ALFRED · STAFF</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
        <nav className={`flex gap-1.5 overflow-x-auto px-3 pb-3 transition-opacity duration-[400ms] ease-(--ease-soft) delay-100 ${
          hidden ? 'opacity-0' : 'opacity-100'
        }`}>
          {navItems.map(([path, key, label, icon]) => (
            <NavLink key={path} to={path} end={path === ADMIN_PATH}
              className={({ isActive }) => `side-item !py-2 !px-3.5 whitespace-nowrap ${isActive ? 'active' : ''}`}>
              {Icon({ name: icon, size: 16 })}
              {label}
              {key === 'inbox' && unread > 0 && (
                <span className="text-[10px] font-bold text-navy-950 bg-gold-400 rounded-full min-w-[18px] h-[18px] px-1 grid place-items-center">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* main */}
      {/* div, not <main> — App.jsx already provides the single main landmark */}
      <div className="flex-1 min-w-0 px-4 sm:px-8 pt-16 md:pt-8 pb-16">
        <Outlet context={{ user }} />
      </div>
    </div>
  );
}
