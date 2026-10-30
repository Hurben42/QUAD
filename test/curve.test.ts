import { describe, it, expect } from 'vitest';
import { normalizeLink, prettyLink } from '../lib/links';
import { baseOutForQuote, buildQuadCurve, coins, price, priceAtProgress, verifyCurve, ERAS, BASE_DECIMALS, TOTAL_COINS, Q64, trackPosition } from '../lib/curve';

const SUPPLY = TOTAL_COINS * 10n ** BigInt(BASE_DECIMALS); // 1B coins, 6 decimals
const Q = 50n * 10n ** 8n; // 50 HYPE at 8 decimals

describe('quad curve', () => {
  const c = buildQuadCurve({ totalSupply: SUPPLY, migrationQuote: Q });

  it('has four ascending points', () => {
    expect(c.points).toHaveLength(ERAS);
    for (let i = 1; i < c.points.length; i++) expect(c.points[i].sqrtPrice > c.points[i - 1].sqrtPrice).toBe(true);
    expect(c.points[0].sqrtPrice > c.sqrtStartPrice).toBe(true);
  });

  it('raises the same HYPE in every era (±0.01%)', () => {
    const target = Number(Q) / ERAS;
    for (const e of c.eras) expect(Math.abs(Number(e.quote) - target) / target).toBeLessThan(1e-4);
  });

  it('sells half the coins of the previous era (±0.1%)', () => {
    for (let i = 1; i < ERAS; i++) {
      const ratio = Number(c.eras[i].base) / Number(c.eras[i - 1].base);
      expect(Math.abs(ratio - 0.5)).toBeLessThan(1e-3);
    }
  });

  it('doubles the average price every era (±0.1%)', () => {
    for (let i = 1; i < ERAS; i++) {
      const ratio = c.eras[i].avgPrice / c.eras[i - 1].avgPrice;
      expect(Math.abs(ratio - 2)).toBeLessThan(2e-3);
    }
  });

  it('uses the whole supply: curve + migration = total supply, leftover is dust', () => {
    const total = c.curveBase + c.migrationBase + c.leftover;
    expect(total).toBe(SUPPLY);
    expect(Number(c.leftover) / Number(SUPPLY)).toBeLessThan(1e-3);
    expect(Number(c.curveBase) / Number(SUPPLY)).toBeCloseTo(0.8413, 2);
  });

  it('verifyCurve recomputes the same totals from the points', () => {
    const v = verifyCurve(c.sqrtStartPrice, c.points);
    expect(v.base).toBe(c.curveBase);
    expect(Math.abs(Number(v.quote) - Number(Q)) / Number(Q)).toBeLessThan(1e-4);
  });
});

describe('first buy', () => {
  const c = buildQuadCurve({ totalSupply: SUPPLY, migrationQuote: Q });
  it('buying exactly era 1 gets era 1 coins (±1 lamport)', () => {
    const out = baseOutForQuote(c.sqrtStartPrice, c.points, c.eras[0].quote);
    expect(Number(c.eras[0].base - out)).toBeLessThanOrEqual(1);
  });
  it('buying half of era 1 gets more than half its coins (price rises within the era)', () => {
    const out = baseOutForQuote(c.sqrtStartPrice, c.points, c.eras[0].quote / 2n);
    expect(out > c.eras[0].base / 2n).toBe(true);
    expect(out < c.eras[0].base).toBe(true);
  });
  it('buying past the threshold caps at the whole curve (rounded down per segment)', () => {
    const out = baseOutForQuote(c.sqrtStartPrice, c.points, Q * 2n);
    expect(out <= c.curveBase).toBe(true);
    expect(c.curveBase - out <= BigInt(ERAS)).toBe(true);
  });
});

describe('display', () => {
  it('formats the supply', () => {
    expect(coins(TOTAL_COINS)).toBe('1,000,000,000');
    expect(coins(TOTAL_COINS, true)).toBe('1B');
    expect(coins(21_000_000n, true)).toBe('21M');
  });
  it('prints tiny prices with a zero count, never in e-notation', () => {
    expect(price(0.0000000197)).toBe('0.0₇197');
    expect(price(0.000123)).toBe('0.0₃123');
    expect(price(0.0123)).toBe('0.0123');
    expect(price(2.5)).toBe('2.5');
  });
});

describe('priceAtProgress', () => {
  const c = buildQuadCurve({ totalSupply: SUPPLY, migrationQuote: Q });
  const sq = (x: bigint) => (Number(x) / Number(Q64)) ** 2;
  it('starts at the start price and ends at the era 4 price', () => {
    expect(priceAtProgress(c, 0) / sq(c.sqrtStartPrice)).toBeCloseTo(1, 9);
    expect(priceAtProgress(c, 1) / sq(c.points[3].sqrtPrice)).toBeCloseTo(1, 9);
  });
  it('doubles from one era boundary to the next', () => {
    for (let i = 1; i < ERAS; i++) expect(priceAtProgress(c, i / ERAS) / priceAtProgress(c, (i - 1) / ERAS)).toBeCloseTo(2, 6);
  });
});

describe('trackPosition', () => {
  it('lands the end of each era on the end of its 8/4/2/1 segment', () => {
    expect(trackPosition(0)).toBe(0);
    expect(trackPosition(0.25)).toBeCloseTo(8 / 15, 12);
    expect(trackPosition(0.5)).toBeCloseTo(12 / 15, 12);
    expect(trackPosition(0.75)).toBeCloseTo(14 / 15, 12);
    expect(trackPosition(1)).toBeCloseTo(1, 12);
    expect(trackPosition(0.125)).toBeCloseTo(4 / 15, 12); // half of era 1 = half of its segment
  });
});

describe('normalizeLink', () => {
  it('turns handles and bare hosts into https links', () => {
    expect(normalizeLink('twitter', '@hypedog')).toBe('https://x.com/hypedog');
    expect(normalizeLink('telegram', 'hypedog')).toBe('https://t.me/hypedog');
    expect(normalizeLink('website', 'hypedog.xyz')).toBe('https://hypedog.xyz/');
    expect(normalizeLink('website', 'https://x.com/hypedog')).toBe('https://x.com/hypedog');
    expect(normalizeLink('website', '  ')).toBeUndefined();
    expect(() => normalizeLink('website', 'javascript:alert(1)')).toThrow();
  });
});

describe('prettyLink', () => {
  it('reads links the short way', () => {
    expect(prettyLink('twitter', 'https://x.com/sunriseapp')).toBe('x.com/@sunriseapp');
    expect(prettyLink('twitter', 'https://twitter.com/sunriseapp/')).toBe('x.com/@sunriseapp');
    expect(prettyLink('telegram', 'https://t.me/sunriseapp')).toBe('t.me/sunriseapp');
    expect(prettyLink('website', 'https://www.sunrise.xyz/')).toBe('sunrise.xyz');
    expect(prettyLink('website', 'https://sunrise.xyz/docs?v=2')).toBe('sunrise.xyz/docs?v=2');
  });
});
