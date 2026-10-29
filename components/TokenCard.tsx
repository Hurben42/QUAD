import { EraSteps } from './EraSteps';

export type TokenCardView = {
  name: string;
  ticker: string;
  era: 1 | 2 | 3 | 4;
  /** 0 → 1, HYPE raised / threshold */
  progress: number;
  price: string;
  raised: string;
  cap: string;
  sub: string;
  href?: string;
  sample?: boolean;
};

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** A coin on the curve as a small QUAD poster: era-coloured halftone art, the steps, the numbers in mono. */
export function TokenCard({ c, featured }: { c: TokenCardView; featured?: boolean }) {
  const Tag = c.href ? 'a' : 'article';
  return (
    <Tag className={`tk ${featured ? 'tk--featured' : ''}`} style={{ ['--era' as string]: `var(--era-${c.era})`, ['--on' as string]: `var(--on-era-${c.era})` }} {...(c.href ? { href: c.href, target: '_blank', rel: 'noopener' } : {})}>
      <div className="tk-art grain" aria-hidden="true">
        <span className="tk-initials num">{initials(c.name)}</span>
        <span className="tk-pct num">{Math.round(c.progress * 100)}%</span>
      </div>
      <div className="tk-body">
        <div className="tk-head">
          <span className="tk-name">{c.name} <span className="num">${c.ticker}</span></span>
          <span className={`q-era q-era--${c.era}`}>Era {c.era}</span>
        </div>
        <EraSteps progress={c.progress} height={featured ? 64 : 36} labels={false} />
        <dl className="tk-stats">
          <div><dt className="label">Price</dt><dd className="num">{c.price}</dd></div>
          <div><dt className="label">Raised</dt><dd className="num">{c.raised}</dd></div>
          <div><dt className="label">Mkt cap</dt><dd className="num">{c.cap}</dd></div>
        </dl>
        <div className="tk-foot"><span className="label">{c.sub}</span>{c.sample ? <span className="label tk-sample">Sample</span> : <span className="num">Trade ↗</span>}</div>
      </div>
    </Tag>
  );
}
