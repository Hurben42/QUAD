/** The optional links of a coin, as the launch form collects them and the metadata JSON stores them. */
export type CoinLinks = { website?: string; twitter?: string; telegram?: string };
export type LinkKind = keyof CoinLinks;

const HANDLE = /^@?([A-Za-z0-9_]{1,32})$/;

/**
 * "@hypedog" → https://x.com/hypedog, "t.me/hypedog" → https://t.me/hypedog, "hypedog.xyz" → https://hypedog.xyz.
 * Returns undefined for an empty value; throws for anything that is not an http(s) URL.
 */
export function normalizeLink(kind: LinkKind, value: string): string | undefined {
  const v = value.trim();
  if (!v) return undefined;
  const handle = v.match(HANDLE)?.[1];
  const raw = handle && kind === 'twitter' ? `https://x.com/${handle}` : handle && kind === 'telegram' ? `https://t.me/${handle}` : /^[a-z]+:\/\//i.test(v) ? v : `https://${v}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`${label(kind)}: not a valid link`);
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') throw new Error(`${label(kind)}: links start with https://`);
  if (raw.length > 200) throw new Error(`${label(kind)}: link too long`);
  return url.toString();
}

export const label = (kind: LinkKind) => ({ website: 'Website', twitter: 'X', telegram: 'Telegram' })[kind];

/** https://x.com/hypedog → x.com/@hypedog, https://t.me/hypedog → t.me/hypedog, https://hypedog.xyz/ → hypedog.xyz */
export function prettyLink(kind: LinkKind, url: string): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return url;
  }
  const host = u.host.replace(/^www\./, '');
  const path = u.pathname.replace(/\/+$/, '');
  if (kind === 'twitter' && /^(x|twitter)\.com$/.test(host) && /^\/[A-Za-z0-9_]+$/.test(path)) return `x.com/@${path.slice(1)}`;
  return `${host}${path}${u.search}`;
}
