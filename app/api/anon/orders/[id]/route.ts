import { NextResponse } from 'next/server';
import { processOrder } from '@/lib/anon-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** An order's status. Reading it also moves it along (payment seen, launch due), so the page works without the worker. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const order = await processOrder(id);
    if (!order) return NextResponse.json({ error: 'no such order' }, { status: 404 });
    return NextResponse.json(order, { headers: { 'cache-control': 'no-store' } });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 503 });
  }
}
