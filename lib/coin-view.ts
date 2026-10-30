/** What /api/pools returns, and how the UI reads it. */
import type { TokenCardView } from '@/components/TokenCard';
import type { CoinView } from '@/components/CoinRow';
import { TOTAL_COINS, price as fmtPrice } from './curve';

export type ApiCoin = {
  pool: string;
  baseMint: string;
  creator: string;
  name: string;
  symbol: string;
  uri: string;
  progress: number;
  era: 1 | 2 | 3 | 4;
  quoteRaised: string;
  quoteThreshold: string;
  spotPrice: number;
  migrated: boolean;
  dammPool: string | null;
  createdAt: number | null;
};
export type ApiMeta = { quoteDecimals: number; baseDecimals: number | null };
export type PoolsApi = ApiMeta & { coins: ApiCoin[] };
export type PoolApi = ApiMeta & { coin: ApiCoin };

/** The coin's metadata JSON on Irys (Metaplex off-chain standard, plus the links the launch form collects). */
export type CoinMetadataJson = {
  name?: string;
  symbol?: string;
  description?: string;
  image?: string;
  external_url?: string;
  extensions?: { website?: string; twitter?: string; telegram?: string };
};

/** Fetch the metadata JSON; null when there is none or it cannot be read. */
export async function fetchCoinMetadata(uri: string): Promise<CoinMetadataJson | null> {
  if (!uri) return null;
  try {
    const res = await fetch(uri, { cache: 'force-cache' });
    if (!res.ok) return null;
    const json = (await res.json()) as CoinMetadataJson;
    return json && typeof json === 'object' ? json : null;
  } catch {
    return null;
  }
}

export function ago(unix: number | null) {
  if (!unix) return 'Just launched';
  const s = Math.max(0, Date.now() / 1000 - unix);
  if (s < 3600) return `Launched ${Math.max(1, Math.round(s / 60))} min ago`;
  if (s < 86400) return `Launched ${Math.round(s / 3600)} h ago`;
  return `Launched ${Math.round(s / 86400)} d ago`;
}

export const hype = (lamports: string, decimals: number) => Number(BigInt(lamports)) / 10 ** decimals;
export const fmt = (x: number) => (x >= 100 ? x.toFixed(0) : x >= 1 ? x.toFixed(1) : x.toPrecision(3));

/** Spot price in HYPE per whole coin. */
export const pricePerCoin = (c: ApiCoin, api: ApiMeta) => c.spotPrice * 10 ** ((api.baseDecimals ?? 6) - api.quoteDecimals);
export const symbolOf = (c: ApiCoin) => c.symbol || c.baseMint.slice(0, 4).toUpperCase();
export const initialsOf = (c: ApiCoin) => {
  const symbol = symbolOf(c);
  return (c.name || symbol).replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || symbol.slice(0, 2);
};

const cap = (x: number) => (x >= 1000 ? `${(x / 1000).toFixed(1)}K` : x >= 100 ? x.toFixed(0) : x.toFixed(1));

/** A coin as a token card of the bento. */
export function toTokenCard(c: ApiCoin, api: ApiMeta): TokenCardView {
  const symbol = symbolOf(c);
  const p = pricePerCoin(c, api);
  return {
    name: c.name || symbol,
    ticker: symbol,
    era: c.era,
    progress: c.progress,
    price: `${fmtPrice(p)} HYPE`,
    raised: `${fmt(hype(c.quoteRaised, api.quoteDecimals))} / ${fmt(hype(c.quoteThreshold, api.quoteDecimals))}`,
    cap: `${cap(p * Number(TOTAL_COINS))} HYPE`,
    sub: c.migrated ? 'Graduated' : ago(c.createdAt),
    href: `/token/${c.pool}`,
    uri: c.uri,
  };
}

/** A coin as a row of an era list. */
export function toCoinRow(c: ApiCoin, api: ApiMeta): CoinView {
  const symbol = symbolOf(c);
  return {
    pool: c.pool,
    href: `/token/${c.pool}`,
    name: c.name || symbol,
    ticker: `$${symbol}`,
    sub: c.migrated ? 'Graduated' : ago(c.createdAt),
    era: c.era,
    progress: c.progress,
    price: `${fmtPrice(pricePerCoin(c, api))} HYPE`,
    raised: `${fmt(hype(c.quoteRaised, api.quoteDecimals))} / ${fmt(hype(c.quoteThreshold, api.quoteDecimals))} HYPE`,
    initials: initialsOf(c),
  };
}

/** The tabs of the curve: every coin, one era, or the graduated ones. */
export type CurveTab = 'all' | 1 | 2 | 3 | 4 | 'graduated';
export const CURVE_TABS: CurveTab[] = ['all', 1, 2, 3, 4, 'graduated'];
export const inTab = (c: ApiCoin, tab: CurveTab) => (tab === 'all' ? true : tab === 'graduated' ? c.migrated : !c.migrated && c.era === tab);
export const tabLabel = (tab: CurveTab) => (tab === 'all' ? 'All' : tab === 'graduated' ? 'Graduated' : `Era ${tab}`);
