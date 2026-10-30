import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { loadPools, serializeCoin } from '@/lib/pools-cache';

export const dynamic = 'force-dynamic';

/** One coin of the QUAD curve, by pool address. */
export async function GET(_req: Request, { params }: { params: Promise<{ pool: string }> }) {
  const { pool } = await params;
  try {
    new PublicKey(pool);
  } catch {
    return NextResponse.json({ error: 'not a Solana address' }, { status: 400 });
  }
  try {
    const { coins, ...rest } = await loadPools();
    const coin = coins.find((c) => c.pool === pool);
    if (!coin) return NextResponse.json({ error: 'no QUAD coin at this pool' }, { status: 404 });
    return NextResponse.json({ ...rest, coin: serializeCoin(coin) }, { headers: { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=10' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
