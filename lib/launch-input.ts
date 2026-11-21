/** The coin a launch form sends, checked once for /api/metadata and /api/anon/orders. */
import { normalizeLink, type CoinLinks } from './links';

// Token metadata limits (Metaplex): name 32 bytes, symbol 10 bytes.
export const NAME_MAX = 32;
export const SYMBOL_MAX = 10;
export const DESCRIPTION_MAX = 280;
/** Irys uploads under 100 KiB are free; the browser resizes to stay under this. */
export const IMAGE_MAX_BYTES = 100 * 1024;

export type LaunchInput = {
  name: string;
  symbol: string;
  description: string;
  /** data URL (PNG, JPEG or WebP) */
  image: string | null;
  links: CoinLinks;
};

export class InputError extends Error {}

/** A data URL from lib/image.ts → bytes and MIME type. */
export function decodeImage(dataUrl: string): { data: Buffer; type: string } {
  const m = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/);
  if (!m) throw new InputError('image: PNG, JPEG or WebP, as a data URL');
  const data = Buffer.from(m[2], 'base64');
  if (data.length === 0 || data.length > IMAGE_MAX_BYTES) throw new InputError(`image: up to ${IMAGE_MAX_BYTES / 1024} KiB`);
  return { data, type: `image/${m[1]}` };
}

/** Throws InputError with a message for the form. */
export function parseLaunchInput(body: unknown): LaunchInput {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const symbol = typeof b.symbol === 'string' ? b.symbol.trim().toUpperCase() : '';
  const description = typeof b.description === 'string' ? b.description.trim() : '';
  if (!name || Buffer.byteLength(name) > NAME_MAX) throw new InputError(`name: 1–${NAME_MAX} bytes`);
  if (!/^[A-Z0-9]+$/.test(symbol) || symbol.length > SYMBOL_MAX) throw new InputError(`ticker: 1–${SYMBOL_MAX} letters or digits`);
  if (description.length > DESCRIPTION_MAX) throw new InputError(`description: up to ${DESCRIPTION_MAX} characters`);
  const image = typeof b.image === 'string' && b.image ? b.image : null;
  if (image) decodeImage(image);
  const links: CoinLinks = {};
  for (const kind of ['website', 'twitter', 'telegram'] as const) {
    try {
      const v = typeof b[kind] === 'string' ? normalizeLink(kind, b[kind] as string) : undefined;
      if (v) links[kind] = v;
    } catch (e) {
      throw new InputError(e instanceof Error ? e.message : String(e));
    }
  }
  return { name, symbol, description, image, links };
}
