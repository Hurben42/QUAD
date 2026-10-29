'use client';
import { useCallback, useEffect, useState } from 'react';
import { EraSteps } from './EraSteps';
import { CoinCard, CoinRow, CoinTableHeader, type CoinView } from './CoinRow';
import { QUOTE_MINT } from '@/lib/dbc';
import { price as fmtPrice } from '@/lib/curve';

type ApiCoin = { pool: string; baseMint: string; name: string; symbol: string; progress: number; era: 1 | 2 | 3 | 4; quoteRaised: string; quoteThreshold: string; spotPrice: number; createdAt: number | null };
type Api = { quoteDecimals: number; baseDecimals: number | null; coins: ApiCoin[] };

const REFRESH_MS = 10_000;

function ago(unix: number | null) {
  if (!unix) return 'Just launched';
  const s = Math.max(0, Date.now() / 1000 - unix);
  if (s < 3600) return `Launched ${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `Launched ${Math.round(s / 3600)} h ago`;
  return `Launched ${Math.round(s / 86400)} d ago`;
}

const hype = (lamports: string, decimals: number) => Number(BigInt(lamports)) / 10 ** decimals;
const fmt = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toPrecision(3));

function toView(c: ApiCoin, api: Api): CoinView {
  const price = c.spotPrice * 10 ** ((api.baseDecimals ?? 6) - api.quoteDecimals);
  const symbol = c.symbol || c.baseMint.slice(0, 4).toUpperCase();
  return {
    pool: c.pool,
    href: `https://jup.ag/swap/${QUOTE_MINT.toBase58()}-${c.baseMint}`,
    name: c.name || symbol,
    ticker: `$${symbol}`,
    sub: ago(c.createdAt),
    era: c.era,
    progress: c.progress,
    price: `${fmtPrice(price)} HYPE`,
    raised: `${fmt(hype(c.quoteRaised, api.quoteDecimals))} / ${fmt(hype(c.quoteThreshold, api.quoteDecimals))} HYPE`,
    initials: (c.name || symbol).replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || symbol.slice(0, 2),
  };
}

/** "On the curve": the featured coin closest to graduation, then the table. Live from /api/pools. */
export function CurveList() {
  const [coins, setCoins] = useState<CoinView[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pools', { cache: 'no-store' });
      const api = await res.json();
      if (!res.ok) throw new Error(api.error ?? res.statusText);
      setCoins((api as Api).coins.map((c) => toView(c, api)));
      setError(null);
    } catch (e) {
      setError(String(e));
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    window.addEventListener('quad:launched', load);
    return () => {
      clearInterval(t);
      window.removeEventListener('quad:launched', load);
    };
  }, [load]);

  if (!coins) return <p className="label">{error ? 'Could not reach the curve. Retrying.' : 'Loading the curve…'}</p>;
  if (coins.length === 0)
    return (
      <div style={{ padding: '48px 40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <span style={{ font: '700 18px/24px var(--font-sans)' }}>No coin on the curve yet.</span>
        <a className="q-btn q-btn--primary" href="/launch">Launch the first one <span className="num">→</span></a>
      </div>
    );

  const [featured, ...rest] = coins;
  return (
    <>
      <div className="show-m" style={{ flexDirection: 'column', gap: 12 }}>{coins.map((c) => <CoinCard key={c.pool} c={c} />)}</div>
      <a className="grain hide-m" href={featured.href} target="_blank" rel="noopener" style={{ position: 'relative', overflow: 'hidden', display: 'grid', gridTemplateColumns: 'minmax(0,5fr) minmax(0,4fr) minmax(0,3fr)', gap: 40, alignItems: 'center', padding: '32px 40px', borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', minHeight: 260 }}>
        <div aria-hidden="true" style={{ position: 'absolute', right: '-10%', bottom: '-60%', width: '70%', height: '160%', background: 'var(--era-horizon)', opacity: 0.8 }} />
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <span className="label">Next to graduate</span>
          <span style={{ font: '800 32px/1 var(--font-sans)', letterSpacing: '-0.03em' }}>{featured.name} <span className="num" style={{ fontSize: 14, color: 'var(--text-muted)' }}>{featured.ticker}</span></span>
          <span className={`q-era q-era--${featured.era}`} style={{ alignSelf: 'flex-start' }}>Era {featured.era}</span>
        </div>
        <div style={{ position: 'relative' }}><EraSteps progress={featured.progress} /></div>
        <div style={{ position: 'relative', textAlign: 'right' }}><span className="num" style={{ fontSize: 64, lineHeight: 1, letterSpacing: '-0.04em' }}>{Math.round(featured.progress * 100)}%</span><div className="label">To graduation</div></div>
      </a>
      {rest.length > 0 && <div className="hide-m"><CoinTableHeader />{rest.map((c, i) => <CoinRow key={c.pool} c={c} index={i + 1} />)}</div>}
    </>
  );
}
