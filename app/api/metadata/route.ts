import { NextResponse } from 'next/server';
import { uploadImage, uploadMetadata, type CoinMetadata } from '@/lib/irys';
import { normalizeLink, type CoinLinks } from '@/lib/links';

export const runtime = 'nodejs';

// Token metadata limits (Metaplex): name 32 bytes, symbol 10 bytes.
const NAME_MAX = 32;
const SYMBOL_MAX = 10;
const DESCRIPTION_MAX = 280;
/** Irys uploads under 100 KiB are free; the browser resizes to stay under this. */
const IMAGE_MAX_BYTES = 100 * 1024;
const IMAGE_TYPES = ['png', 'jpeg', 'webp'] as const;

/** A data URL from lib/image.ts → bytes and MIME type. */
function decodeImage(dataUrl: string): { data: Buffer; type: string } {
  const m = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m || !IMAGE_TYPES.includes(m[1] as (typeof IMAGE_TYPES)[number])) throw new Error('image: PNG, JPEG or WebP, as a data URL');
  const data = Buffer.from(m[2], 'base64');
  if (data.length === 0 || data.length > IMAGE_MAX_BYTES) throw new Error(`image: up to ${IMAGE_MAX_BYTES / 1024} KiB`);
  return { data, type: `image/${m[1]}` };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const symbol = typeof body?.symbol === 'string' ? body.symbol.trim().toUpperCase() : '';
  if (!name || Buffer.byteLength(name) > NAME_MAX) return NextResponse.json({ error: `name: 1–${NAME_MAX} bytes` }, { status: 400 });
  const custom = typeof body?.description === 'string' ? body.description.trim() : '';
  if (custom.length > DESCRIPTION_MAX) return NextResponse.json({ error: `description: up to ${DESCRIPTION_MAX} characters` }, { status: 400 });
  if (!/^[A-Z0-9]+$/.test(symbol) || symbol.length > SYMBOL_MAX) return NextResponse.json({ error: `ticker: 1–${SYMBOL_MAX} letters or digits` }, { status: 400 });

  let image: { data: Buffer; type: string } | null = null;
  const links: CoinLinks = {};
  try {
    if (typeof body?.image === 'string' && body.image) image = decodeImage(body.image);
    for (const kind of ['website', 'twitter', 'telegram'] as const) {
      const v = typeof body?.[kind] === 'string' ? normalizeLink(kind, body[kind]) : undefined;
      if (v) links[kind] = v;
    }
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }

  try {
    const meta: CoinMetadata = { name, symbol, description: custom || `${name} (${symbol}) — launched on QUAD, quoted in HYPE.` };
    if (image) {
      meta.image = await uploadImage(image.data, image.type);
      meta.properties = { files: [{ uri: meta.image, type: image.type }], category: 'image' };
    }
    if (links.website) meta.external_url = links.website;
    if (Object.keys(links).length > 0) meta.extensions = links;
    const uri = await uploadMetadata(meta);
    return NextResponse.json({ uri, image: meta.image ?? null });
  } catch (e) {
    return NextResponse.json({ error: `metadata upload failed: ${String(e)}` }, { status: 502 });
  }
}
