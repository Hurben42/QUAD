/**
 * Server-side snapshot of every coin on the QUAD curve, shared by the API routes and page metadata.
 * One RPC round per 5 s whatever the traffic; concurrent callers share the in-flight read.
 */
import { Connection } from '@solana/web3.js';
import { listCurveCoins, makeClient, DBC_CONFIG, QUOTE_MINT, type CurveCoin } from './dbc';
import { readQuoteMint } from './hype';
import { anonymousPools } from './anon-server';

const TTL_MS = 5_000;

export type PoolsSnapshot = { quoteDecimals: number; baseDecimals: number | null; coins: CurveCoin[] };

let cache: { at: number; body: PoolsSnapshot } | null = null;
let inflight: Promise<PoolsSnapshot> | null = null;

/**
 * Price history for the 24 h change, kept in memory from the snapshots this server reads.
 * Per pool: samples oldest first, trimmed so the first one is the last price at or before
 * the window's start. A pool younger than the window starts from the curve's start price,
 * so its change is real from its first trade; an older pool has a change once the server
 * has watched it for a while.
 */
const WINDOW_S = 24 * 3600;
const SAMPLE_EVERY_S = 300;
const history = new Map<string, { t: number; p: number }[]>();
let startPrice: number | null = null;

function record(coins: CurveCoin[]) {
  const now = Date.now() / 1000;
  for (const c of coins) {
    let h = history.get(c.pool);
    if (!h) {
      h = [];
      if (startPrice && c.createdAt && now - c.createdAt <= WINDOW_S) h.push({ t: c.createdAt, p: startPrice });
      history.set(c.pool, h);
    }
    const last = h[h.length - 1];
    if (!last || last.p !== c.spotPrice || now - last.t >= SAMPLE_EVERY_S) h.push({ t: now, p: c.spotPrice });
    while (h.length > 1 && h[1].t <= now - WINDOW_S) h.shift();
  }
}

/** Price change over the last 24 h (or since the server started watching), as a fraction; null without a baseline. */
export function priceChange(c: CurveCoin): number | null {
  const base = history.get(c.pool)?.[0];
  if (!base || !(base.p > 0) || base.t >= Date.now() / 1000 - 1) return null;
  return c.spotPrice / base.p - 1;
}

async function read(): Promise<PoolsSnapshot> {
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
  const [coins, quote, config] = await Promise.all([listCurveCoins(connection), readQuoteMint(connection, QUOTE_MINT), makeClient(connection).state.getPoolConfig(DBC_CONFIG)]);
  if (config && startPrice === null) {
    const s = BigInt(config.sqrtStartPrice.toString());
    startPrice = Number((s * s * 10n ** 18n) / (1n << 128n)) / 1e18; // same scale as CurveCoin.spotPrice
  }
  record(coins);
  return { quoteDecimals: quote.decimals, baseDecimals: config?.tokenDecimal ?? null, coins };
}

export async function loadPools(): Promise<PoolsSnapshot> {
  if (!cache || Date.now() - cache.at > TTL_MS) {
    inflight ??= read().finally(() => (inflight = null));
    cache = { at: Date.now(), body: await inflight };
  }
  return cache.body;
}

/** JSON-safe coin: bigints as decimal strings. */
export const serializeCoin = (c: CurveCoin, anon: Set<string> = anonymousPools()) => ({
  ...c,
  quoteRaised: c.quoteRaised.toString(),
  quoteThreshold: c.quoteThreshold.toString(),
  /** launched through the anonymous desk (docs/ANONYMOUS.md) */
  anonymous: anon.has(c.pool),
  /** price change over 24 h, see priceChange */
  change: priceChange(c),
});
