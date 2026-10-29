import { NextResponse } from 'next/server';
import { uploadMetadata } from '@/lib/irys';

export const runtime = 'nodejs';

// Token metadata limits (Metaplex): name 32 bytes, symbol 10 bytes.
const NAME_MAX = 32;
const SYMBOL_MAX = 10;

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const symbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
  if (!name || Buffer.byteLength(name) > NAME_MAX) return NextResponse.json({ error: `name: 1–${NAME_MAX} bytes` }, { status: 400 });
  if (!/^[A-Z0-9]+$/.test(symbol) || symbol.length > SYMBOL_MAX) return NextResponse.json({ error: `ticker: 1–${SYMBOL_MAX} letters or digits` }, { status: 400 });
  try {
    const uri = await uploadMetadata({ name, symbol, description: `${name} (${symbol}) — launched on QUAD, quoted in HYPE.` });
    return NextResponse.json({ uri });
  } catch (e) {
    return NextResponse.json({ error: `metadata upload failed: ${String(e)}` }, { status: 502 });
  }
}
