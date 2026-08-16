import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../../api.js';
import { Icon } from '../../components/Icons.jsx';
import { toast } from '../../components/Toast.jsx';
import { ADMIN_PATH } from '../../lib/adminPath.js';

const NAV = [
  [ADMIN_PATH, 'overview', 'Overview', 'chart'],
  [`${ADMIN_PATH}/front-desk`, 'front-desk', 'Front Desk', 'bell'],
  [`${ADMIN_PATH}/bookings`, 'bookings', 'Bookings', 'bookings'],
  [`${ADMIN_PATH}/rooms`, 'rooms', 'Rooms & Rates', 'room'],
  [`${ADMIN_PATH}/inbox`, 'inbox', 'Inbox', 'mail'],
];

export default function AdminLayout() {
  const nav = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('wura_token');
  const [unread, setUnread] = useState(0);

  // Verify the stored token on mount. api() already redirects to /admin/login
  // on a 401, so the catch here only handles non-auth failures quietly. The
  // unread count refreshes on every navigation so the Inbox badge stays in
  // sync after messages are read or deleted inside the panel.
  useEffect(() => {
    if (!token) return;
    api('/api/admin/me').catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          <span className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-serif font-bold text-navy-950">W</span>
          <span className="leading-tight">
            <span className="block font-serif text-[15px] tracking-[1.5px] text-cream">WURA GRAND</span>
            <span className="block text-[8.5px] tracking-[3px] text-gold-500">STAFF PORTAL</span>
          </span>
        </a>

        <nav className="space-y-1">
          {NAV.map(([path, key, label, icon]) => (
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
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 grid place-items-center font-bold text-navy-950 text-sm">A</div>
            <div>
              <div className="text-[13px] font-bold text-cream">admin</div>
              <div className="text-[11px] text-dim">Front desk staff</div>
            </div>
          </div>
          <button className="side-item" onClick={logout}>
            {Icon({ name: 'logout', size: 18 })}
            Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar + nav */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-navy-900/95 backdrop-blur border-b border-white/5">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="font-serif text-[15px] tracking-[1.5px] text-cream">WURA GRAND · STAFF</span>
          <button className="btn btn-ghost btn-sm" onClick={logout}>Sign out</button>
        </div>
        <nav className="flex gap-1.5 overflow-x-auto px-3 pb-3">
          {NAV.map(([path, key, label, icon]) => (
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
      <main className="flex-1 min-w-0 px-4 sm:px-8 pt-16 md:pt-8 pb-16">
        <Outlet />
      </main>
    </div>
  );
}
