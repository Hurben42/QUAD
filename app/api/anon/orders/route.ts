import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';
import { OrderError, createOrder } from '@/lib/anon-server';
import { InputError, parseLaunchInput } from '@/lib/launch-input';

export const runtime = 'nodejs';

/** An anonymous launch order: the coin, the first buy, the claim key. Answers with where and how much to pay. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  try {
    const input = parseLaunchInput(body);
    const firstBuy = body?.firstBuy === undefined || body?.firstBuy === '' ? 0 : Number(body.firstBuy);
    let claimKey: PublicKey;
    try {
      claimKey = new PublicKey(String(body?.claimKey ?? ''));
    } catch {
      throw new InputError('claim key: not a Solana address');
    }
    return NextResponse.json(await createOrder(input, firstBuy, claimKey), { status: 201 });
  } catch (e) {
    if (e instanceof InputError || e instanceof OrderError) return NextResponse.json({ error: e.message }, { status: 400 });
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
