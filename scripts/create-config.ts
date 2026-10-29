/**
 * Creates the QUAD partner config on Meteora DBC.
 *
 *   pnpm config:devnet    (CLUSTER=devnet, use your own 8-decimal test quote mint in NEXT_PUBLIC_QUOTE_MINT)
 *   pnpm config:mainnet   (CLUSTER=mainnet-beta, real HYPE)
 *
 * Prints the config public key to put in NEXT_PUBLIC_DBC_CONFIG.
 *
 * Field names follow the DBC TypeScript SDK docs (createConfig). The SDK moves fast:
 * if a field is renamed in the installed version, TypeScript will tell you — fix the
 * name, never the value. Values come from lib/curve.ts and the constants below only.
 */
import 'dotenv/config';
import fs from 'node:fs';
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import BN from 'bn.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { buildQuadCurve, verifyCurve } from '../lib/curve';
import { readQuoteMint } from '../lib/hype';

// ---- QUAD constants (the four rules) ----------------------------------------
const TOTAL_COINS = 21_000_000n;
const BASE_DECIMALS = 6; // 6–9 allowed by DBC
const DEFAULT_THRESHOLD_HYPE = 50; // HYPE to graduate; the creator can pick a deeper curve later via per-coin configs
const FEE_DENOMINATOR = 1_000_000_000; // DBC fee numerators are over 1e9
const BASE_FEE = 0.03125; // 3.125% per trade
const ANTI_SNIPER_FEE = 0.5; // 50% on the first slots
const ANTI_SNIPER_PERIODS = 10; // slots (activationType 0) over which the fee decays to BASE_FEE
const CREATOR_TRADING_FEE_PERCENTAGE = 100; // of the 80% left after protocol: 100 → creator 2.5%, platform 0. Use 50 for a 1.25% / 1.25% split.
const MIGRATION_OPTION = 1; // DAMM v2
const MIGRATION_FEE_OPTION = 3; // post-graduation pool fee tier: 0=0.25% 1=0.3% 2=1% 3=2% 4=4% 5=6%
// ------------------------------------------------------------------------------

async function main() {
  const cluster = process.env.CLUSTER ?? 'devnet';
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? (cluster === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');
  const connection = new Connection(rpc, 'confirmed');
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.PAYER_KEYPAIR ?? './keys/payer.json', 'utf8'))));
  const feeClaimer = new PublicKey(process.env.NEXT_PUBLIC_FEE_CLAIMER ?? payer.publicKey);
  const quote = await readQuoteMint(connection, new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT!));

  const totalSupply = TOTAL_COINS * 10n ** BigInt(BASE_DECIMALS);
  const migrationQuote = BigInt(DEFAULT_THRESHOLD_HYPE) * 10n ** BigInt(quote.decimals);
  const curve = buildQuadCurve({ totalSupply, migrationQuote });
  const check = verifyCurve(curve.sqrtStartPrice, curve.points);

  console.log(`cluster ${cluster} · quote ${quote.mint.toBase58()} (${quote.decimals} dec, ${quote.tokenType ? 'Token-2022' : 'SPL'})`);
  console.log(`curve base ${curve.curveBase} · migration base ${curve.migrationBase} · leftover ${curve.leftover}`);
  curve.eras.forEach((e, i) => console.log(`era ${i + 1}: base ${e.base} quote ${e.quote} avgPrice ${e.avgPrice.toExponential(4)}`));
  console.log(`verify: base ${check.base} quote ${check.quote}`);

  // exponential fee scheduler: cliff · (1 − r/10000)^N = BASE_FEE
  const reductionFactor = Math.round(10_000 * (1 - Math.pow(BASE_FEE / ANTI_SNIPER_FEE, 1 / ANTI_SNIPER_PERIODS)));

  const client = new DynamicBondingCurveClient(connection, 'confirmed');
  const config = Keypair.generate();

  const tx = await client.partner.createConfig({
    payer: payer.publicKey,
    config: config.publicKey,
    feeClaimer,
    leftoverReceiver: feeClaimer,
    quoteMint: quote.mint,
    poolFees: {
      baseFee: {
        cliffFeeNumerator: new BN(Math.round(ANTI_SNIPER_FEE * FEE_DENOMINATOR)),
        numberOfPeriod: ANTI_SNIPER_PERIODS,
        reductionFactor: new BN(reductionFactor),
        periodFrequency: new BN(1),
        feeSchedulerMode: 1, // exponential
      },
      dynamicFee: null,
    },
    activationType: 0, // slot
    collectFeeMode: 0, // quote only → fees in HYPE
    migrationOption: MIGRATION_OPTION,
    tokenType: 0, // base coin: SPL
    tokenDecimal: BASE_DECIMALS,
    migrationQuoteThreshold: new BN(migrationQuote.toString()),
    partnerLpPercentage: 0,
    creatorLpPercentage: 0,
    partnerLockedLpPercentage: 50,
    creatorLockedLpPercentage: 50,
    sqrtStartPrice: new BN(curve.sqrtStartPrice.toString()),
    lockedVesting: {
      amountPerPeriod: new BN(0),
      cliffDurationFromMigrationTime: new BN(0),
      frequency: new BN(0),
      numberOfPeriod: new BN(0),
      cliffUnlockAmount: new BN(0),
    },
    migrationFeeOption: MIGRATION_FEE_OPTION,
    tokenSupply: {
      preMigrationTokenSupply: new BN(totalSupply.toString()),
      postMigrationTokenSupply: new BN(totalSupply.toString()),
    },
    creatorTradingFeePercentage: CREATOR_TRADING_FEE_PERCENTAGE,
    // TODO(sdk): token update authority = immutable, and "first swap with min fee" for the creator's bundled buy.
    // Both exist in the DBC config (see docs); check the field names in the installed SDK version and set them here.
    padding0: [],
    padding1: [],
    curve: curve.points.map((p) => ({ sqrtPrice: new BN(p.sqrtPrice.toString()), liquidity: new BN(p.liquidity.toString()) })),
  } as any);

  const sig = await sendAndConfirmTransaction(connection, tx, [payer, config]);
  console.log(`\nconfig created: ${config.publicKey.toBase58()}\ntx ${sig}\n→ NEXT_PUBLIC_DBC_CONFIG=${config.publicKey.toBase58()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
