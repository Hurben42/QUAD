/** The era stripes of poster A: vertical bands cut from --brand-vertical at different offsets. */

// [width %, background-position %] of each stripe
export const STRIPES: [number, number][] = [[10, 0], [14, 20], [8, 55], [18, 90], [6, 35], [12, 70], [10, 10], [14, 100], [8, 45]];
export const STRIPES_M: [number, number][] = [[12, 0], [16, 25], [8, 55], [20, 90], [10, 40], [14, 70], [20, 100]];

export function Stripes({ set = STRIPES, className = '' }: { set?: [number, number][]; className?: string }) {
  return (
    <div className={`stripes ${className}`} aria-hidden="true" style={{ position: 'absolute', inset: 0 }}>
      {set.map(([w, p], i) => <i key={i} style={{ width: `${w}%`, backgroundPosition: `0 ${p}%` }} />)}
    </div>
  );
}
