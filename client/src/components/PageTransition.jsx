import { useLocation, useNavigationType } from 'react-router-dom';
import { VT_DIRECTION_CLASS } from '../lib/transitionDirection.jsx';

// History index: a fresh page load sits at index 0 (nothing behind it — the
// plain fade+rise), and any POP back/forward that returns to a pushed entry
// sits above 0 (slide in from the left). Reading the browser's history state
// is render-safe and immune to StrictMode double-invokes.
function historyIdx() {
  try {
    const idx = window.history.state && window.history.state.idx;
    return typeof idx === 'number' ? idx : 0;
  } catch {
    return 0;
  }
}

// Re-mounts the route content on every pathname change so each navigation
// plays the page-enter animation — direction-aware: PUSH/REPLACE navigations
// (link clicks, redirects) slide the new page in from the right (deeper into
// the site), POP (browser back/forward) from the left (back). The initial
// paint (history index 0, no prior page) plays the plain fade+rise.
//
// While a native view transition is running, the ViewTransitionProvider marks
// <html> with VT_DIRECTION_CLASS + '-active' — the browser's out-and-in slide
// fully owns the motion and the fallback is suppressed so the two never
// double-move. In older browsers (no API) this fallback is the sole motion.
export default function PageTransition({ children }) {
  const location = useLocation();
  const navType = useNavigationType();
  const isBack = navType === 'POP' && historyIdx() > 0;

  const active = typeof document !== 'undefined' && document.documentElement.classList.contains(`${VT_DIRECTION_CLASS}-active`);
  const cls = active ? '' : isBack ? 'page-enter page-enter-back' : 'page-enter';

  return (
    <div key={location.pathname} id="page-transition" className={cls}>
      {children}
    </div>
  );
}
