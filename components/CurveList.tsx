'use client';
import { useCallback, useEffect, useState } from 'react';
import { SampleCoins } from './SampleCoins';
import { LinkButton } from './Button';
import { CoinCard, CoinRow, CoinTableHeader } from './CoinRow';
import { CURVE_TABS, inTab, tabLabel, toCoinRow, type ApiCoin, type ApiMeta, type CurveTab, type PoolsApi } from '@/lib/coin-view';

const REFRESH_MS = 10_000;

/**
 * "On the curve", live from /api/pools: tabs by era (All, Era 1–4, Graduated), the coins of the
 * tab as rows, closest to graduation first. With `limit`, the home shows that many and a
 * See all button to `seeAllHref` (/tokens, the full list).
 */
export function CurveList({ limit, seeAllHref }: { limit?: number; seeAllHref?: string } = {}) {
  const [api, setApi] = useState<(ApiMeta & { coins: ApiCoin[] }) | null>(null);
  const [tab, setTab] = useState<CurveTab>('all');
  const [, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pools', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setApi(body as PoolsApi);
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

  const all = api.coins.filter((c) => inTab(c, tab));
  const shown = limit ? all.slice(0, limit) : all;
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

      {shown.length === 0 ? (
        <p className="era-empty"><span className={`q-era q-era--${era ?? 1}`}>{tabLabel(tab)}</span>{tab === 'graduated' ? 'No coin has graduated yet.' : `No coin is in era ${tab} right now.`}</p>
      ) : (
        <>
          <div className="show-m" style={{ flexDirection: 'column', gap: 12 }}>{shown.map((c) => <CoinCard key={c.pool} c={toCoinRow(c, api)} />)}</div>
          <div className="hide-m era-rows"><CoinTableHeader />{shown.map((c, i) => <CoinRow key={c.pool} c={toCoinRow(c, api)} index={i} />)}</div>
        </>
      )}
      {seeAllHref && all.length > shown.length && (
        <div className="era-foot"><LinkButton variant="secondary" href={seeAllHref}>See all {api.coins.length} tokens <span className="num">→</span></LinkButton></div>
      )}
    </div>
  );
}
