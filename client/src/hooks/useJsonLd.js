import { useEffect } from 'react';

// Injects (or updates) a <script type="application/ld+json">#id in the head.
// Passing null removes it — so stale structured data never survives a route change.
export function useJsonLd(id, value) {
  useEffect(() => {
    let el = document.getElementById(id);
    if (value === null || value === undefined) {
      if (el) el.remove();
      return;
    }
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.id = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(value);
    return () => el?.remove();
  }, [id, value]);
}
