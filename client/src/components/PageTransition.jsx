import { useLocation } from 'react-router-dom';

// Re-mounts the route content on every pathname change so each navigation
// plays the page-enter animation (fade + rise). Query-string changes (e.g.
// /rooms?checkIn=…) and hash anchors do NOT retrigger it — only real pages do.
//
// On browsers with the View Transitions API, ViewTransitionProvider wraps the
// navigation in document.startViewTransition(), so the browser's native
// out-and-in crossfade plays on top of this enter animation (which doubles as
// the sole motion in browsers without the API). They layer, never conflict.
export default function PageTransition({ children }) {
  const location = useLocation();
  return (
    <div key={location.pathname} className="page-enter">
      {children}
    </div>
  );
}
