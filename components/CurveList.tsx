'use client';
import { useCallback, useEffect, useState } from 'react';
import { SampleCoins } from './SampleCoins';
import { TokenCard } from './TokenCard';
import { CoinCard, CoinRow, CoinTableHeader } from './CoinRow';
import { CURVE_TABS, bentoSize, fetchCoinMetadata, inTab, tabLabel, toCoinRow, toTokenCard, type ApiCoin, type ApiMeta, type CurveTab, type PoolsApi } from '@/lib/coin-view';

const REFRESH_MS = 10_000;

/**
 * "On the curve", live from /api/pools. Tabs by era: All shows every coin as a pyramid bento
 * (closest to graduation first and largest); an era, or Graduated, lists its coins in rows.
 */
export function CurveList() {
  const [api, setApi] = useState<(ApiMeta & { coins: ApiCoin[] }) | null>(null);
  const [images, setImages] = useState<Record<string, string>>({}); // metadata uri → image
  const [tab, setTab] = useState<CurveTab>('all');
  const [, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pools', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      const next = body as PoolsApi;
      setApi(next);
      for (const c of next.coins) {
        if (!c.uri) continue;
        setImages((m) => (c.uri in m ? m : { ...m, [c.uri]: '' }));
        fetchCoinMetadata(c.uri).then((meta) => meta?.image && setImages((m) => ({ ...m, [c.uri]: meta.image! })));
      }
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

  // Until real coins are live (or while the curve cannot be reached), show labelled samples.
  if (!api || api.coins.length === 0) return <SampleCoins />;

  const shown = api.coins.filter((c) => inTab(c, tab));
  const era = typeof tab === 'number' ? tab : tab === 'graduated' ? 4 : null;

  return (
    <div className="tk-wrap">
      <div className="era-tabs" role="tablist" aria-label="Eras">
        {CURVE_TABS.map((t) => {
          const n = api.coins.filter((c) => inTab(c, t)).length;
          const e = typeof t === 'number' ? t : t === 'graduated' ? 4 : null;
          return (
            <button key={String(t)} type="button" role="tab" className="era-tab" aria-selected={tab === t} onClick={() => setTab(t)} style={e ? { ['--era' as string]: `var(--era-${e})`, ['--on' as string]: `var(--on-era-${e})` } : undefined}>
              {tabLabel(t)} <span className="num">{n}</span>
            </button>
          );
        })}
      </div>

      {tab === 'all' ? (
        <div className={`tk-grid ${shown.length === 1 ? 'tk-grid--one' : ''}`}>
          {shown.map((c, i) => <TokenCard key={c.pool} c={{ ...toTokenCard(c, api), image: images[c.uri] || undefined }} size={bentoSize(i, shown.length)} cta="View →" />)}
        </div>
      ) : shown.length === 0 ? (
        <p className="era-empty"><span className={`q-era q-era--${era}`}>{tabLabel(tab)}</span>{tab === 'graduated' ? 'No coin has graduated yet.' : `No coin is in era ${tab} right now.`}</p>
      ) : (
        <>
          <div className="show-m" style={{ flexDirection: 'column', gap: 12 }}>{shown.map((c) => <CoinCard key={c.pool} c={toCoinRow(c, api)} />)}</div>
          <div className="hide-m era-rows"><CoinTableHeader />{shown.map((c, i) => <CoinRow key={c.pool} c={toCoinRow(c, api)} index={i} />)}</div>
        </>
      )}
    </div>
  );
}
