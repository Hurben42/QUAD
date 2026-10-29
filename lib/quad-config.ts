/**
 * The QUAD partner config for Meteora DBC, as SDK parameters.
 *
 * Pure: no RPC. scripts/create-config.ts reads the quote mint on-chain and passes its
 * decimals here; tests call it directly and run the SDK's own validation on the result.
 *
 * Field names follow @meteora-ag/dynamic-bonding-curve-sdk 1.5.x (CreateConfigParams).
 * If a field is renamed in a later version, TypeScript will tell you — fix the name, never the value.
 */
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';
import {
  ActivationType,
  BaseFeeMode,
  CollectFeeMode,
  MigrationFeeOption,
  MigrationOption,
  TokenAuthorityOption,
  TokenType,
  type CreateConfigParams,
} from '@meteora-ag/dynamic-bonding-curve-sdk';
import { buildQuadCurve, type QuadCurve } from './curve';

// ---- QUAD constants (the four rules) ----------------------------------------
export const TOTAL_COINS = 21_000_000n;
export const BASE_DECIMALS = 6; // 6–9 allowed by DBC
export const DEFAULT_THRESHOLD_HYPE = 50; // HYPE to graduate; the creator can pick a deeper curve later via per-coin configs
export const FEE_DENOMINATOR = 1_000_000_000; // DBC fee numerators are over 1e9
export const BASE_FEE = 0.03125; // 3.125% per trade
export const ANTI_SNIPER_FEE = 0.5; // 50% on the first slots
export const ANTI_SNIPER_PERIODS = 10; // slots (activationType 0) over which the fee decays to BASE_FEE
export const CREATOR_TRADING_FEE_PERCENTAGE = 100; // of the 80% left after protocol: 100 → creator 2.5%, platform 0. Use 50 for a 1.25% / 1.25% split.
export const MIGRATION_OPTION = MigrationOption.MET_DAMM_V2;
export const MIGRATION_FEE_OPTION = MigrationFeeOption.FixedBps200; // post-graduation pool fee tier: 0=0.25% 1=0.3% 2=1% 3=2% 4=4% 5=6%
// ------------------------------------------------------------------------------

export type QuadConfigInput = {
  payer: PublicKey;
  config: PublicKey;
  feeClaimer: PublicKey;
  quoteMint: PublicKey;
  /** read on-chain (lib/hype.ts#readQuoteMint), never assumed */
  quoteDecimals: number;
  thresholdHype?: number;
};

export function buildQuadConfigParams(input: QuadConfigInput): { params: CreateConfigParams; curve: QuadCurve } {
  const totalSupply = TOTAL_COINS * 10n ** BigInt(BASE_DECIMALS);
  const migrationQuote = BigInt(input.thresholdHype ?? DEFAULT_THRESHOLD_HYPE) * 10n ** BigInt(input.quoteDecimals);
  const curve = buildQuadCurve({ totalSupply, migrationQuote });

  // exponential fee scheduler: cliff · (1 − r/10000)^N = BASE_FEE
  const reductionFactor = Math.round(10_000 * (1 - Math.pow(BASE_FEE / ANTI_SNIPER_FEE, 1 / ANTI_SNIPER_PERIODS)));
  const zeroLiquidityVesting = { vestingPercentage: 0, bpsPerPeriod: 0, numberOfPeriods: 0, cliffDurationFromMigrationTime: 0, frequency: 0 };

  const params: CreateConfigParams = {
    payer: input.payer,
    config: input.config,
    feeClaimer: input.feeClaimer,
    leftoverReceiver: input.feeClaimer,
    quoteMint: input.quoteMint,
    poolFees: {
      baseFee: {
        cliffFeeNumerator: new BN(Math.round(ANTI_SNIPER_FEE * FEE_DENOMINATOR)),
        firstFactor: ANTI_SNIPER_PERIODS, // numberOfPeriod
        secondFactor: new BN(1), // periodFrequency, in slots
        thirdFactor: new BN(reductionFactor), // reductionFactor, bps per period
        baseFeeMode: BaseFeeMode.FeeSchedulerExponential,
      },
      dynamicFee: null,
    },
    activationType: ActivationType.Slot,
    collectFeeMode: CollectFeeMode.QuoteToken, // fees in HYPE only
    migrationOption: MIGRATION_OPTION,
    tokenType: TokenType.SPLToken, // base coin: SPL
    tokenDecimal: BASE_DECIMALS,
    migrationQuoteThreshold: new BN(migrationQuote.toString()),
    partnerLiquidityPercentage: 0,
    creatorLiquidityPercentage: 0,
    partnerPermanentLockedLiquidityPercentage: 50,
    creatorPermanentLockedLiquidityPercentage: 50,
    partnerLiquidityVestingInfo: zeroLiquidityVesting,
    creatorLiquidityVestingInfo: zeroLiquidityVesting,
    sqrtStartPrice: new BN(curve.sqrtStartPrice.toString()),
    lockedVesting: {
      amountPerPeriod: new BN(0),
      cliffDurationFromMigrationTime: new BN(0),
      frequency: new BN(0),
      numberOfPeriod: new BN(0),
      cliffUnlockAmount: new BN(0),
    },
    migrationFeeOption: MIGRATION_FEE_OPTION,
    // fixed-tier migration: no custom migrated pool fee, no migration fee taken from the threshold
    migrationFee: { feePercentage: 0, creatorFeePercentage: 0 },
    migratedPoolFee: { collectFeeMode: 0, dynamicFee: 0, poolFeeBps: 0 },
    migratedPoolBaseFeeMode: 0,
    migratedPoolMarketCapFeeSchedulerParams: { numberOfPeriod: 0, sqrtPriceStepBps: 0, schedulerExpirationDuration: 0, reductionFactor: new BN(0) },
    compoundingFeeBps: 0,
    poolCreationFee: new BN(0),
    tokenSupply: {
      preMigrationTokenSupply: new BN(totalSupply.toString()),
      postMigrationTokenSupply: new BN(totalSupply.toString()),
    },
    creatorTradingFeePercentage: CREATOR_TRADING_FEE_PERCENTAGE,
    tokenUpdateAuthority: TokenAuthorityOption.Immutable, // metadata frozen at launch
    enableFirstSwapWithMinFee: true, // the creator's buy in the launch tx pays BASE_FEE, not the anti-sniper fee
    padding: [],
    curve: curve.points.map((p) => ({ sqrtPrice: new BN(p.sqrtPrice.toString()), liquidity: new BN(p.liquidity.toString()) })),
  };
  return { params, curve };
}
