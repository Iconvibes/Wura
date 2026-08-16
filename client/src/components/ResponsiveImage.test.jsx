import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import ResponsiveImage from './ResponsiveImage.jsx';

describe('ResponsiveImage', () => {
  it('serves avif → webp → jpeg sources with matching sizes', () => {
    const { container } = render(<ResponsiveImage src="/images/rooms/classic-queen-1.jpg" sizes="(min-width: 1024px) 33vw, 100vw" alt="Classic Queen" />);
    const pic = container.querySelector('picture');
    const sources = pic.querySelectorAll('source');
    expect(sources.length).toBe(2);
    expect(sources[0].type).toBe('image/avif');
    expect(sources[0].srcset).toContain('.avif 480w');
    expect(sources[1].type).toBe('image/webp');
    expect(sources[1].srcset).toContain('.webp 1200w');
    for (const s of sources) expect(s.sizes).toBe('(min-width: 1024px) 33vw, 100vw');

    const img = pic.querySelector('img');
    expect(img.getAttribute('src')).toBe('/images/rooms/classic-queen-1.jpg');
    expect(img.srcset).toContain('.jpg 480w');
    expect(img.sizes).toBe('(min-width: 1024px) 33vw, 100vw');
    expect(img.alt).toBe('Classic Queen');
  });

  it('honours eager + fetchPriority and passes classes through', () => {
    const { container } = render(
      <ResponsiveImage
        src="/images/hero.jpg"
        sizes="100vw"
        alt=""
        eager
        fetchPriority="high"
        pictureClassName="block h-full"
        imgClassName="w-full h-full object-cover"
      />
    );
    const img = container.querySelector('img');
    expect(img.getAttribute('loading')).toBe('eager');
    expect(img.getAttribute('fetchpriority')).toBe('high');
    expect(img.className).toBe('w-full h-full object-cover');
    expect(container.querySelector('picture').className).toBe('block h-full');
  });

  it('renders a plain <img> when the source has no generated variants (admin uploads)', () => {
    const { container } = render(<ResponsiveImage src="/images/uploads/custom.png" sizes="100px" alt="Uploaded" />);
    expect(container.querySelector('picture')).toBeNull();
    const img = container.querySelector('img');
    expect(img.getAttribute('src')).toBe('/images/uploads/custom.png');
    expect(img.getAttribute('srcset')).toBeNull();
  });
});
