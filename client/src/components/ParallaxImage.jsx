import { useParallax } from '../hooks/useParallax.jsx';
import ResponsiveImage from './ResponsiveImage.jsx';

/**
 * ParallaxImage — an image that drifts as its container scrolls through the
 * viewport. The transform is applied to an inner layer, so the image keeps its
 * own transform (hover zoom, ken-burns) without conflicts.
 * `sizes` reflects the rendered width (default: a 40vw mid-page block) so the
 * browser picks the right variant.
 */
export default function ParallaxImage({ src, alt = '', speed = 0.1, className = '', imgClassName = '', sizes = '(min-width: 1024px) 40vw, 100vw' }) {
  const ref = useParallax(speed, 0.14); // wrapper is inset -14% on the vertical axis
  return (
    <div className={`parallax-img ${className}`} aria-hidden={!alt}>
      <div ref={ref} className="parallax-img-inner">
        <ResponsiveImage src={src} sizes={sizes} alt={alt} loading="lazy" imgClassName={imgClassName} />
      </div>
    </div>
  );
}
