/**
 * A coin's generated portrait, for coins launched without an image: its era's colour fading to
 * the next, the halftone and ring of the token cards, its initial in ink. Deterministic from the
 * name, drawn inline so it uses the theme's tokens, never a colour of its own.
 */
const hash = (s: string) => [...s].reduce((h, ch) => (h * 31 + ch.charCodeAt(0)) >>> 0, 7);

export function CoinAvatar({ name, era, className }: { name: string; era: 1 | 2 | 3 | 4; className?: string }) {
  const h = hash(name);
  const next = Math.min(4, era + 1) as 1 | 2 | 3 | 4;
  const initial = (name.replace(/[^A-Za-z0-9]/g, '')[0] ?? 'Q').toUpperCase();
  const ringX = 300 + (h % 80);
  const ringY = 90 + ((h >> 4) % 70);
  const tilt = 20 + ((h >> 8) % 50);
  const id = `ca-${h.toString(36)}`;
  return (
    <svg viewBox="0 0 400 500" className={className} role="img" aria-label={`${name} portrait`} style={{ ['--era' as string]: `var(--era-${era})`, ['--on' as string]: `var(--on-era-${era})` }}>
      <defs>
        <linearGradient id={`${id}-g`} gradientTransform={`rotate(${tilt} .5 .5)`}>
          <stop offset="0" stopColor={`var(--era-${era})`} />
          <stop offset="1" stopColor={`var(--era-${next})`} />
        </linearGradient>
        <pattern id={`${id}-d`} width="12" height="12" patternUnits="userSpaceOnUse" patternTransform={`translate(${h % 12} ${(h >> 3) % 12})`}>
          <circle cx="6" cy="6" r="1.7" fill={`var(--on-era-${era})`} opacity=".28" />
        </pattern>
      </defs>
      <rect width="400" height="500" fill={`url(#${id}-g)`} />
      <rect width="400" height="500" fill={`url(#${id}-d)`} />
      <circle cx={ringX} cy={ringY} r="130" fill="none" stroke={`var(--on-era-${era})`} strokeOpacity=".4" strokeWidth="2" />
      <circle cx={ringX} cy={ringY} r="152" fill="none" stroke={`var(--on-era-${era})`} strokeOpacity=".1" strokeWidth="22" />
      <text x="32" y="452" fontFamily="var(--font-mono)" fontWeight="600" fontSize="230" letterSpacing="-14" fill={`var(--on-era-${era})`}>{initial}</text>
    </svg>
  );
}
