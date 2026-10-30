'use client';
import { useCallback, useEffect, useState } from 'react';
import { SampleCoins } from './SampleCoins';
import { TokenCard, type TokenCardView } from './TokenCard';
import { bentoSize, fetchCoinMetadata, toTokenCard, type PoolsApi } from '@/lib/coin-view';

const REFRESH_MS = 10_000;

/** "On the curve": every live coin as a token card, closest to graduation first and largest. Live from /api/pools. */
export function CurveList() {
  const [coins, setCoins] = useState<TokenCardView[] | null>(null);
  const [images, setImages] = useState<Record<string, string>>({}); // metadata uri → image
  const [, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/pools', { cache: 'no-store' });
      const api = await res.json();
      if (!res.ok) throw new Error(api.error ?? res.statusText);
      const list = (api as PoolsApi).coins;
      setCoins(list.map((c) => toTokenCard(c, api)));
      for (const c of list) {
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
  if (!coins || coins.length === 0) return <SampleCoins />;

  return (
    <div className="tk-wrap">
      <div className={`tk-grid ${coins.length === 1 ? 'tk-grid--one' : ''}`}>
        {coins.map((c, i) => <TokenCard key={c.href} c={{ ...c, image: (c.uri && images[c.uri]) || undefined }} size={bentoSize(i, coins.length)} cta="View →" />)}
      </div>
    </div>
  );
}
