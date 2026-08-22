import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { usePageMeta } from './usePageMeta.jsx';

function Probe({ title, desc, image, preload, preloadSizes }) {
  usePageMeta(title, desc, image, preload, preloadSizes);
  return null;
}

describe('usePageMeta', () => {
  it('sets title, description, Open Graph and Twitter card tags', () => {
    render(
      <Probe
        title="Deluxe King — De Wura & Alfred Exotic Place Hotel"
        desc="Wake to the gardens from your private balcony."
        image="/images/rooms/deluxe-king-1.jpg"
      />
    );

    expect(document.title).toBe('Deluxe King — De Wura & Alfred Exotic Place Hotel');
    expect(document.querySelector('meta[name="description"]').content).toBe(
      'Wake to the gardens from your private balcony.'
    );

    // Canonical matches the prerendered link (origin + pathname, no query).
    expect(document.querySelector('link[rel="canonical"]').href).toBe(
      window.location.origin + window.location.pathname
    );

    // Open Graph
    expect(document.querySelector('meta[property="og:type"]').content).toBe('website');
    expect(document.querySelector('meta[property="og:site_name"]').content).toBe('De Wura & Alfred Exotic Place Hotel');
    expect(document.querySelector('meta[property="og:locale"]').content).toBe('en_US');
    expect(document.querySelector('meta[property="og:title"]').content).toBe('Deluxe King — De Wura & Alfred Exotic Place Hotel');
    expect(document.querySelector('meta[property="og:description"]').content).toBe(
      'Wake to the gardens from your private balcony.'
    );
    expect(document.querySelector('meta[property="og:url"]').content).toBe(
      window.location.origin + window.location.pathname
    );
    // Images are absolute URLs — social platforms reject relative og:image.
    expect(document.querySelector('meta[property="og:image"]').content).toBe(
      new URL('/images/rooms/deluxe-king-1.jpg', window.location.origin).href
    );

    // Twitter card
    expect(document.querySelector('meta[name="twitter:card"]').content).toBe('summary_large_image');
    expect(document.querySelector('meta[name="twitter:title"]').content).toBe('Deluxe King — De Wura & Alfred Exotic Place Hotel');
    expect(document.querySelector('meta[name="twitter:description"]').content).toBe(
      'Wake to the gardens from your private balcony.'
    );
    expect(document.querySelector('meta[name="twitter:image"]').content).toBe(
      new URL('/images/rooms/deluxe-king-1.jpg', window.location.origin).href
    );
  });

  it('updates existing tags on navigation instead of duplicating them', () => {
    const { rerender } = render(<Probe title="First page" desc="One" image="/images/hero.jpg" />);
    rerender(<Probe title="Second page" desc="Two" image="/images/pool.jpg" />);

    expect(document.querySelectorAll('meta[property="og:title"]')).toHaveLength(1);
    expect(document.querySelectorAll('meta[name="twitter:title"]')).toHaveLength(1);
    expect(document.querySelector('meta[property="og:title"]').content).toBe('Second page');
    expect(document.querySelector('meta[property="og:image"]').content).toBe(
      new URL('/images/pool.jpg', window.location.origin).href
    );
    expect(document.querySelector('meta[name="twitter:image"]').content).toBe(
      new URL('/images/pool.jpg', window.location.origin).href
    );
    // Canonical is a single link, refreshed on navigation.
    expect(document.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
    expect(document.querySelector('link[rel="canonical"]').href).toBe(
      window.location.origin + window.location.pathname
    );
  });

  it('defaults to the home social card when no image is given', () => {
    render(<Probe title="Some page" desc="About it" />);
    expect(document.querySelector('meta[property="og:image"]').content).toBe(
      new URL('/social/home.png', window.location.origin).href
    );
  });

  it('preloads the hero AVIF variant with the matching sizes', () => {
    render(
      <Probe
        title="Rooms & Suites"
        desc="Pick a room"
        image="/social/rooms.png"
        preload="/images/rooms/suite.jpg"
        preloadSizes="100vw"
      />
    );
    const link = document.querySelector('link[data-page-meta="preload"]');
    expect(link).not.toBeNull();
    expect(link.rel).toBe('preload');
    expect(link.getAttribute('as')).toBe('image');
    expect(link.getAttribute('type')).toBe('image/avif');
    // href = largest AVIF candidate (preload fallback for no-imagesrcset browsers)
    expect(link.getAttribute('href')).toBe('/images/rooms/resp/suite-1200.avif');
    expect(link.getAttribute('imagesrcset')).toContain('/images/rooms/resp/suite-480.avif 480w');
    expect(link.getAttribute('imagesrcset')).toContain('suite-1200.avif 1200w');
    expect(link.getAttribute('imagesizes')).toBe('100vw');
  });

  it('updates the preload on navigation and removes it when there is nothing to preload', () => {
    const { rerender } = render(
      <Probe title="Home" desc="Hero" image="/social/home.png" preload="/images/hero.jpg" />
    );
    expect(document.querySelectorAll('link[data-page-meta="preload"]')).toHaveLength(1);
    expect(document.querySelector('link[data-page-meta="preload"]').getAttribute('href')).toBe(
      '/images/resp/hero-1200.avif'
    );

    rerender(<Probe title="Another" desc="x" image="/social/about.png" preload="/images/exterior.jpg" />);
    const links = document.querySelectorAll('link[data-page-meta="preload"]');
    expect(links).toHaveLength(1); // updated, not duplicated
    expect(links[0].getAttribute('href')).toBe('/images/resp/exterior-1200.avif');

    // A route with no hero (e.g. NotFound) must drop the stale hint.
    rerender(<Probe title="404" desc="gone" image="/social/home.png" />);
    expect(document.querySelector('link[data-page-meta="preload"]')).toBeNull();
  });
});
