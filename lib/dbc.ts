/**
 * Client helpers around the Meteora DBC SDK for QUAD.
 * Everything that touches a wallet returns a Transaction for the wallet adapter to sign.
 */
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import BN from 'bn.js';
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { eraOf } from './curve';

export const DBC_CONFIG = new PublicKey(process.env.NEXT_PUBLIC_DBC_CONFIG ?? '11111111111111111111111111111111');
export const QUOTE_MINT = new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT ?? '98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g');

export const makeClient = (connection: Connection) => new DynamicBondingCurveClient(connection, 'confirmed');

export type LaunchParams = {
  name: string;
  symbol: string;
  /** metadata JSON uri (upload name/symbol/image/description to Arweave or Irys first) */
  uri: string;
  /** wallet that signs, pays, and receives the creator fees */
  creator: PublicKey;
  /** optional first buy, in quote lamports (HYPE) — pays the normal fee, not the anti-sniper fee */
  firstBuyQuoteLamports?: bigint;
  quoteTokenType?: 0 | 1;
};

/**
 * Build the launch transaction. Signers: the creator (wallet) and the new base mint keypair.
 * Returns the tx and the mint so the UI can link to the pool right away.
 */
export async function buildLaunchTx(connection: Connection, p: LaunchParams): Promise<{ tx: Transaction; baseMint: Keypair; pool: PublicKey }> {
  const client = makeClient(connection);
  const baseMint = Keypair.generate();
  const createPoolParam = {
    quoteMint: QUOTE_MINT,
    baseMint: baseMint.publicKey,
    config: DBC_CONFIG,
    baseTokenType: 0,
    quoteTokenType: p.quoteTokenType ?? 0,
    name: p.name,
    symbol: p.symbol.toUpperCase(),
    uri: p.uri,
    payer: p.creator,
    poolCreator: p.creator,
  };
  const tx = p.firstBuyQuoteLamports && p.firstBuyQuoteLamports > 0n
    ? await client.pool.createPoolAndBuy({ createPoolParam, buyAmount: new BN(p.firstBuyQuoteLamports.toString()), minimumAmountOut: new BN(1), referralTokenAccount: null } as any)
    : await client.pool.createPool(createPoolParam as any);
  tx.partialSign(baseMint);
  const pool = deriveDbcPoolAddress(QUOTE_MINT, baseMint.publicKey, DBC_CONFIG);
  return { tx, baseMint, pool };
}

export type CurveCoin = {
  pool: string;
  baseMint: string;
  creator: string;
  /** 0 → 1, quote raised / migration threshold */
  progress: number;
  era: 1 | 2 | 3 | 4;
  quoteRaised: bigint;
  quoteThreshold: bigint;
  migrated: boolean;
};

/** All coins launched from the QUAD config, with their progress. Cache this server-side (5 s is plenty). */
export async function listCurveCoins(connection: Connection): Promise<CurveCoin[]> {
  const client = makeClient(connection);
  const pools = await client.state.getPoolsByConfig(DBC_CONFIG);
  const out: CurveCoin[] = [];
  for (const { publicKey, account } of pools as any[]) {
    const threshold = BigInt((await client.state.getPoolMigrationQuoteThreshold(publicKey)).toString());
    const raised = BigInt(account.quoteReserve?.toString?.() ?? '0');
    const progress = threshold > 0n ? Math.min(1, Number(raised) / Number(threshold)) : 0;
    out.push({
      pool: publicKey.toBase58(),
      baseMint: account.baseMint.toBase58(),
      creator: account.creator.toBase58(),
      progress,
      era: eraOf(progress),
      quoteRaised: raised,
      quoteThreshold: threshold,
      migrated: Boolean(account.isMigrated ?? account.migrationProgress),
    });
  }
  return out.sort((a, b) => b.progress - a.progress);
}

/** Creator-side fee claim: returns a tx for the creator wallet to sign. */
export async function buildClaimCreatorFeeTx(connection: Connection, creator: PublicKey, pool: PublicKey) {
  const client = makeClient(connection);
  const { creatorQuoteFee } = await client.state.getPoolCreatorFeeMetrics(pool);
  return client.creator.claimCreatorTradingFee({ creator, pool, maxBaseAmount: new BN(0), maxQuoteAmount: creatorQuoteFee });
}
