/**
 * QUAD curve math — four eras, equal HYPE per era, price doubling per era.
 *
 * Pure functions on bigint. See docs/MECHANISM.md for the derivation.
 * Everything here is in lamports (smallest units) of the base and quote mints.
 *
 * Rounding and the migration formula mirror the DBC program (as exposed by the SDK's
 * getBaseTokenForSwap / getMigrationBaseToken), so the amounts here are the ones the
 * program checks against tokenSupply — not approximations of them.
 */

export const ERAS = 4;
export const Q64 = 1n << 64n;
export const Q128 = 1n << 128n;

/** Sqrt price bounds of the DBC program (Q64), also the DAMM v2 full range. */
export const MIN_SQRT_PRICE = 4295048016n;
export const MAX_SQRT_PRICE = 79226673521066979257578248091n;

export type CurvePoint = { sqrtPrice: bigint; liquidity: bigint };

export type QuadCurve = {
  /** sqrt start price, Q64 */
  sqrtStartPrice: bigint;
  /** 4 points, ascending; the last one is the end of era 4 */
  points: CurvePoint[];
  /** base tokens sold on the curve (sum of the 4 eras, rounded up per segment like the program) */
  curveBase: bigint;
  /** base tokens the program will migrate with the raised quote (DAMM v2 full-range position) */
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
  /** migration fee taken from the threshold, in whole percent (0–99). 0 unless you set migrationFee in the config */
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

const divUp = (a: bigint, b: bigint) => (a + b - 1n) / b;

/** Base out of a constant-product segment, rounded up (program: get_delta_amount_base_unsigned, Rounding::Up). */
export const segmentBase = (lower: bigint, upper: bigint, liquidity: bigint) => divUp(liquidity * (upper - lower), lower * upper);
/** Quote into a constant-product segment, rounded up (program: get_delta_amount_quote_unsigned, Rounding::Up). */
export const segmentQuote = (lower: bigint, upper: bigint, liquidity: bigint) => divUp(liquidity * (upper - lower), Q128);

/**
 * Base the program deposits next to `quote` when it migrates to DAMM v2: a full-range position
 * [MIN_SQRT_PRICE, MAX_SQRT_PRICE] opened at sqrtPrice. Slightly more than quote / P because the
 * range starts at MIN_SQRT_PRICE, not 0.
 */
export function migrationBaseDammV2(quote: bigint, sqrtPrice: bigint): bigint {
  const liquidity = (quote << 128n) / (sqrtPrice - MIN_SQRT_PRICE);
  return segmentBase(sqrtPrice, MAX_SQRT_PRICE, liquidity);
}

/** The curve for a given number of base tokens sold on it. */
function curveFor(curveBaseTarget: bigint, migrationQuote: bigint, feePercent: bigint, totalSupply: bigint): QuadCurve {
  // P0 = (Q/4) · √2 · 15/16 / B   (quote lamports per base lamport)
  const quotePerEra = migrationQuote / BigInt(ERAS);
  const p0 = (Number(quotePerEra) * SQRT2 * 15) / 16 / Number(curveBaseTarget);
  const sqrtP0 = Math.sqrt(p0);

  // sqrt prices in Q64: s_i = sqrt(P0) · 2^(i/2) · 2^64
  const sqrtPrices: bigint[] = [];
  for (let i = 0; i <= ERAS; i++) sqrtPrices.push(toQ64(sqrtP0 * Math.pow(2, i / 2)));
  if (sqrtPrices[0] < MIN_SQRT_PRICE) throw new Error('curve start below MIN_SQRT_PRICE: raise the threshold or lower the supply');
  if (sqrtPrices[ERAS] >= MAX_SQRT_PRICE) throw new Error('curve end exceeds MAX_SQRT_PRICE: lower the threshold or raise the supply');

  const points: CurvePoint[] = [];
  const eras: QuadCurve['eras'] = [];
  let soldBase = 0n;
  for (let i = 1; i <= ERAS; i++) {
    const sPrev = sqrtPrices[i - 1];
    const sNext = sqrtPrices[i];
    // floor: with quote rounded up, each segment still takes exactly quotePerEra to cross
    const liquidity = (quotePerEra * Q128) / (sNext - sPrev);
    points.push({ sqrtPrice: sNext, liquidity });
    const base = segmentBase(sPrev, sNext, liquidity);
    const quote = segmentQuote(sPrev, sNext, liquidity);
    soldBase += base;
    eras.push({ base, quote, avgPrice: Number(quote) / Number(base) });
  }

  // migration: the program moves Q·(100−fee)/100 quote and its DAMM v2 base into the new pool
  const quoteMigrated = (migrationQuote * (100n - feePercent)) / 100n;
  const migrationBase = migrationBaseDammV2(quoteMigrated, sqrtPrices[ERAS]);
  const leftover = totalSupply - soldBase - migrationBase;
  return { sqrtStartPrice: sqrtPrices[0], points, curveBase: soldBase, migrationBase, leftover, eras };
}

/**
 * Build the 4-era curve. Base sold on the curve is chosen so that
 * curve + migration ≤ total supply, with the leftover as small as the rounding allows.
 */
export function buildQuadCurve(input: QuadCurveInput): QuadCurve {
  const { totalSupply, migrationQuote } = input;
  const feePercent = input.migrationFeePercent ?? 0;
  if (totalSupply <= 0n || migrationQuote <= 0n) throw new Error('supply and quote must be > 0');
  if (!Number.isInteger(feePercent) || feePercent < 0 || feePercent > 99) throw new Error('migrationFeePercent must be a whole number 0–99');

  // B = supply / (1 + k·feeFactor) — migration takes k·feeFactor·B. Float first, then step down by
  // the exact overshoot until the program's own rounding fits in the supply (1–2 rounds in practice).
  const k = MIGRATION_RATIO * (1 - feePercent / 100);
  let target = BigInt(Math.floor(Number(totalSupply) / (1 + k)));
  for (let i = 0; i < 8; i++) {
    const c = curveFor(target, migrationQuote, BigInt(feePercent), totalSupply);
    if (c.leftover >= 0n) return c;
    target -= -c.leftover;
  }
  throw new Error('curve + migration exceed supply — check inputs');
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
 * Recompute base/quote per segment from (sqrtStart, points) with the program's formulas and rounding.
 * Use it to compare against what the SDK reports for a created config.
 */
export function verifyCurve(sqrtStartPrice: bigint, points: CurvePoint[]) {
  let prev = sqrtStartPrice;
  let base = 0n;
  let quote = 0n;
  const segments = points.map((p) => {
    const b = segmentBase(prev, p.sqrtPrice, p.liquidity);
    const q = segmentQuote(prev, p.sqrtPrice, p.liquidity);
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
