import { useEffect, useRef } from 'react';

/**
 * useParallax — gently translates an element (an image larger than its parent)
 * as the parent scrolls through the viewport: below the viewport center the
 * element sits lower, above it higher — the classic slow-background parallax.
 *
 * @param {number} speed           0 = static. Higher = more drift (0.05–0.4).
 * @param {number} maxShiftRatio   Max shift as a fraction of the PARENT height.
 *                                 Should match the wrapper's vertical inset so
 *                                 the image edge never becomes visible.
 * @returns a ref to attach to the moving element.
 */
export function useParallax(speed = 0.15, maxShiftRatio = 0.2) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === 'undefined') return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const parent = el.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      const fromCenter = rect.top + rect.height / 2 - window.innerHeight / 2;
      const parentH = parent.offsetHeight || rect.height;
      const maxShift = Math.max(24, parentH * maxShiftRatio);
      const y = Math.max(-maxShift, Math.min(maxShift, fromCenter * speed));
      el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
    };

    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [speed, maxShiftRatio]);

  return ref;
}
