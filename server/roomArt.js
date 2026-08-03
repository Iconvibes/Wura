'use strict';

/* ------------------------------ room art (SVG) ----------------------------- */

const PALETTES = [
  { from: '#1c2747', to: '#0a0f20', glow: 'rgba(212,175,55,0.18)' },
  { from: '#2a2140', to: '#0d0a1a', glow: 'rgba(212,175,55,0.16)' },
  { from: '#14333c', to: '#07141a', glow: 'rgba(212,175,55,0.15)' },
  { from: '#33291a', to: '#140f06', glow: 'rgba(212,175,55,0.14)' },
  { from: '#1f3a33', to: '#0a1512', glow: 'rgba(212,175,55,0.16)' },
];

const TYPES = ['Suite', 'Penthouse', 'Deluxe', 'Standard'];

export function roomArt(i, type) {
  const p = PALETTES[i % PALETTES.length];
  const variant = TYPES.indexOf(type) >= 0 ? TYPES.indexOf(type) : i % 3;
  const G = '#d4af37';
  const stars = Array.from({ length: 18 }, (_, k) => {
    const x = 30 + ((k * 137.5) % 740);
    const y = 20 + ((k * 61.8) % 280);
    const r = 0.6 + ((k * 7) % 10) / 9;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="rgba(255,255,255,${(0.15 + (k % 4) * 0.12).toFixed(2)})"/>`;
  }).join('');

  let art;
  if (variant === 0) {
    // Bedroom scene
    art = `
      <rect x="250" y="240" width="300" height="150" rx="10" fill="none" stroke="${G}" stroke-width="2"/>
      <rect x="272" y="262" width="256" height="40" rx="6" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.4"/>
      <rect x="272" y="262" width="120" height="40" rx="6" fill="rgba(212,175,55,0.16)"/>
      <path d="M250 390 L550 390 L570 430 L230 430 Z" fill="rgba(212,175,55,0.10)" stroke="${G}" stroke-width="1.6"/>
      <line x1="250" y1="250" x2="250" y2="390" stroke="${G}" stroke-width="2"/>
      <line x1="550" y1="250" x2="550" y2="390" stroke="${G}" stroke-width="2"/>
      <circle cx="208" cy="300" r="26" fill="none" stroke="${G}" stroke-width="1.6"/>
      <path d="M192 300 a16 16 0 0 1 32 0" stroke="rgba(212,175,55,0.8)" stroke-width="1.4" fill="none"/>
      <circle cx="592" cy="300" r="26" fill="none" stroke="${G}" stroke-width="1.6"/>
      <path d="M576 300 a16 16 0 0 1 32 0" stroke="rgba(212,175,55,0.8)" stroke-width="1.4" fill="none"/>
      <ellipse cx="400" cy="468" rx="150" ry="22" fill="rgba(212,175,55,0.08)"/>
    `;
  } else if (variant === 1) {
    // Lounge / seating scene
    art = `
      <rect x="270" y="300" width="260" height="90" rx="14" fill="rgba(212,175,55,0.08)" stroke="${G}" stroke-width="2"/>
      <rect x="296" y="278" width="60" height="40" rx="10" fill="none" stroke="${G}" stroke-width="1.6"/>
      <rect x="444" y="278" width="60" height="40" rx="10" fill="none" stroke="${G}" stroke-width="1.6"/>
      <line x1="270" y1="392" x2="530" y2="392" stroke="${G}" stroke-width="2.4"/>
      <line x1="300" y1="392" x2="300" y2="414" stroke="${G}" stroke-width="1.6"/>
      <line x1="500" y1="392" x2="500" y2="414" stroke="${G}" stroke-width="1.6"/>
      <rect x="356" y="230" width="88" height="120" rx="8" fill="none" stroke="${G}" stroke-width="1.6"/>
      <circle cx="400" cy="250" r="10" fill="rgba(212,175,55,0.7)"/>
      <path d="M360 300 h80" stroke="rgba(212,175,55,0.7)" stroke-width="1.4"/>
      <ellipse cx="400" cy="440" rx="120" ry="16" fill="rgba(212,175,55,0.08)"/>
    `;
  } else {
    // Penthouse: skyline + chandelier
    art = `
      <path d="M180 480 V360 h60 v40 h70 v-80 h60 v80 h70 v-110 h60 v110 h60 v-60 h70 v220 Z" fill="none" stroke="rgba(212,175,55,0.55)" stroke-width="1.4"/>
      <line x1="400" y1="120" x2="400" y2="220" stroke="${G}" stroke-width="1.6"/>
      <line x1="400" y1="220" x2="340" y2="250" stroke="${G}" stroke-width="1.4"/>
      <line x1="400" y1="220" x2="460" y2="250" stroke="${G}" stroke-width="1.4"/>
      <line x1="400" y1="220" x2="400" y2="252" stroke="${G}" stroke-width="1.4"/>
      <circle cx="340" cy="250" r="5" fill="rgba(212,175,55,0.9)"/>
      <circle cx="460" cy="250" r="5" fill="rgba(212,175,55,0.9)"/>
      <circle cx="400" cy="252" r="5" fill="rgba(212,175,55,0.9)"/>
      <rect x="318" y="300" width="164" height="96" rx="8" fill="none" stroke="${G}" stroke-width="1.8"/>
      <rect x="340" y="320" width="60" height="36" rx="4" fill="rgba(212,175,55,0.12)"/>
    `;
  }

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560" preserveAspectRatio="xMidYMid slice">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${p.from}"/>
        <stop offset="1" stop-color="${p.to}"/>
      </linearGradient>
      <radialGradient id="glow" cx="0.5" cy="0.42" r="0.55">
        <stop offset="0" stop-color="${p.glow}"/>
        <stop offset="1" stop-color="rgba(0,0,0,0)"/>
      </radialGradient>
    </defs>
    <rect width="800" height="560" fill="url(#bg)"/>
    <rect width="800" height="560" fill="url(#glow)"/>
    ${stars}
    <text x="40" y="70" font-family="Georgia, serif" font-size="30" fill="rgba(212,175,55,0.85)" letter-spacing="6">W</text>
    <circle cx="400" cy="140" r="4" fill="rgba(212,175,55,0.5)"/>
    <circle cx="392" cy="132" r="2" fill="rgba(255,255,255,0.6)"/>
    <circle cx="408" cy="148" r="1.6" fill="rgba(255,255,255,0.45)"/>
    ${art}
    <rect x="0" y="0" width="800" height="560" fill="none" stroke="rgba(212,175,55,0.35)" stroke-width="1"/>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}
