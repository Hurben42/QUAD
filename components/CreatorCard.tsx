'use client';
import { useId } from 'react';
import { CREATOR_FEE, ERA_WIDTHS, pct } from '@/lib/curve';
import { ArtScene } from './CreatorsArt';

/**
 * A creator's position as a card, in the format of an on-chain LP position NFT: the brand-vertical gradient,
 * text running round the border, the creators scene, the era bar and mono pills. QUAD's own design.
 */
export type CreatorCardProps = {
  symbol: string;
  pool: string;
  era: 1 | 2 | 3 | 4;
  /** 0 → 1, quote raised / threshold */
  progress: number;
  /** unclaimed creator fees, already formatted ("0.8125") */
  claimable: string;
  /** total earned, when known (the sample shows it; on-chain pools only expose what is unclaimed) */
  earned?: string;
  sample?: boolean;
};

const W = 290;
const H = 500;
const short = (s: string) => (s.length > 10 ? `${s.slice(0, 4)}…${s.slice(-4)}` : s);
// Width of a mono pill for its text at 11px (JetBrains Mono advances ~0.6em)
const pillWidth = (text: string) => Math.round(text.length * 6.7 + 22);

// One lap of the running-text frame (inset 12, radius 26): each copy of the text is stretched to exactly this
const RUN_INSET = 12;
const RUN_RADIUS = 26;
const RUN_LENGTH = Math.round(2 * (W - 2 * RUN_INSET - 2 * RUN_RADIUS) + 2 * (H - 2 * RUN_INSET - 2 * RUN_RADIUS) + 2 * Math.PI * RUN_RADIUS);

/** Rounded-rect path, clockwise from the top-left corner's end, for the running border text. */
function framePath(x: number, y: number, w: number, h: number, r: number) {
  return `M${x + r},${y} H${x + w - r} A${r},${r} 0 0 1 ${x + w},${y + r} V${y + h - r} A${r},${r} 0 0 1 ${x + w - r},${y + h} H${x + r} A${r},${r} 0 0 1 ${x},${y + h - r} V${y + r} A${r},${r} 0 0 1 ${x + r},${y} Z`;
}

export function CreatorCard({ symbol, pool, era, progress, claimable, earned, sample }: CreatorCardProps) {
  const id = `cc${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const ink = `url(#${id}-ink)`;
  const ticker = `$${symbol}`;
  const run = `QUAD • ${ticker}/HYPE • CREATOR ${pct(CREATOR_FEE)} OF EVERY TRADE • PAID IN HYPE • POOL ${short(pool)} • ERA ${era} OF 4 • `;
  const pills = [`Pool: ${short(pool)}`, `Era: ${era} / 4 · ${Math.round(progress * 100)}%`, ...(earned ? [`Earned: ${earned} HYPE`] : []), `Claimable: ${claimable} HYPE`];
  const total = ERA_WIDTHS.reduce((a, b) => a + b, 0);
  const barX = 40;
  const barW = W - 80;

  return (
    <svg className="cc" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${sample ? 'Sample creator card' : 'Creator card'}: ${ticker}/HYPE, era ${era} of 4, ${claimable} HYPE claimable`}>
      <defs>
        <clipPath id={`${id}-clip`}><rect width={W} height={H} rx="36" /></clipPath>
        <path id={`${id}-run`} d={framePath(RUN_INSET, RUN_INSET, W - 2 * RUN_INSET, H - 2 * RUN_INSET, RUN_RADIUS)} />
        <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" stitchTiles="stitch" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .14 0" />
        </filter>
        {/* brand-vertical, blue to ember, like the landing's Launch yours block */}
        <linearGradient id={`${id}-bg`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="var(--era-1)" />
          <stop offset=".38" stopColor="var(--era-2)" />
          <stop offset=".7" stopColor="var(--era-3)" />
          <stop offset="1" stopColor="var(--era-4)" />
        </linearGradient>
        {/* text on brand-vertical: white over the blue half, ink over the ember half (BRAND.md) */}
        <linearGradient id={`${id}-ink`} x1="0" y1="0" x2="0" y2={H} gradientUnits="userSpaceOnUse">
          <stop offset=".5" stopColor="var(--on-era-1)" />
          <stop offset=".62" stopColor="var(--on-era-4)" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="40%" r="60%">
          <stop offset="0" stopColor="var(--on-era-1)" stopOpacity=".22" />
          <stop offset="1" stopColor="var(--on-era-1)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g clipPath={`url(#${id}-clip)`}>
        <rect width={W} height={H} fill={`url(#${id}-bg)`} />
        <rect className="cc-glow" width={W} height={H} fill={`url(#${id}-glow)`} />
        <rect width={W} height={H} filter={`url(#${id}-grain)`} />

        {/* the running border, two copies half a lap apart so it never shows a gap */}
        <text className="cc-run" fill={ink}>
          <textPath href={`#${id}-run`} startOffset="-100%" textLength={RUN_LENGTH} lengthAdjust="spacing">{run.repeat(2)}<animate attributeName="startOffset" from="-100%" to="0%" dur="30s" repeatCount="indefinite" /></textPath>
          <textPath href={`#${id}-run`} startOffset="0%" textLength={RUN_LENGTH} lengthAdjust="spacing">{run.repeat(2)}<animate attributeName="startOffset" from="0%" to="100%" dur="30s" repeatCount="indefinite" /></textPath>
        </text>
        <rect x="24" y="24" width={W - 48} height={H - 48} rx="20" fill="none" stroke={ink} strokeOpacity=".28" />

        <text x="40" y="66" className="cc-title" fill={ink}>{ticker}/HYPE</text>
        <text x="40" y="88" className="cc-sub" fill={ink}>CREATOR {pct(CREATOR_FEE)}{sample ? ' · SAMPLE' : ''}</text>

        <ArtScene id={id} x={28} y={98} width={W - 56} height={(W - 56) * (540 / 640)} />

        {/* era bar: widths 8/4/2/1, filled to the progress */}
        <g transform={`translate(0 ${306})`}>
          {ERA_WIDTHS.reduce<{ x: number; els: React.ReactNode[] }>(
            (acc, w, i) => {
              const segW = (w / total) * (barW - 9);
              const from = i * 0.25;
              const fill = Math.max(0, Math.min(1, (progress - from) / 0.25));
              acc.els.push(
                <g key={i}>
                  <rect x={acc.x} y="0" width={segW} height="6" rx="3" fill={ink} fillOpacity=".22" />
                  {fill > 0 && <rect x={acc.x} y="0" width={segW * fill} height="6" rx="3" fill={ink} />}
                </g>,
              );
              acc.x += segW + 3;
              return acc;
            },
            { x: barX, els: [] },
          ).els}
        </g>

        {pills.map((p, i) => (
          <g key={p} transform={`translate(40 ${328 + i * 32})`}>
            <rect width={pillWidth(p)} height="24" rx="8" className="cc-pill" />
            <text x="11" y="16" className="cc-pill-text">{p}</text>
          </g>
        ))}

        <g transform={`translate(${W - 40 - 44} 38)`}>
          <rect width="44" height="44" rx="12" className="cc-pill" />
          <image href="/brand/hyperliquid-blob-green.svg" x="8" y="8" width="28" height="28" />
        </g>
      </g>
    </svg>
  );
}
