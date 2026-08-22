import { useEffect } from 'react';
import { imgSrcset } from '../lib/photos.jsx';

// Sets the document title, meta description, Open Graph / Twitter card tags
// and the hero LCP <link rel=preload> per page (SPA-friendly SEO + rich link
// previews + faster first paint). `image` is a path like '/social/home.png' —
// it is emitted as an absolute URL, as social platforms require. Pages pass a
// purpose-built 1200×630 branded card; the fallback is the home card.
const SITE_NAME = 'De Wura & Alfred Exotic Place Hotel';
const DEFAULT_IMAGE = '/social/home.png';
const PRELOAD_SEL = 'link[data-page-meta="preload"]';

function absolute(url) {
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

/** Create-or-update a <meta> tag, keyed by name OR property (both are used). */
function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

/** Create-or-update a <link> tag (e.g. rel="canonical"). */
function setLink(rel, href) {
  let el = document.head.querySelector(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

/**
 * Create-or-update the hero preload link (it also exists statically in
 * index.html so the very first paint starts the fetch before JS parses — the
 * hook keeps it pointing at the CURRENT route's hero, AVIF preferred).
 * `href` is the largest AVIF candidate: browsers with imagesrcset support
 * pick the right width, older ones preload the full-size fallback.
 */
function setPreload(src, sizes) {
  let el = document.head.querySelector(PRELOAD_SEL);
  const srcset = imgSrcset(src, 'avif');
  if (!srcset) {
    if (el) el.remove(); // no generated variants — drop the stale hint
    return;
  }
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'preload');
    el.setAttribute('as', 'image');
    el.setAttribute('type', 'image/avif');
    el.setAttribute('data-page-meta', 'preload');
    document.head.appendChild(el);
  }
  const largest = srcset.split(', ').pop().split(' ')[0];
  el.setAttribute('href', largest);
  el.setAttribute('imagesrcset', srcset);
  el.setAttribute('imagesizes', sizes);
}

export function usePageMeta(title, description, image = DEFAULT_IMAGE, preload, preloadSizes = '100vw') {
  // pathname drives the canonical/og:url, so it belongs in the deps — two pages
  // with identical title/description/image must still refresh the canonical.
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  useEffect(() => {
    document.title = title;
    const img = absolute(image);
    const url = window.location.origin + window.location.pathname;

    setMeta('name', 'description', description);
    setLink('canonical', url); // matches the prerendered <link rel="canonical">
    setPreload(preload, preloadSizes); // LCP hero — starts before the bundle parses

    // Open Graph
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', SITE_NAME);
    setMeta('property', 'og:locale', 'en_US');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);

    // Twitter card
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);
  }, [title, description, image, preload, preloadSizes, pathname]);
}
