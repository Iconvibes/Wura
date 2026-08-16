const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
};

export const I = {
  calendar: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  users: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><circle cx="9" cy="8" r="3.4" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 4.6a3.4 3.4 0 0 1 0 6.8M17.8 19a5.5 5.5 0 0 0-2.6-4.6" /></svg>,
  size: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><path d="m9 9 6 6M15 9l-6 6" /></svg>,
  check: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="m5 13 4 4L19 7" /></svg>,
  shield: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M12 22s8-3.5 8-10V5l-8-3-8 3v7c0 6.5 8 10 8 10z" /><path d="m9 11.5 2 2 4-4" /></svg>,
  search: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><circle cx="11" cy="11" r="7.5" /><path d="M21 21l-4.3-4.3" /></svg>,
  moon: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></svg>,
  menu: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M4 7h16M4 12h16M4 17h10" /></svg>,
  close: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M18 6 6 18M6 6l12 12" /></svg>,
  pool: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M2 20h20M6 20V8l6-4 6 4v12M10 20v-5h4v5" /></svg>,
  spa: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M12 3c1.5 3.5 5 5 5 9a5 5 0 0 1-10 0c0-4 3.5-5.5 5-9z" /><path d="M8.5 15c-1.5 1-1.5 2.5 0 3.5M15.5 15c1.5 1 1.5 2.5 0 3.5M10 18.5c-.8.9-.8 1.9 0 2.8M14 18.5c.8.9.8 1.9 0 2.8" /></svg>,
  flame: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M6.5 6.5c3-2.5 8-2.5 11 0M4 4c5-4 11-4 16 0M8.5 9.5c1.7-1.3 5.3-1.3 7 0M12 12l-3 6a1.5 1.5 0 0 0 1.3 2.2h3.4a1.5 1.5 0 0 0 1.3-2.2l-3-6z" /></svg>,
  yoga: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M6 20v-8m4 8v-5m4 5v-7m4 7V7l-8-4-8 4v13" /><path d="M2 20h20" /></svg>,
  car: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M3 17l5-9 4 6 3-4 6 7M6.5 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" /></svg>,
  plate: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M5 12.5h14M5 12.5c-1.5 0-2.5-1-2.5-2.2 0-.8.6-1.8 1.4-2.2.3-3.4 4.6-5 8.1-5s7.8 1.6 8.1 5c.8.4 1.4 1.4 1.4 2.2 0 1.2-1 2.2-2.5 2.2M5 12.5V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5.5M9 20v-4.5M15 20v-4.5" /></svg>,
  chart: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M3 3v18h18" /><path d="m7 15 4-6 4 3 5-7" /></svg>,
  bell: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M5 17h14M5 17 3 13h18l-2 4M7 13l-1-4h4l-1 4" /></svg>,
  mail: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>,
  inbox: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.7 4H7.3a2 2 0 0 0-1.8 1.1z" /></svg>,
  occupancy: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" /><path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" /></svg>,
  revenue: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>,
  bookings: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>,
  logout: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>,
  edit: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" /></svg>,
  toggle: (s = {}) => <svg viewBox="0 0 24 24" {...base} strokeWidth={1.8}><rect x="2" y="7" width="20" height="10" rx="5" /><circle cx="16" cy="12" r="2.6" fill="currentColor" stroke="none" /></svg>,
  trash: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>,
  refresh: (s = {}) => <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...s}><path d="M21 12a9 9 0 1 1-2.6-6.4" /><path d="M21 3v6h-6" /></svg>,
  prev: (s = {}) => <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...s}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>,
  next: (s = {}) => <svg viewBox="0 0 24 24" {...base} strokeWidth={2} {...s}><path d="M5 12h14M12 5l7 7-7 7" /></svg>,
  room: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M3 18v-6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6" /><path d="M3 18h18M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4" /></svg>,
  phone: (s = {}) => <svg viewBox="0 0 24 24" {...base} {...s}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2z" /></svg>,
};

export const Icon = ({ name, className = '', size = 18 }) =>
  I[name] ? <span className={`inline-flex ${className}`} style={{ width: size, height: size }}>{I[name]({ width: size, height: size })}</span> : null;
