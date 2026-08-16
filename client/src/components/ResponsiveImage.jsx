import { imgSrcset } from '../lib/photos.jsx';

/**
 * ResponsiveImage — a <picture> wrapper around the generated variant pool.
 *
 * Serves AVIF → WebP → JPEG srcset (each with the same width variants), so
 * modern browsers download the smallest codec they support and old ones get
 * the JPEG fallback. Sizes are declared once on every source, and the <img>
 * carries the plain `src` too — so even a browser with no srcset support and
 * a missing variant (admin uploads, non-/images paths) degrades to a normal
 * image. Keep the layout identical to a bare <img>: pass the img's classes in
 * `imgClassName` and, if the img must fill its container, `pictureClassName`
 * (defaults to `block h-full`, which is a no-op inside auto-height parents).
 */
export default function ResponsiveImage({
  src,
  alt = '',
  sizes,
  imgClassName = '',
  pictureClassName = 'block h-full',
  loading = 'lazy',
  decoding = 'async',
  eager = false,
  fetchPriority,
  onClick,
}) {
  const jpg = imgSrcset(src);

  // No generated variants for this source (e.g. an admin upload) — plain img,
  // exactly the pre-<picture> behaviour.
  if (!jpg) {
    return <img src={src} alt={alt} className={imgClassName} loading={loading} decoding={decoding} fetchPriority={fetchPriority} onClick={onClick} />;
  }

  return (
    <picture className={pictureClassName}>
      <source type="image/avif" srcSet={imgSrcset(src, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={imgSrcset(src, 'webp')} sizes={sizes} />
      <img
        src={src}
        srcSet={jpg}
        sizes={sizes}
        alt={alt}
        className={imgClassName}
        loading={eager ? 'eager' : loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        onClick={onClick}
      />
    </picture>
  );
}
