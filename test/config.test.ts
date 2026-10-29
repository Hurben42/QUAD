import { describe, it, expect } from 'vitest';
import { Keypair } from '@solana/web3.js';
import BN from 'bn.js';
import {
  Rounding,
  getBaseTokenForSwap,
  getCurveBreakdown,
  getDeltaAmountBaseUnsigned,
  getDeltaAmountQuoteUnsigned,
  getFeeSchedulerMinBaseFeeNumerator,
  getMigrationBaseToken,
  getMigrationThresholdPrice,
  getSwapAmountWithBuffer,
  validateConfigParameters,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { verifyCurve } from '../lib/curve';
import { buildQuadConfigParams } from '../lib/quad-config';

const k = () => Keypair.generate().publicKey;
const big = (b: BN) => BigInt(b.toString());

// The SDK's helpers are the oracle here: they mirror the program's checks on createConfig.
describe.each([8, 9, 6])('quad config, quote at %i decimals', (quoteDecimals) => {
  const { params, curve } = buildQuadConfigParams({ payer: k(), config: k(), feeClaimer: k(), quoteMint: k(), quoteDecimals });
  const v = verifyCurve(curve.sqrtStartPrice, curve.points);

  it('passes the SDK validation (same check createConfig runs before building the tx)', () => {
    const { config, feeClaimer, quoteMint, payer, tokenBadge, ...configParam } = params;
    expect(() => validateConfigParameters({ ...configParam, leftoverReceiver: params.leftoverReceiver } as any)).not.toThrow();
  });

  it('matches the SDK per segment, base and quote', () => {
    let lower = params.sqrtStartPrice;
    params.curve.forEach((p, i) => {
      expect(big(getDeltaAmountBaseUnsigned(lower, p.sqrtPrice, p.liquidity, Rounding.Up))).toBe(v.segments[i].base);
      expect(big(getDeltaAmountQuoteUnsigned(lower, p.sqrtPrice, p.liquidity, Rounding.Up))).toBe(v.segments[i].quote);
      expect(v.segments[i].base).toBe(curve.eras[i].base);
      lower = p.sqrtPrice;
    });
  });

  it('graduates exactly at the end of era 4, after equal HYPE per era', () => {
    const sMig = getMigrationThresholdPrice(params.migrationQuoteThreshold, params.sqrtStartPrice, params.curve);
    expect(big(sMig)).toBe(curve.points[3].sqrtPrice);
    const { segmentAmounts } = getCurveBreakdown(params.migrationQuoteThreshold, params.sqrtStartPrice, params.curve);
    const q = big(params.migrationQuoteThreshold) / 4n;
    segmentAmounts.forEach((a) => expect(big(a)).toBe(q));
  });

  it('fits the fixed supply with the program rounding, no swap buffer needed', () => {
    const sMig = getMigrationThresholdPrice(params.migrationQuoteThreshold, params.sqrtStartPrice, params.curve);
    const swap = getBaseTokenForSwap(params.sqrtStartPrice, sMig, params.curve);
    const buffered = getSwapAmountWithBuffer(swap, params.sqrtStartPrice, params.curve);
    const migration = getMigrationBaseToken(params.migrationQuoteThreshold, sMig, params.migrationOption);
    expect(big(swap)).toBe(curve.curveBase);
    expect(big(buffered)).toBe(curve.curveBase); // the curve ends at the migration price: the 25% buffer caps at the curve itself
    expect(big(migration)).toBe(curve.migrationBase);
    const supply = big(params.tokenSupply!.preMigrationTokenSupply);
    expect(curve.curveBase + curve.migrationBase + curve.leftover).toBe(supply);
    expect(curve.leftover >= 0n).toBe(true);
    // dust only: one quote lamport is worth ~supply/threshold base lamports, so the rounding
    // leaves a few coins at most (1.2 coins of 1B at 8 decimals, 12 at 6) — under 1e-7 of supply
    expect(Number(curve.leftover) / Number(supply)).toBeLessThan(1e-7);
  });
});

describe('fee scheduler', () => {
  const { params } = buildQuadConfigParams({ payer: k(), config: k(), feeClaimer: k(), quoteMint: k(), quoteDecimals: 8 });
  const f = params.poolFees.baseFee;

  it('starts at 50% and decays to the 3.125% trade fee (within 0.01 percentage point)', () => {
    expect(f.cliffFeeNumerator.toNumber()).toBe(500_000_000);
    const min = getFeeSchedulerMinBaseFeeNumerator(f.cliffFeeNumerator, f.firstFactor, f.thirdFactor, f.baseFeeMode).toNumber();
    expect(Math.abs(min - 31_250_000)).toBeLessThan(100_000);
  });
});
