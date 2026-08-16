// The admin panel lives behind a non-obvious URL so it isn't discoverable
// from the public site. Override with VITE_ADMIN_PATH at build time (e.g. a
// long random slug); the default below is just a sane local-dev value.
export const ADMIN_PATH = (import.meta.env.VITE_ADMIN_PATH || '/hotel-staff-9k2x7').replace(/\/+$/, '');

// Secret URL fragment that reveals the admin quick-access link on the public
// site: visiting https://host/#<fragment> makes the Admin button appear.
export const ADMIN_FRAGMENT = (import.meta.env.VITE_ADMIN_FRAGMENT || 'staff-access-7k2x').replace(/^#/, '');
export const ADMIN_HASH = `#${ADMIN_FRAGMENT}`;
