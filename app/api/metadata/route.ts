import { NextResponse } from 'next/server';
import { uploadCoinMetadata } from '@/lib/irys';
import { InputError, parseLaunchInput } from '@/lib/launch-input';

export const runtime = 'nodejs';

/** The coin's image and metadata JSON, uploaded to Irys; returns the `uri` the launch writes into the mint. */
export async function POST(req: Request) {
  let input;
  try {
    input = parseLaunchInput(await req.json().catch(() => null));
  } catch (e) {
    return NextResponse.json({ error: e instanceof InputError ? e.message : String(e) }, { status: 400 });
  }
  try {
    return NextResponse.json(await uploadCoinMetadata(input));
  } catch (e) {
    return NextResponse.json({ error: `metadata upload failed: ${String(e)}` }, { status: 502 });
  }
}
