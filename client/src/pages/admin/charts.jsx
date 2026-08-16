import { useMemo, useRef, useState } from 'react';
import { money } from '../../api.jsx';

// Hand-rolled SVG charts — no chart library, fully on-brand.
// Gold ramp for donuts/bars.
export const GOLD = ['#e6c25a', '#d4af37', '#b8942a', '#8f6f1d', '#6b5417', '#4a3a12'];
export const STATUS_COLORS = { confirmed: '#d4af37', checked_in: '#4ade80', checked_out: '#9aa4c0', cancelled: '#f87171' };

function niceCeil(v) {
  if (v <= 1) return 1;
  const pow = 10 ** Math.floor(Math.log10(v));
  const n = v / pow;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
}

function smoothPath(pts) {
  if (pts.length < 2) return pts.length ? `M ${pts[0][0]} ${pts[0][1]}` : '';
  let d = `M ${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    d += ` C ${p1[0] + (p2[0] - p0[0]) / 6} ${p1[1] + (p2[1] - p0[1]) / 6}, ${p2[0] - (p3[0] - p1[0]) / 6} ${p2[1] - (p3[1] - p1[1]) / 6}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

const shortDay = (iso) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}/${d}`;
};

/* ------------------------------ area chart -------------------------------- */
export function AreaChart({ data, height = 210, valueFmt = (v) => money(v) }) {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // index

  const W = 660;
  const H = height;
  const padX = 8;
  const padTop = 22;
  const padBottom = 30;
  const iw = W - padX * 2;
  const ih = H - padTop - padBottom;

  const { pts, lineD, areaD, grid, xTicks, niceMax } = useMemo(() => {
    if (!data.length) return { pts: [], lineD: '', areaD: '', grid: [], xTicks: [], niceMax: 1 };
    const max = Math.max(1, ...data.map((d) => d.value));
    const nm = niceCeil(max);
    const x = (i) => padX + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw);
    const y = (v) => padTop + ih - (v / nm) * ih;
    const ptsArr = data.map((d, i) => [x(i), y(d.value)]);
    const gridArr = [];
    for (let g = 0; g <= 4; g++) {
      const gy = padTop + (ih / 4) * g;
      gridArr.push({ y: gy, v: nm - (nm / 4) * g });
    }
    return {
      pts: ptsArr,
      lineD: smoothPath(ptsArr),
      areaD: `${smoothPath(ptsArr)} L ${x(data.length - 1)} ${padTop + ih} L ${x(0)} ${padTop + ih} Z`,
      grid: gridArr,
      xTicks: data.map((d, i) => (i % 5 === 0 || i === data.length - 1 ? { i, label: shortDay(d.label) } : null)).filter(Boolean),
      niceMax: nm,
    };
  }, [data, iw, ih]);

  const onMove = (e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || data.length < 2) return;
    const rel = (e.clientX - rect.left) / rect.width;
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(rel * (data.length - 1)))));
  };

  return (
    <div ref={wrapRef} className="relative" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full block">
        <defs>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d4af37" stopOpacity="0.35" />
            <stop offset="1" stopColor="#d4af37" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="areaLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#e6c25a" />
            <stop offset="1" stopColor="#b8942a" />
          </linearGradient>
        </defs>

        {grid.map((g, i) => (
          <g key={i}>
            <line x1={padX} x2={W - padX} y1={g.y} y2={g.y} stroke="rgba(148,163,184,0.14)" strokeWidth="1" />
            <text x={padX} y={g.y - 5} fill="#5f6a8a" fontSize="10">{valueFmt(g.v)}</text>
          </g>
        ))}

        {areaD && (
          <path d={areaD} fill="url(#areaFill)" className="area-fill" />
        )}
        {lineD && (
          <path d={lineD} fill="none" stroke="url(#areaLine)" strokeWidth="2.4" strokeLinecap="round" className="area-line" pathLength={1} />
        )}

        {xTicks.map((t) => (
          <text key={t.i} x={pts[t.i]?.[0]} y={H - 8} fill="#5f6a8a" fontSize="10.5" textAnchor="middle">{t.label}</text>
        ))}

        {hover !== null && pts[hover] && (
          <>
            <line x1={pts[hover][0]} x2={pts[hover][0]} y1={padTop - 6} y2={padTop + ih + 6} stroke="rgba(212,175,55,0.5)" strokeWidth="1" strokeDasharray="3 3" />
            <circle cx={pts[hover][0]} cy={pts[hover][1]} r="5" fill="#0a1128" stroke="#e6c25a" strokeWidth="2.5" />
          </>
        )}
      </svg>

      {hover !== null && data[hover] && (
        <div
          className="chart-tip"
          style={{ left: `${(pts[hover][0] / W) * 100}%` }}
        >
          <div className="chart-tip-label">{data[hover].tip || data[hover].label}</div>
          <div className="chart-tip-value">{valueFmt(data[hover].value)}</div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------- donut ---------------------------------- */
export function Donut({ segments, size = 200, thickness = 24, centerValue, centerLabel }) {
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = (size - thickness) / 2;
  const circ = 2 * Math.PI * r;
  let acc = 0;

  return (
    <div className="relative inline-block" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={thickness} />
        {segments.map((seg, i) => {
          const len = (seg.value / total) * circ;
          const el = (
            <circle
              key={seg.label + i}
              cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={seg.color} strokeWidth={thickness}
              strokeDasharray={`${len} ${circ - len}`}
              strokeDashoffset={-acc}
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
              strokeLinecap="butt"
              className="donut-seg"
              style={{ '--len': len, '--circ': circ }}
            />
          );
          acc += len;
          return el;
        })}
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center pointer-events-none">
        <div>
          <div className="font-serif text-[26px] text-cream leading-none">{centerValue}</div>
          <div className="text-[10px] tracking-[1.5px] uppercase text-dim mt-1">{centerLabel}</div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- status bars -------------------------------- */
export function StatusBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className="space-y-3.5">
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-center justify-between text-[12.5px] mb-1.5">
            <span className="text-muted flex items-center gap-2">
              <span className="w-2 h-2 rounded-full" style={{ background: r.color }} />
              {r.label}
            </span>
            <span className="font-bold text-cream">{r.value}</span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full bar-grow"
              style={{ width: `${(r.value / max) * 100}%`, background: r.color, '--barw': `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
