import { NextResponse } from 'next/server';
import { loadPools, serializeCoin } from '@/lib/pools-cache';
import { anonymousPools } from '@/lib/anon-server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { coins, ...rest } = await loadPools();
    const anon = anonymousPools();
    return NextResponse.json({ ...rest, coins: coins.map((c) => serializeCoin(c, anon)) }, { headers: { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=10' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
