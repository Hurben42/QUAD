/**
 * Client helpers around the Meteora DBC SDK for QUAD.
 * Everything that touches a wallet returns a Transaction for the wallet adapter to sign.
 */
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress, deriveMintMetadata } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { eraOf, Q128 } from './curve';
import { HYPE_MINT } from './hype';

export const DBC_CONFIG = new PublicKey(process.env.NEXT_PUBLIC_DBC_CONFIG || '11111111111111111111111111111111');
export const QUOTE_MINT = new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT || HYPE_MINT);

export const makeClient = (connection: Connection) => new DynamicBondingCurveClient(connection, 'confirmed');

export type LaunchParams = {
  name: string;
  symbol: string;
  /** metadata JSON uri (uploaded to Irys by /api/metadata) */
  uri: string;
  /** wallet that signs, pays, and receives the creator fees */
  creator: PublicKey;
  /** optional first buy, in quote lamports (HYPE) — pays the minimum fee, not the anti-sniper fee */
  firstBuyQuoteLamports?: bigint;
};

/**
 * Build the launch transaction: create the pool, and the creator's first buy in the same tx when asked.
 * Signers: the creator (wallet) and the returned base mint keypair — pass it as `signers` to
 * wallet-adapter's sendTransaction so it signs after the blockhash is set.
 */
export async function buildLaunchTx(connection: Connection, p: LaunchParams): Promise<{ tx: Transaction; baseMint: Keypair; pool: PublicKey }> {
  const client = makeClient(connection);
  const baseMint = Keypair.generate();
  const createPoolParam = {
    name: p.name,
    symbol: p.symbol.toUpperCase(),
    uri: p.uri,
    payer: p.creator,
    poolCreator: p.creator,
    config: DBC_CONFIG,
    baseMint: baseMint.publicKey,
  };
  const buy = p.firstBuyQuoteLamports ?? 0n;
  const tx = await client.creator.createPoolWithFirstBuy({
    createPoolParam,
    // the pool does not exist before this tx, so nobody can trade ahead of the creator: no slippage bound needed
    firstBuyParam: buy > 0n ? { buyer: p.creator, buyAmount: new BN(buy.toString()), minimumAmountOut: new BN(1), referralTokenAccount: null } : undefined,
  });
  const pool = deriveDbcPoolAddress(QUOTE_MINT, baseMint.publicKey, DBC_CONFIG);
  return { tx, baseMint, pool };
}

export type CurveCoin = {
  pool: string;
  baseMint: string;
  creator: string;
  name: string;
  symbol: string;
  /** 0 → 1, quote raised / migration threshold */
  progress: number;
  era: 1 | 2 | 3 | 4;
  quoteRaised: bigint;
  quoteThreshold: bigint;
  /** spot price, quote lamports per base lamport (multiply by 10^(baseDecimals − quoteDecimals) for HYPE per coin) */
  spotPrice: number;
  migrated: boolean;
  /** unix seconds, from the pool account's first signature */
  createdAt: number | null;
};

/** Metaplex token metadata: name and symbol (borsh strings after key, update authority and mint). */
export function parseTokenMetadata(data: Buffer): { name: string; symbol: string; uri: string } {
  let o = 1 + 32 + 32;
  const str = () => {
    const len = data.readUInt32LE(o);
    o += 4;
    const s = data.subarray(o, o + len).toString('utf8').replace(/\0+$/, '').trim();
    o += len;
    return s;
  };
  return { name: str(), symbol: str(), uri: str() };
}

/** All coins launched from the QUAD config, with their progress. Cache this server-side (5 s is plenty). */
export async function listCurveCoins(connection: Connection): Promise<CurveCoin[]> {
  const client = makeClient(connection);
  const [pools, config] = await Promise.all([client.state.getPoolsByConfig(DBC_CONFIG), client.state.getPoolConfig(DBC_CONFIG)]);
  if (!config || pools.length === 0) return [];
  const threshold = BigInt(config.migrationQuoteThreshold.toString());

  const metas = await connection.getMultipleAccountsInfo(pools.map((p) => deriveMintMetadata(p.account.poolState.baseMint)));
  const created = await Promise.all(
    pools.map((p) => connection.getSignaturesForAddress(p.publicKey, { limit: 1 }).then((s) => s[s.length - 1]?.blockTime ?? null, () => null)),
  );

  return pools
    .map(({ publicKey, account: { poolState: account } }, i) => {
      const raised = BigInt(account.quoteReserve.toString());
      const progress = threshold > 0n ? Math.min(1, Number(raised) / Number(threshold)) : 0;
      const s = BigInt(account.sqrtPrice.toString());
      const meta = metas[i] ? parseTokenMetadata(metas[i]!.data) : { name: '', symbol: '' };
      return {
        pool: publicKey.toBase58(),
        baseMint: account.baseMint.toBase58(),
        creator: account.creator.toBase58(),
        name: meta.name,
        symbol: meta.symbol,
        progress,
        era: eraOf(progress),
        quoteRaised: raised,
        quoteThreshold: threshold,
        spotPrice: Number((s * s * 10n ** 18n) / Q128) / 1e18,
        migrated: account.isMigrated !== 0,
        createdAt: created[i],
      };
    })
    .sort((a, b) => b.progress - a.progress);
}

export type CreatorPool = {
  pool: string;
  baseMint: string;
  name: string;
  symbol: string;
  /** unclaimed creator trading fees, quote lamports (HYPE) */
  unclaimedQuoteFee: bigint;
  /** the curve is complete: surplus above the threshold can be withdrawn once */
  curveComplete: boolean;
  surplusWithdrawn: boolean;
  migrated: boolean;
};

/** Pools created by this wallet from the QUAD config, with what it can claim. */
export async function listCreatorPools(connection: Connection, creator: PublicKey): Promise<CreatorPool[]> {
  const client = makeClient(connection);
  const pools = (await client.state.getPoolsByCreator(creator)).filter((p) => p.account.poolState.config.equals(DBC_CONFIG));
  const metas = await connection.getMultipleAccountsInfo(pools.map((p) => deriveMintMetadata(p.account.poolState.baseMint)));
  return pools.map(({ publicKey, account: { poolState: account } }, i) => {
    const meta = metas[i] ? parseTokenMetadata(metas[i]!.data) : { name: '', symbol: '' };
    return {
      pool: publicKey.toBase58(),
      baseMint: account.baseMint.toBase58(),
      name: meta.name,
      symbol: meta.symbol,
      unclaimedQuoteFee: BigInt(account.creatorQuoteFee.toString()),
      curveComplete: !account.finishCurveTimestamp.isZero(),
      surplusWithdrawn: account.isCreatorWithdrawSurplus !== 0,
      migrated: account.isMigrated !== 0,
    };
  });
}

/** Creator-side fee claim: all unclaimed HYPE fees of one pool, to the creator's wallet. */
export async function buildClaimCreatorFeeTx(connection: Connection, creator: PublicKey, pool: PublicKey) {
  const client = makeClient(connection);
  const state = await client.state.getPool(pool);
  if (!state) throw new Error(`pool ${pool.toBase58()} not found`);
  return client.creator.claimCreatorTradingFee({
    creator,
    payer: creator,
    pool,
    maxBaseAmount: new BN(0), // collectFeeMode = quote only: there is never a base fee
    maxQuoteAmount: state.poolState.creatorQuoteFee,
  });
}

/** Creator's share of the quote raised above the threshold, once the curve is complete. */
export async function buildWithdrawSurplusTx(connection: Connection, creator: PublicKey, pool: PublicKey) {
  return makeClient(connection).creator.creatorWithdrawSurplus({ creator, pool });
}
