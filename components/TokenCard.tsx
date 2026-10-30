import { EraSteps } from './EraSteps';
import { CoinAvatar } from './CoinAvatar';

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
  /** logo from the coin's metadata; initials when absent */
  image?: string;
  /** the metadata JSON the image comes from */
  uri?: string;
  /** without an image, draw the generated portrait instead of the initials */
  portrait?: boolean;
};

/** Bento sizes: xl 2×2, tall 1×2, wide 2×1 (art beside the body), sm 1×1. */
export type TokenCardSize = 'xl' | 'tall' | 'wide' | 'sm';

const initials = (name: string) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

/** A coin on the curve as a small QUAD poster: era-coloured halftone art, the steps, the numbers in mono. */
export function TokenCard({ c, size = 'sm', cta = 'Trade ↗' }: { c: TokenCardView; size?: TokenCardSize; cta?: string }) {
  const Tag = c.href ? 'a' : 'article';
  const external = c.href?.startsWith('http');
  return (
    <Tag className={`tk tk--${size}`} style={{ ['--era' as string]: `var(--era-${c.era})`, ['--on' as string]: `var(--on-era-${c.era})` }} {...(c.href ? { href: c.href, ...(external ? { target: '_blank', rel: 'noopener' } : {}) } : {})}>
      <div className="tk-art grain" aria-hidden="true">
        {c.image ? <span className="tk-photo"><img src={c.image} alt="" /></span> : c.portrait ? <span className="tk-photo"><CoinAvatar name={c.name} era={c.era} /></span> : <span className="tk-initials num">{initials(c.name)}</span>}
        <span className="tk-pct num">{Math.round(c.progress * 100)}%</span>
      </div>
      <div className="tk-body">
        <div className="tk-head">
          <span className="tk-name">{c.name} <span className="num">${c.ticker}</span></span>
          <span className={`q-era q-era--${c.era}`}>Era {c.era}</span>
        </div>
        <EraSteps progress={c.progress} height={size === 'xl' ? 52 : size === 'sm' ? 20 : 28} labels={false} />
        <dl className="tk-stats">
          <div><dt className="label">Price</dt><dd className="num">{c.price}</dd></div>
          <div><dt className="label">Raised</dt><dd className="num">{c.raised}</dd></div>
          <div><dt className="label">Mkt cap</dt><dd className="num">{c.cap}</dd></div>
        </dl>
        <div className="tk-foot"><span className="label">{c.sub}</span>{c.sample ? <span className="label tk-sample">Sample</span> : <span className="num">{cta}</span>}</div>
      </div>
    </Tag>
  );
}
