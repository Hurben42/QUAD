import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { listCurveCoins, makeClient, DBC_CONFIG, QUOTE_MINT } from '@/lib/dbc';
import { readQuoteMint } from '@/lib/hype';

export const dynamic = 'force-dynamic';

const TTL_MS = 5_000;
let cache: { at: number; body: unknown } | null = null;
let inflight: Promise<unknown> | null = null;

async function load() {
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
  const [coins, quote, config] = await Promise.all([listCurveCoins(connection), readQuoteMint(connection, QUOTE_MINT), makeClient(connection).state.getPoolConfig(DBC_CONFIG)]);
  return {
    quoteDecimals: quote.decimals,
    baseDecimals: config?.tokenDecimal ?? null,
    coins: coins.map((c) => ({ ...c, quoteRaised: c.quoteRaised.toString(), quoteThreshold: c.quoteThreshold.toString() })),
  };
}

export async function GET() {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) {
      inflight ??= load().finally(() => (inflight = null));
      cache = { at: Date.now(), body: await inflight };
    }
    return NextResponse.json(cache.body, { headers: { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=10' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
