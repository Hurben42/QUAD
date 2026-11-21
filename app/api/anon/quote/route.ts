import { NextResponse } from 'next/server';
import { getQuote } from '@/lib/anon-server';

export const dynamic = 'force-dynamic';

/** The rate, launch cost, first-buy cap and delay of an anonymous launch, for the form. */
export async function GET() {
  try {
    return NextResponse.json(await getQuote());
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
