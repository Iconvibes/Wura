import { useParallax } from '../hooks/useParallax.js';

/**
 * ParallaxImage — an image that drifts as its container scrolls through the
 * viewport. The transform is applied to an inner layer, so the <img> keeps its
 * own transform (hover zoom, ken-burns) without conflicts.
 */
export default function ParallaxImage({ src, alt = '', speed = 0.1, className = '', imgClassName = '' }) {
  const ref = useParallax(speed, 0.14); // wrapper is inset -14% on the vertical axis
  return (
    <div className={`parallax-img ${className}`} aria-hidden={!alt}>
      <div ref={ref} className="parallax-img-inner">
        <img src={src} alt={alt} loading="lazy" className={imgClassName} />
      </div>
    </div>
  );
}
