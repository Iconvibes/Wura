import { useEffect, useRef } from 'react';

// Adds .visible when scrolled into view (mirrors the vanilla .reveal system).
// variant: 'up' (default) | 'left' | 'right' | 'zoom' | 'flip' | 'none'
export default function Reveal({ children, className = '', delay = 0, variant = 'up', as: Tag = 'div' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.classList.add('visible'); return; }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('visible'); io.unobserve(e.target); }
        });
      },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const variantClass = variant && variant !== 'up' ? `reveal-${variant}` : '';

  return (
    <Tag ref={ref} className={`reveal ${variantClass} ${className}`} style={{ transitionDelay: delay ? `${delay * 90}ms` : undefined }}>
      {children}
    </Tag>
  );
}
