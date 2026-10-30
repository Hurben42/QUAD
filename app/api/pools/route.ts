import { NextResponse } from 'next/server';
import { loadPools, serializeCoin } from '@/lib/pools-cache';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { coins, ...rest } = await loadPools();
    return NextResponse.json({ ...rest, coins: coins.map(serializeCoin) }, { headers: { 'cache-control': 'public, s-maxage=5, stale-while-revalidate=10' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
