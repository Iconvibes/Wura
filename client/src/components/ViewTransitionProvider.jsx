import { useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { transitionDirection, VT_DIRECTION_CLASS } from '../lib/transitionDirection.jsx';

/**
 * Layered route transitions: when the browser supports the View Transitions
 * API (Chromium 111+, Safari 18+, Firefox 140+), internal anchor navigations
 * get a true out-and-in crossfade via document.startViewTransition() — the
 * old page is captured, the new page mounts, and the browser crossfades
 * between the two. The CSS .page-enter fallback still plays underneath (and
 * is the only motion in older browsers), so the two never conflict.
 *
 * This exists because react-router-dom 6.30's typed `viewTransition` prop is
 * silently dropped by the installed @remix-run/router — a document-level
 * interceptor is the reliable way to opt every nav link in.
 *
 * Timing note: the browser captures the "new" snapshot as soon as the update
 * callback's promise resolves, while React commits the new route
 * asynchronously. If the callback returns before that commit, old and new
 * snapshots are identical and the browser skips the crossfade entirely — so
 * the route change is forced to commit synchronously with flushSync. (An
 * await/requestAnimationFrame wait would be the obvious alternative, but
 * Chromium does not dispatch rAF while a view transition is active — it
 * deadlocks the transition.)
 */
export default function ViewTransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const supported = typeof document !== 'undefined' && 'startViewTransition' in document;
  const reducedMotion =
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  useEffect(() => {
    if (!supported) return;

    // Brand signature: a full-viewport gold veil joins the native transition
    // as its own snapshot (view-transition-name: vt-veil). It's transparent in
    // the live DOM, but its ::view-transition-new snapshot animates a soft
    // gold sweep that fades as it travels — a quiet "Wura" moment on every
    // route change. Reduced-motion users skip it entirely (the CSS also
    // hides the element as a backstop).
    const veil = document.createElement('div');
    veil.className = 'vt-veil';
    veil.setAttribute('aria-hidden', 'true');
    const veilIn = () => document.body.appendChild(veil);
    const veilOut = () => { if (veil.parentNode) veil.parentNode.removeChild(veil); };

    const onClick = (e) => {
      // Only plain left-clicks without modifier keys.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = e.target.closest && e.target.closest('a[href]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      if (anchor.target && anchor.target !== '_self') return;

      // Build the absolute destination and skip external / same-page links.
      const dest = new URL(href, window.location.origin);
      if (dest.origin !== window.location.origin) return;
      const to = dest.pathname + dest.search;
      if (to === location.pathname + location.search) return;

      // Take over this click: navigate inside a native crossfade. React
      // Router's Link handler does NOT honour defaultPrevented and would
      // navigate a second time, so stop the event from ever reaching it.
      e.preventDefault();
      e.stopImmediatePropagation();

      // Direction-aware: deeper routes slide in from the right, back from
      // the left. Recorded on <html> before the transition: the direction
      // class drives the ::view-transition keyframes, and the active class
      // tells PageTransition to suppress the CSS fallback (no double-move)
      // while the native crossfade runs.
      const dir = transitionDirection(location.pathname, to);
      const html = document.documentElement;
      html.classList.remove(VT_DIRECTION_CLASS + '-forward', VT_DIRECTION_CLASS + '-back');
      html.classList.add(VT_DIRECTION_CLASS + '-' + dir);

      if (document.startViewTransition) {
        html.classList.add(VT_DIRECTION_CLASS + '-active');
        let transition;
        try {
          transition = document.startViewTransition(() => {
            if (!reducedMotion) veilIn(); // gold veil snapshot — removed when the sweep ends
            // Commit the route change synchronously so the browser's "new"
            // snapshot (captured right after this callback) shows the new
            // page — otherwise old === new and the crossfade is skipped.
            flushSync(() => navigate(to));
          });
        } catch {
          // A transition may already be running (rapid double-click) — fall
          // back to a plain navigation rather than dropping the click.
          html.classList.remove(VT_DIRECTION_CLASS + '-active');
          navigate(to);
          return;
        }
        // Clear the suppression flag as soon as the DOM swap is committed
        // (updateCallbackDone), so the freshly mounted page plays its normal
        // enter animation once the crossfade finishes — .finished would leave
        // it suppressed for the whole animation duration. The veil, however,
        // stays until .finished so its sweep animation completes.
        transition.updateCallbackDone.then(() => {
          html.classList.remove(VT_DIRECTION_CLASS + '-active');
        }, () => {
          html.classList.remove(VT_DIRECTION_CLASS + '-active');
        });
        transition.finished.then(veilOut, veilOut);
        transition.finished.catch(() => {}); // never unhandled
      } else {
        navigate(to);
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate, location.pathname, location.search, supported, reducedMotion]);

  return children;
}
