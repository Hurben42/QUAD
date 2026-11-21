import { NextResponse } from 'next/server';
import { processAll } from '@/lib/anon-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The worker's tick (scripts/anon-worker.ts): every open order, once. Bearer ANON_WORKER_TOKEN. */
export async function POST(req: Request) {
  const token = process.env.ANON_WORKER_TOKEN;
  if (!token || req.headers.get('authorization') !== `Bearer ${token}`) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  try {
    return NextResponse.json({ open: await processAll() });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
