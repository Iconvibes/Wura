import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

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
 */
export default function ViewTransitionProvider({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const supported = typeof document !== 'undefined' && 'startViewTransition' in document;

  useEffect(() => {
    if (!supported) return;

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
      if (document.startViewTransition) {
        document.startViewTransition(() => {
          navigate(to);
        });
      } else {
        navigate(to);
      }
    };

    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate, location.pathname, location.search, supported]);

  return children;
}
