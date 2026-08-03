// Client-side deterministic room art (mirrors server/roomArt.js) used for the
// hero card and gallery so those render without external images.

const PALETTES = [
  ['#1c2747', '#0a0f20'],
  ['#2a2140', '#0d0a1a'],
  ['#14333c', '#07141a'],
  ['#33291a', '#140f06'],
  ['#1f3a33', '#0a1512'],
];

export function roomArtFor(i, type) {
  const p = PALETTES[i % PALETTES.length];
  const G = '#d4af37';
  const stars = Array.from({ length: 14 }, (_, k) => {
    const x = 30 + ((k * 137.5) % 740);
    const y = 20 + ((k * 61.8) % 240);
    const r = 0.6 + ((k * 7) % 10) / 9;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(255,255,255,${(0.14 + (k % 4) * 0.12).toFixed(2)})"/>`;
  }).join('');
  const art = `
    <rect x="250" y="240" width="300" height="150" rx="10" fill="none" stroke="${G}" stroke-width="2"/>
    <rect x="272" y="262" width="256" height="40" rx="6" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.4"/>
    <rect x="272" y="262" width="120" height="40" rx="6" fill="rgba(212,175,55,0.16)"/>
    <path d="M250 390 L550 390 L570 430 L230 430 Z" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.6"/>
    <ellipse cx="400" cy="468" rx="150" ry="22" fill="rgba(212,175,55,0.08)"/>
    <line x1="250" y1="250" x2="250" y2="390" stroke="${G}" stroke-width="2"/>
    <line x1="550" y1="250" x2="550" y2="390" stroke="${G}" stroke-width="2"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient></defs>
    <rect width="800" height="560" fill="url(#g)"/>${stars}${art}
    <rect x="0" y="0" width="800" height="560" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1"/></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
