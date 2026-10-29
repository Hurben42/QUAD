import { NextResponse } from 'next/server';
import { Connection } from '@solana/web3.js';
import { listCurveCoins } from '@/lib/dbc';

export const revalidate = 5;

export async function GET() {
  try {
    const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
    const coins = await listCurveCoins(connection);
    return NextResponse.json(coins.map((c) => ({ ...c, quoteRaised: c.quoteRaised.toString(), quoteThreshold: c.quoteThreshold.toString() })));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
