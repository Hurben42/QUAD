/** The QUAD mark (owner's original, vectorised) + the word. Never deform the mark; keep the 4:5 ratio. */
export function QuadMark({ height = 24, fill = 'gradient' as 'gradient' | 'ink' | 'white' }) {
  const id = `q-${fill}`;
  const f = fill === 'gradient' ? `url(#${id})` : fill === 'ink' ? '#0b0d18' : '#ffffff';
  return (
    <svg viewBox="0 0 96 120" height={height} width={height * 0.8} aria-hidden="true" shapeRendering="crispEdges">
      {fill === 'gradient' && (
        <defs>
          <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="120">
            <stop offset="0" stopColor="var(--era-1)" /><stop offset=".38" stopColor="var(--era-2)" /><stop offset=".7" stopColor="var(--era-3)" /><stop offset="1" stopColor="var(--era-4)" />
          </linearGradient>
        </defs>
      )}
      <g fill={f}>
        <rect x="24" y="0" width="48" height="24" /><rect x="0" y="24" width="24" height="48" /><rect x="72" y="24" width="24" height="36" />
        <polygon points="24,72 72,72 96,96 96,120 72,96 24,96" />
      </g>
    </svg>
  );
}

export function Lockup({ size = 'sm' as 'sm' | 'md' | 'lg' }) {
  return (
    <a href="/" className={`q-lockup q-lockup--${size}`} aria-label="QUAD home">
      <QuadMark height={{ sm: 24, md: 36, lg: 64 }[size]} />
      <span className="q-word">QUAD</span>
    </a>
  );
}
