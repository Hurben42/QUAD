/**
 * A ring of white QUAD coins seen from the side, for the Mint once visual: thick ink edge,
 * white face with an inner ring and the QUAD mark (same shapes as components/Lockup.tsx).
 * The ring turns slowly and each coin tips back and forth (see .rp-coins in globals.css).
 */

const COUNT = 10;
const CX = 300;
const CY = 220;
const R = 165;
const FACE = 36; // face radius (vertical)
const EDGE = 11; // edge thickness, in px of offset

function Coin({ aspect }: { aspect: number }) {
  const rx = FACE * aspect;
  const edge = Array.from({ length: EDGE }, (_, k) => EDGE - k);
  return (
    <g>
      {/* the edge: the face outline stacked behind, offset to the lower right */}
      {edge.map((k) => <ellipse key={k} cx={k} cy={k * 0.45} rx={rx} ry={FACE} fill="var(--on-era-4)" />)}
      <ellipse cx={EDGE * 0.35} cy={EDGE * 0.16} rx={rx} ry={FACE} fill="none" stroke="var(--on-era-1)" strokeWidth="1.5" strokeDasharray={`${FACE * 0.9} 400`} />
      {/* the face */}
      <ellipse rx={rx} ry={FACE} fill="var(--on-era-1)" stroke="var(--on-era-4)" strokeWidth="1.5" />
      <ellipse rx={rx * 0.78} ry={FACE * 0.78} fill="none" stroke="var(--on-era-4)" strokeWidth="1" strokeOpacity=".55" />
      {/* the QUAD mark, squashed with the face */}
      <g transform={`scale(${aspect} 1) translate(-12 -15) scale(0.25)`} fill="var(--on-era-4)">
        <rect x="24" y="0" width="48" height="24" /><rect x="0" y="24" width="24" height="48" /><rect x="72" y="24" width="24" height="36" />
        <polygon points="24,72 72,72 96,96 96,120 72,96 24,96" />
      </g>
    </g>
  );
}

export function QuadCoins() {
  return (
    <svg className="rp-coins" viewBox="0 0 600 560" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
      <g className="rp-coins-ring">
        {Array.from({ length: COUNT }, (_, i) => {
          const a = (i / COUNT) * Math.PI * 2 - Math.PI / 2;
          const x = CX + R * Math.cos(a);
          const y = CY + R * Math.sin(a);
          // seen from the side: thinner where the ring runs towards the viewer
          const aspect = 0.42 + 0.5 * Math.abs(Math.sin(a + 0.6));
          const tilt = (a * 180) / Math.PI + 90 - 25;
          return (
            <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${tilt.toFixed(1)})`}>
              <g className="rp-coin" style={{ ['--d' as string]: i }}>
                <Coin aspect={aspect} />
              </g>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
