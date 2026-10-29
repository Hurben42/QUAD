/**
 * The creators scene: ink clouds, a wireframe cube turning slowly with halftone faces, and the
 * HYPE mark at the centre as a sticker. The mark is the official file, unmodified
 * (public/brand/hyperliquid-blob-green.svg); the white outline is a separate shape behind it.
 * Drawn in its own 640×540 viewport so it can sit inside a creator card (components/CreatorCard.tsx).
 */

// The mark's outline, same geometry as the official file (viewBox 0 0 200 200), for the sticker border only
export const MARK_PATH =
  'M175.11589,99.27891c0,49.46366-30.3687,65.33789-46.47302,51.30413-13.11357-11.5031-17.02471-35.88989-36.81018-38.42055-25.07698-2.99085-27.37764,30.36839-43.94216,30.36839-19.3254,0-23.00642-27.83773-23.00642-42.33179,0-14.72405,4.14115-34.73961,20.47565-34.73961,19.09528,0,20.24566,28.75802,44.17226,27.14754,23.69661-1.61047,24.1567-31.51877,39.80103-44.17224,13.57335-11.27313,45.78283.69019,45.78283,50.84413Z';

// Isometric cube around the centre (320, 270), radius 170
const C = [320, 270];
const V = { top: [320, 100], ur: [467.2, 185], lr: [467.2, 355], bottom: [320, 440], ll: [172.8, 355], ul: [172.8, 185] };
const pts = (...p: number[][]) => p.map((q) => q.join(',')).join(' ');

export function ArtScene({ id, x = 0, y = 0, width = 640, height = 540 }: { id: string; x?: number; y?: number; width?: number; height?: number }) {
  return (
    <svg x={x} y={y} width={width} height={height} viewBox="0 0 640 540" aria-hidden="true" overflow="visible">
      <defs>
        <pattern id={`${id}-ink`} width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="var(--era-2)" fillOpacity=".55" /></pattern>
        <pattern id={`${id}-face`} width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="var(--era-3)" /><circle cx="4" cy="4" r="1.7" fill="var(--on-era-4)" fillOpacity=".45" /></pattern>
      </defs>

      <g className="art-blobs">
        <g fill="var(--on-era-4)">
          <circle cx="235" cy="265" r="88" />
          <circle cx="320" cy="225" r="104" />
          <circle cx="425" cy="262" r="86" />
          <circle cx="180" cy="320" r="58" />
          <circle cx="478" cy="318" r="56" />
          <rect x="170" y="290" width="320" height="86" rx="40" />
        </g>
        <g fill={`url(#${id}-ink)`}>
          <circle cx="425" cy="262" r="86" />
          <circle cx="478" cy="318" r="56" />
        </g>
      </g>

      <g className="art-cube">
        <polygon points={pts(V.ul, C, V.bottom, V.ll)} fill={`url(#${id}-face)`} fillOpacity=".85" />
        <polygon points={pts(C, V.ur, V.lr, V.bottom)} fill={`url(#${id}-face)`} fillOpacity=".35" />
        <g fill="none" stroke="var(--on-era-4)" strokeWidth="3" strokeLinejoin="round">
          <polygon points={pts(V.top, V.ur, V.lr, V.bottom, V.ll, V.ul)} />
          <polyline points={pts(V.ul, C, V.ur)} />
          <line x1={C[0]} y1={C[1]} x2={V.bottom[0]} y2={V.bottom[1]} />
          <g strokeDasharray="8 9" strokeOpacity=".6">
            <line x1={C[0]} y1={C[1]} x2={V.top[0]} y2={V.top[1]} />
            <line x1={C[0]} y1={C[1]} x2={V.ll[0]} y2={V.ll[1]} />
            <line x1={C[0]} y1={C[1]} x2={V.lr[0]} y2={V.lr[1]} />
          </g>
        </g>
      </g>

      <g className="art-logo">
        <g transform="translate(230 170) scale(0.9)">
          <path d={MARK_PATH} fill="var(--on-era-1)" stroke="var(--on-era-1)" strokeWidth="22" strokeLinejoin="round" />
          <image href="/brand/hyperliquid-blob-green.svg" x="0" y="0" width="200" height="200" />
        </g>
      </g>

      <g stroke="var(--on-era-4)" strokeWidth="4" strokeLinecap="round">
        <line className="art-line" x1="520" y1="96" x2="590" y2="48" pathLength={1} />
        <line className="art-line" x1="50" y1="480" x2="120" y2="430" pathLength={1} style={{ animationDelay: '1.4s' }} />
      </g>
    </svg>
  );
}
