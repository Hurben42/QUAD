/**
 * Server-side snapshot of every coin on the QUAD curve, shared by the API routes and page metadata.
 * One RPC round per 5 s whatever the traffic; concurrent callers share the in-flight read.
 */
import { Connection } from '@solana/web3.js';
import { listCurveCoins, makeClient, DBC_CONFIG, QUOTE_MINT, type CurveCoin } from './dbc';
import { readQuoteMint } from './hype';

const TTL_MS = 5_000;

export type PoolsSnapshot = { quoteDecimals: number; baseDecimals: number | null; coins: CurveCoin[] };

let cache: { at: number; body: PoolsSnapshot } | null = null;
let inflight: Promise<PoolsSnapshot> | null = null;

async function read(): Promise<PoolsSnapshot> {
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
  const [coins, quote, config] = await Promise.all([listCurveCoins(connection), readQuoteMint(connection, QUOTE_MINT), makeClient(connection).state.getPoolConfig(DBC_CONFIG)]);
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
export const serializeCoin = (c: CurveCoin) => ({ ...c, quoteRaised: c.quoteRaised.toString(), quoteThreshold: c.quoteThreshold.toString() });
