import { useEffect, useRef, useState } from 'react';

// Pull-to-refresh for the mobile inbox. Attaches native (non-passive) touch
// listeners to the container so the pull can preventDefault the browser's
// native overscroll; on release past the threshold it calls onRefresh.
const MAX_PULL = 88;      // indicator cap in px
const THRESHOLD = 60;     // px of pull required to trigger refresh
const RESIST = 0.5;       // pull = finger travel × this, so it feels springy

/**
 * @param {object} opts
 * @param {boolean} opts.enabled  gate — gestures only attach when truthy
 * @param {() => Promise<void>} opts.onRefresh  called when released past threshold
 * @returns {{ containerRef, pull, refreshing }}
 *   containerRef — attach to the scrollable list element
 *   pull        — current indicator height in px (0 when idle)
 *   refreshing  — true while onRefresh() is in flight
 */
export function usePullToRefresh({ enabled, onRefresh }) {
  const containerRef = useRef(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Refs mirror state so the native listeners never close over stale values.
  const refreshingRef = useRef(false);
  const pullRef = useRef(0);
  const startY = useRef(null);
  const dragging = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled) return undefined;
    const el = containerRef.current;
    if (!el) return undefined;

    const setPullBoth = (px) => {
      pullRef.current = px;
      setPull(px);
    };

    const onStart = (e) => {
      if (refreshingRef.current) return;
      // Only at the very top of the page (mobile: the window scrolls).
      if (window.scrollY > 0) return;
      if (e.touches.length !== 1) return;
      startY.current = e.touches[0].clientY;
      dragging.current = false;
    };

    const onMove = (e) => {
      if (startY.current == null) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        if (dragging.current) setPullBoth(0);
        return;
      }
      // Small dead zone so ordinary taps/scrolls aren't hijacked.
      if (!dragging.current && dy < 12) return;
      dragging.current = true;
      e.preventDefault();
      setPullBoth(Math.min(MAX_PULL, dy * RESIST));
    };

    const onEnd = async () => {
      if (startY.current == null) return;
      startY.current = null;
      if (!dragging.current) return;
      dragging.current = false;
      if (pullRef.current >= THRESHOLD) {
        refreshingRef.current = true;
        setRefreshing(true);
        setPullBoth(42); // indicator stays visible while the fetch runs
        try {
          await onRefreshRef.current();
        } finally {
          refreshingRef.current = false;
          setRefreshing(false);
          setPullBoth(0);
        }
      } else {
        setPullBoth(0);
      }
    };

    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    el.addEventListener('touchend', onEnd);
    el.addEventListener('touchcancel', onEnd);
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
      el.removeEventListener('touchend', onEnd);
      el.removeEventListener('touchcancel', onEnd);
    };
  }, [enabled]);

  return { containerRef, pull, refreshing };
}
