import { EraSteps } from './EraSteps';
import { trackPosition } from '@/lib/curve';

export type CoinView = { pool: string; href: string; name: string; ticker: string; sub: string; era: 1 | 2 | 3 | 4; progress: number; price: string; raised: string; initials: string };

const grid = '40px 6px 44px minmax(0,1fr) 110px minmax(140px,200px) 160px 32px';

export function CoinTableHeader() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: grid, gap: 16, alignItems: 'center', padding: '0 16px 12px', borderBottom: '1px solid var(--line-strong)' }} aria-hidden="true">
      <span className="label">No</span><span /><span /><span className="label">Coin</span><span className="label">Era</span><span className="label">Steps</span><span className="label" style={{ textAlign: 'right' }}>Price · Raised</span><span />
    </div>
  );
}

export function CoinRow({ c, index }: { c: CoinView; index: number }) {
  return (
    <a href={c.href} target="_blank" rel="noopener" style={{ display: 'grid', gridTemplateColumns: grid, gap: 16, alignItems: 'center', padding: '18px 16px', borderBottom: '1px solid var(--line)' }}>
      <span className="num" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{String(index + 1).padStart(2, '0')}</span>
      <span style={{ width: 6, height: 44, borderRadius: 3, background: `var(--era-${c.era})` }} />
      <span className="num" style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', fontSize: 15, background: 'var(--surface-2)' }}>{c.initials}</span>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <span style={{ font: '700 18px/24px var(--font-sans)', letterSpacing: '-0.01em', display: 'flex', gap: 10, alignItems: 'baseline' }}><span>{c.name}</span><span className="num" style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.ticker}</span></span>
        <span style={{ font: '500 13px/18px var(--font-sans)', color: 'var(--text-muted)' }}>{c.sub}</span>
      </span>
      <span><span className={`q-era q-era--${c.era}`}>Era {c.era}</span></span>
      <span><EraSteps progress={c.progress} height={28} labels={false} /></span>
      <span style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}><span className="num" style={{ fontSize: 15 }}>{c.price}</span><span style={{ font: '500 13px/18px var(--font-sans)', color: 'var(--text-muted)' }}>{c.raised} · {Math.round(c.progress * 100)}%</span></span>
      <span className="num" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>→</span>
    </a>
  );
}

/** Mobile list item, after design/website/landing-mobile.html. */
export function CoinCard({ c }: { c: CoinView }) {
  const pos = trackPosition(c.progress);
  return (
    <a className="coin-card" href={c.href} target="_blank" rel="noopener">
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="num" style={{ width: 40, height: 40, borderRadius: 'var(--radius-sm)', display: 'grid', placeItems: 'center', fontSize: 14, background: `var(--era-${c.era})`, color: `var(--on-era-${c.era})`, flex: 'none' }}>{c.initials}</span>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1, minWidth: 0 }}>
          <span style={{ font: '700 16px/20px var(--font-sans)' }}>{c.name} <span className="num" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.ticker}</span></span>
          <span style={{ font: '500 12px/16px var(--font-sans)', color: 'var(--text-muted)' }}>{c.sub}</span>
        </span>
        <span style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="num" style={{ fontSize: 14 }}>{c.price}</span>
          <span style={{ font: '500 12px/16px var(--font-sans)', color: 'var(--text-muted)' }}>{c.raised}</span>
        </span>
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className={`q-era q-era--${c.era}`}>Era {c.era}</span>
        <span className="track" style={{ flex: 1 }} aria-hidden="true">
          <span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" />
          <span className="fill" style={{ width: `${pos * 100}%`, ['--p' as string]: Math.max(pos, 0.001) }} />
        </span>
      </span>
    </a>
  );
}
