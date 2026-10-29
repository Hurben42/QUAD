/**
 * QUAD curve math — four eras, equal HYPE per era, price doubling per era.
 *
 * Pure functions on bigint. See docs/MECHANISM.md for the derivation.
 * Everything here is in lamports (smallest units) of the base and quote mints.
 */

export const ERAS = 4;
export const Q64 = 1n << 64n;
export const Q128 = 1n << 128n;

/** Max sqrt price accepted by the DBC program (from Meteora docs). */
export const MAX_SQRT_PRICE = 79226673521066979257578248091n;

export type CurvePoint = { sqrtPrice: bigint; liquidity: bigint };

export type QuadCurve = {
  /** sqrt start price, Q64 */
  sqrtStartPrice: bigint;
  /** 4 points, ascending; the last one is the end of era 4 */
  points: CurvePoint[];
  /** base tokens sold on the curve (sum of the 4 eras) */
  curveBase: bigint;
  /** base tokens the program will migrate with the raised quote */
  migrationBase: bigint;
  /** supply − curveBase − migrationBase (dust, goes to leftoverReceiver) */
  leftover: bigint;
  /** per-era amounts, for display and tests */
  eras: { base: bigint; quote: bigint; avgPrice: number }[];
};

export type QuadCurveInput = {
  /** total supply in base lamports, e.g. 21_000_000n * 10n ** 6n */
  totalSupply: bigint;
  /** migration quote threshold in quote lamports (HYPE) */
  migrationQuote: bigint;
  /** migration fee taken from the threshold, in percent (0–99). 0 unless you set migrationFee in the config */
  migrationFeePercent?: number;
};

const SQRT2 = Math.SQRT2;
/** migrationBase / curveBase for a 4-era doubling curve: 4 / (15·√2) */
export const MIGRATION_RATIO = 4 / (15 * SQRT2);

/** sqrt(x) for bigint, floor. */
export function bigSqrt(x: bigint): bigint {
  if (x < 0n) throw new Error('negative');
  if (x < 2n) return x;
  let r = BigInt(Math.floor(Math.sqrt(Number(x))));
  // Newton refinement so large values are exact
  for (let i = 0; i < 64; i++) {
    const nr = (r + x / r) >> 1n;
    if (nr === r || nr === r - 1n || nr === r + 1n) {
      r = nr;
      break;
    }
    r = nr;
  }
  while (r * r > x) r -= 1n;
  while ((r + 1n) * (r + 1n) <= x) r += 1n;
  return r;
}

/**
 * Build the 4-era curve. Base sold on the curve is chosen so that
 * curve + migration ≈ total supply (leftover is rounding dust only).
 */
export function buildQuadCurve(input: QuadCurveInput): QuadCurve {
  const { totalSupply, migrationQuote } = input;
  const feeFactor = 1 - (input.migrationFeePercent ?? 0) / 100;
  if (totalSupply <= 0n || migrationQuote <= 0n) throw new Error('supply and quote must be > 0');

  // B = supply / (1 + k·feeFactor) — migration takes k·feeFactor·B
  const k = MIGRATION_RATIO * feeFactor;
  const curveBase = BigInt(Math.floor(Number(totalSupply) / (1 + k)));

  // P0 = (Q/4) · √2 · 15/16 / B   (quote lamports per base lamport)
  const quotePerEra = migrationQuote / BigInt(ERAS);
  const p0 = (Number(quotePerEra) * SQRT2 * 15) / 16 / Number(curveBase);
  const sqrtP0 = Math.sqrt(p0);

  // sqrt prices in Q64: s_i = sqrt(P0) · 2^(i/2) · 2^64
  const sqrtPrices: bigint[] = [];
  for (let i = 0; i <= ERAS; i++) {
    const s = sqrtP0 * Math.pow(2, i / 2);
    // split mantissa/exponent to keep precision when converting to bigint
    sqrtPrices.push(toQ64(s));
  }
  if (sqrtPrices[ERAS] >= MAX_SQRT_PRICE) throw new Error('curve end exceeds MAX_SQRT_PRICE: lower the threshold or raise the supply');

  const points: CurvePoint[] = [];
  const eras: QuadCurve['eras'] = [];
  let soldBase = 0n;
  for (let i = 1; i <= ERAS; i++) {
    const sPrev = sqrtPrices[i - 1];
    const sNext = sqrtPrices[i];
    const liquidity = (quotePerEra * Q128) / (sNext - sPrev);
    points.push({ sqrtPrice: sNext, liquidity });
    const base = (liquidity * (sNext - sPrev)) / (sPrev * sNext);
    const quote = (liquidity * (sNext - sPrev)) / Q128;
    soldBase += base;
    eras.push({ base, quote, avgPrice: Number(quote) / Number(base) });
  }

  // migration: the program puts Q·feeFactor quote and Q·feeFactor / P4 base in the pool
  const sEnd = sqrtPrices[ERAS];
  const quoteMigrated = BigInt(Math.floor(Number(migrationQuote) * feeFactor));
  const migrationBase = (quoteMigrated * Q128) / (sEnd * sEnd);
  const leftover = totalSupply - soldBase - migrationBase;
  if (leftover < 0n) throw new Error('curve + migration exceed supply — check inputs');

  return { sqrtStartPrice: sqrtPrices[0], points, curveBase: soldBase, migrationBase, leftover, eras };
}

/** Number → Q64 bigint without losing the 53-bit mantissa to float overflow. */
export function toQ64(x: number): bigint {
  if (!(x > 0)) throw new Error('sqrt price must be > 0');
  const exp = Math.floor(Math.log2(x));
  const mant = x / Math.pow(2, exp); // in [1, 2)
  const mantInt = BigInt(Math.round(mant * 2 ** 52)); // 53-bit mantissa
  const shift = 64 + exp - 52;
  return shift >= 0 ? mantInt << BigInt(shift) : mantInt >> BigInt(-shift);
}

/**
 * Recompute base/quote per segment from (sqrtStart, points) with the program's formulas.
 * Use it to compare against what the SDK reports for a created config.
 */
export function verifyCurve(sqrtStartPrice: bigint, points: CurvePoint[]) {
  let prev = sqrtStartPrice;
  let base = 0n;
  let quote = 0n;
  const segments = points.map((p) => {
    const b = (p.liquidity * (p.sqrtPrice - prev)) / (prev * p.sqrtPrice);
    const q = (p.liquidity * (p.sqrtPrice - prev)) / Q128;
    base += b;
    quote += q;
    prev = p.sqrtPrice;
    return { base: b, quote: q };
  });
  return { base, quote, segments };
}

/** Which era a pool is in, from the quote raised so far (0 → 1). */
export function eraOf(progress: number): 1 | 2 | 3 | 4 {
  if (progress < 0.25) return 1;
  if (progress < 0.5) return 2;
  if (progress < 0.75) return 3;
  return 4;
}

/** Share of the curve's coins per era, for the stepped bar (widths 8/4/2/1). */
export const ERA_WIDTHS = [8, 4, 2, 1] as const;
