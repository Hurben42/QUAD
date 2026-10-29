/**
 * Reads the QUAD config back from chain and checks it against lib/curve.ts.
 *
 *   pnpm config:verify    (uses NEXT_PUBLIC_DBC_CONFIG)
 *
 * The program stores what it computed at createConfig (swapBaseAmount, migrationBaseThreshold,
 * migrationSqrtPrice); the SDK helpers recompute each segment from the stored curve. Both must
 * equal verifyCurve() and buildQuadCurve() to the lamport.
 */
import './env';
import { Connection, PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import { DynamicBondingCurveClient, Rounding, getDeltaAmountBaseUnsigned, getDeltaAmountQuoteUnsigned } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { buildQuadCurve, verifyCurve } from '../lib/curve';
import { readQuoteMint } from '../lib/hype';

const big = (b: BN) => BigInt(b.toString());

async function main() {
  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com', 'confirmed');
  const client = new DynamicBondingCurveClient(connection, 'confirmed');
  const address = new PublicKey(process.env.NEXT_PUBLIC_DBC_CONFIG!);
  const cfg = await client.state.getPoolConfig(address);
  if (!cfg) throw new Error(`config ${address.toBase58()} not found on this cluster`);
  const quote = await readQuoteMint(connection, cfg.quoteMint);

  // on-chain curve is padded to 16 points with zeros
  const points = cfg.curve.filter((p) => !p.sqrtPrice.isZero()).map((p) => ({ sqrtPrice: big(p.sqrtPrice), liquidity: big(p.liquidity) }));
  const v = verifyCurve(big(cfg.sqrtStartPrice), points);
  const expected = buildQuadCurve({ totalSupply: big(cfg.preMigrationTokenSupply), migrationQuote: big(cfg.migrationQuoteThreshold), migrationFeePercent: cfg.migrationFeePercentage });

  const rows: [string, bigint, bigint][] = [];
  let lower = cfg.sqrtStartPrice;
  points.forEach((p, i) => {
    const upper = new BN(p.sqrtPrice.toString());
    const liq = new BN(p.liquidity.toString());
    rows.push([`era ${i + 1} base (SDK)`, big(getDeltaAmountBaseUnsigned(lower, upper, liq, Rounding.Up)), v.segments[i].base]);
    rows.push([`era ${i + 1} quote (SDK)`, big(getDeltaAmountQuoteUnsigned(lower, upper, liq, Rounding.Up)), v.segments[i].quote]);
    lower = upper;
  });
  rows.push(['swapBaseAmount (program)', big(cfg.swapBaseAmount), v.base]);
  rows.push(['migrationBaseThreshold (program)', big(cfg.migrationBaseThreshold), expected.migrationBase]);
  rows.push(['migrationSqrtPrice (program)', big(cfg.migrationSqrtPrice), points[points.length - 1].sqrtPrice]);
  rows.push(['sqrtStartPrice (lib/curve)', big(cfg.sqrtStartPrice), expected.sqrtStartPrice]);
  rows.push(['curve base (lib/curve)', v.base, expected.curveBase]);

  console.log(`config ${address.toBase58()} · quote ${cfg.quoteMint.toBase58()} (${quote.decimals} dec) · threshold ${cfg.migrationQuoteThreshold}`);
  let ok = true;
  for (const [label, chain, ours] of rows) {
    const same = chain === ours;
    ok &&= same;
    console.log(`${same ? 'ok  ' : 'DIFF'} ${label.padEnd(34)} chain ${chain}  ours ${ours}${same ? '' : `  Δ ${chain - ours}`}`);
  }
  console.log(`\nfee: cliff ${cfg.poolFees.baseFee.cliffFeeNumerator} · first swap at min fee ${cfg.enableFirstSwapWithMinFee} · token update authority ${cfg.tokenUpdateAuthority} · creator share ${cfg.creatorTradingFeePercentage}%`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
