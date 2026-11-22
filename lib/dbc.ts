/**
 * Client helpers around the Meteora DBC SDK for QUAD.
 * Everything that touches a wallet returns a Transaction for the wallet adapter to sign.
 */
import { Connection, Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import BN from 'bn.js';
import { DAMM_V2_MIGRATION_FEE_ADDRESS, DynamicBondingCurveClient, SwapMode, createDbcProgram, getCurrentPoint, swapQuoteExactIn, swapQuotePartialFill, deriveDammV1MigrationMetadataAddress, deriveDammV2PoolAddress, deriveDbcPoolAddress, deriveMintMetadata } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { eraOf, Q128 } from './curve';
import { HYPE_MINT } from './hype';

export const DBC_CONFIG = new PublicKey(process.env.NEXT_PUBLIC_DBC_CONFIG || '11111111111111111111111111111111');
export const QUOTE_MINT = new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT || HYPE_MINT);

export const makeClient = (connection: Connection) => new DynamicBondingCurveClient(connection, 'confirmed');

/** Jupiter swap, HYPE → the coin. Jupiter indexes DBC pools and the migrated DAMM v2 pools alike. */
export const tradeUrl = (baseMint: string) => `https://jup.ag/swap/${QUOTE_MINT.toBase58()}-${baseMint}`;

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

// ---- trading on the curve (the token page's trade panel) ------------------------------------

/** A pool as the quote needs it: the SDK's account, its config, the current slot or time. */
export type CurveState = {
  pool: PublicKey;
  account: NonNullable<Awaited<ReturnType<DynamicBondingCurveClient['state']['getPool']>>>;
  config: NonNullable<Awaited<ReturnType<DynamicBondingCurveClient['state']['getPoolConfig']>>>;
  currentPoint: BN;
  migrated: boolean;
};

export async function readCurveState(connection: Connection, pool: PublicKey): Promise<CurveState> {
  const client = makeClient(connection);
  const account = await client.state.getPool(pool);
  if (!account) throw new Error(`pool ${pool.toBase58()} not found`);
  const config = await client.state.getPoolConfig(account.poolState.config);
  if (!config) throw new Error('pool config not found');
  const currentPoint = await getCurrentPoint(connection, config.activationType);
  return { pool, account, config, currentPoint, migrated: account.poolState.isMigrated !== 0 };
}

export type CurveSide = 'buy' | 'sell';
export type CurveQuote = {
  /** what goes in, fee included; a buy past the end of the curve only takes what fills it */
  amountIn: bigint;
  /** what comes back unused: the part of a buy beyond the end of the curve */
  amountLeft: bigint;
  amountOut: bigint;
  minimumOut: bigint;
  /** trading fee, in HYPE lamports */
  fee: bigint;
  /** QUAD's referral cut of that fee */
  referralFee: bigint;
};

const big = (x: { toString(): string }) => BigInt(x.toString());

/**
 * Buy (HYPE in) or sell (coins in). Buys use partial fill: near graduation, a buy larger than what
 * is left on the curve fills it and returns the rest, where an exact-in swap would fail.
 */
export function quoteCurveSwap(state: CurveState, side: CurveSide, amountIn: bigint, slippageBps: number, referral: boolean): CurveQuote {
  const quote = side === 'buy' ? swapQuotePartialFill : swapQuoteExactIn;
  const q = quote(state.account as never, state.config, side === 'sell', new BN(amountIn.toString()), slippageBps, referral, state.currentPoint, false);
  const left = q.amountLeft ? big(q.amountLeft) : 0n;
  return {
    amountIn: amountIn - left,
    amountLeft: left,
    amountOut: big(q.outputAmount),
    minimumOut: big(q.minimumAmountOut ?? 0),
    fee: big(q.tradingFee ?? 0) + big(q.protocolFee ?? 0) + big(q.referralFee ?? 0),
    referralFee: big(q.referralFee ?? 0),
  };
}

export async function buildCurveSwapTx(
  connection: Connection,
  p: { pool: PublicKey; owner: PublicKey; side: CurveSide; amountIn: bigint; minimumOut: bigint; referralTokenAccount: PublicKey | null },
): Promise<Transaction> {
  const base = { owner: p.owner, pool: p.pool, swapBaseForQuote: p.side === 'sell', referralTokenAccount: p.referralTokenAccount, amountIn: new BN(p.amountIn.toString()), minimumAmountOut: new BN(p.minimumOut.toString()) };
  return makeClient(connection).pool.swap2(p.side === 'buy' ? { ...base, swapMode: SwapMode.PartialFill } : { ...base, swapMode: SwapMode.ExactIn });
}

/**
 * QUAD's HYPE account that receives the referral cut: NEXT_PUBLIC_REFERRAL_WALLET (or the fee claimer)'s
 * associated account. Null when it does not exist yet: trades then go through without a referral.
 */
export async function referralTokenAccount(connection: Connection): Promise<PublicKey | null> {
  const wallet = process.env.NEXT_PUBLIC_REFERRAL_WALLET || process.env.NEXT_PUBLIC_FEE_CLAIMER;
  if (!wallet) return null;
  const mint = await connection.getAccountInfo(QUOTE_MINT);
  if (!mint) return null;
  const ata = getAssociatedTokenAddressSync(QUOTE_MINT, new PublicKey(wallet), true, mint.owner);
  return (await connection.getAccountInfo(ata)) ? ata : null;
}

/** Legacy transactions carry at most 1232 bytes on the wire. */
const PACKET = 1232;
function fits(tx: Transaction, signers: number) {
  const probe = new Transaction({ feePayer: tx.feePayer, blockhash: PublicKey.default.toBase58(), lastValidBlockHeight: 0 }).add(...tx.instructions);
  try {
    return probe.serializeMessage().length + 1 + 64 * signers <= PACKET;
  } catch {
    return false;
  }
}

/**
 * Anonymous launch (docs/ANONYMOUS.md): a burner key creates the pool and makes the first buy, the
 * coins go to the claim key, and the creator role moves to the claim key. One transaction when it
 * fits, two otherwise (create + buy, then the transfer); the burner and the mint keypair sign.
 */
export async function buildAnonLaunchTxs(
  connection: Connection,
  p: { name: string; symbol: string; uri: string; burner: PublicKey; claimKey: PublicKey; firstBuyQuoteLamports: bigint },
): Promise<{ txs: Transaction[]; baseMint: Keypair; pool: PublicKey }> {
  const client = makeClient(connection);
  const baseMint = Keypair.generate();
  const create = await client.creator.createPoolWithFirstBuy({
    createPoolParam: { name: p.name, symbol: p.symbol.toUpperCase(), uri: p.uri, payer: p.burner, poolCreator: p.burner, config: DBC_CONFIG, baseMint: baseMint.publicKey },
    firstBuyParam:
      p.firstBuyQuoteLamports > 0n
        ? { buyer: p.burner, receiver: p.claimKey, buyAmount: new BN(p.firstBuyQuoteLamports.toString()), minimumAmountOut: new BN(1), referralTokenAccount: null }
        : undefined,
  });
  const pool = deriveDbcPoolAddress(QUOTE_MINT, baseMint.publicKey, DBC_CONFIG);
  // the SDK's transferPoolCreator reads the pool first; it does not exist yet, so build the instruction directly
  const { program } = createDbcProgram(connection, 'confirmed');
  const transfer = await program.methods
    .transferPoolCreator()
    .accountsPartial({ virtualPool: pool, config: DBC_CONFIG, creator: p.burner, newCreator: p.claimKey })
    .remainingAccounts([{ pubkey: deriveDammV1MigrationMetadataAddress(pool), isSigner: false, isWritable: false }])
    .instruction();
  const one = new Transaction({ feePayer: p.burner }).add(...create.instructions, transfer);
  if (fits(one, 2)) return { txs: [one], baseMint, pool };
  create.feePayer = p.burner;
  return { txs: [create, new Transaction({ feePayer: p.burner }).add(transfer)], baseMint, pool };
}

export type CurveCoin = {
  pool: string;
  baseMint: string;
  creator: string;
  name: string;
  symbol: string;
  /** metadata JSON (name, symbol, description, image) uploaded at launch */
  uri: string;
  /** 0 → 1, quote raised / migration threshold */
  progress: number;
  era: 1 | 2 | 3 | 4;
  quoteRaised: bigint;
  quoteThreshold: bigint;
  /** spot price, quote lamports per base lamport (multiply by 10^(baseDecimals − quoteDecimals) for HYPE per coin) */
  spotPrice: number;
  migrated: boolean;
  /** the DAMM v2 pool the coin trades on once migrated */
  dammPool: string | null;
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

// Token metadata and the pool's creation time never change: read once per pool, keep for the process.
const metaCache = new Map<string, { name: string; symbol: string; uri: string }>();
const createdCache = new Map<string, number>();

/** All coins launched from the QUAD config, with their progress. Cache this server-side (5 s is plenty). */
export async function listCurveCoins(connection: Connection): Promise<CurveCoin[]> {
  const client = makeClient(connection);
  const [pools, config] = await Promise.all([client.state.getPoolsByConfig(DBC_CONFIG), client.state.getPoolConfig(DBC_CONFIG)]);
  if (!config || pools.length === 0) return [];
  const threshold = BigInt(config.migrationQuoteThreshold.toString());
  const dammConfig = DAMM_V2_MIGRATION_FEE_ADDRESS[config.migrationFeeOption];

  const missingMeta = pools.filter((p) => !metaCache.has(p.publicKey.toBase58()));
  if (missingMeta.length > 0) {
    const infos = await connection.getMultipleAccountsInfo(missingMeta.map((p) => deriveMintMetadata(p.account.poolState.baseMint)));
    missingMeta.forEach((p, i) => {
      if (infos[i]) metaCache.set(p.publicKey.toBase58(), parseTokenMetadata(infos[i]!.data));
    });
  }
  await Promise.all(
    pools
      .filter((p) => !createdCache.has(p.publicKey.toBase58()))
      .map((p) =>
        connection.getSignaturesForAddress(p.publicKey, { limit: 1 }).then(
          (s) => {
            const t = s[s.length - 1]?.blockTime;
            if (t) createdCache.set(p.publicKey.toBase58(), t);
          },
          () => undefined,
        ),
      ),
  );

  return pools
    .map(({ publicKey, account: { poolState: account } }) => {
      const raised = BigInt(account.quoteReserve.toString());
      const progress = threshold > 0n ? Math.min(1, Number(raised) / Number(threshold)) : 0;
      const s = BigInt(account.sqrtPrice.toString());
      const meta = metaCache.get(publicKey.toBase58()) ?? { name: '', symbol: '', uri: '' };
      const migrated = account.isMigrated !== 0;
      return {
        pool: publicKey.toBase58(),
        baseMint: account.baseMint.toBase58(),
        creator: account.creator.toBase58(),
        name: meta.name,
        symbol: meta.symbol,
        uri: meta.uri,
        progress,
        era: eraOf(progress),
        quoteRaised: raised,
        quoteThreshold: threshold,
        spotPrice: Number((s * s * 10n ** 18n) / Q128) / 1e18,
        migrated,
        dammPool: migrated && dammConfig ? deriveDammV2PoolAddress(dammConfig, account.baseMint, QUOTE_MINT).toBase58() : null,
        createdAt: createdCache.get(publicKey.toBase58()) ?? null,
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
  /** 0 → 1, quote raised / migration threshold */
  progress: number;
  era: 1 | 2 | 3 | 4;
  /** the curve is complete: surplus above the threshold can be withdrawn once */
  curveComplete: boolean;
  surplusWithdrawn: boolean;
  migrated: boolean;
};

/** Pools created by this wallet from the QUAD config, with what it can claim. */
export async function listCreatorPools(connection: Connection, creator: PublicKey): Promise<CreatorPool[]> {
  const client = makeClient(connection);
  const [all, config] = await Promise.all([client.state.getPoolsByCreator(creator), client.state.getPoolConfig(DBC_CONFIG)]);
  const pools = all.filter((p) => p.account.poolState.config.equals(DBC_CONFIG));
  const threshold = config ? BigInt(config.migrationQuoteThreshold.toString()) : 0n;
  const metas = await connection.getMultipleAccountsInfo(pools.map((p) => deriveMintMetadata(p.account.poolState.baseMint)));
  return pools.map(({ publicKey, account: { poolState: account } }, i) => {
    const meta = metas[i] ? parseTokenMetadata(metas[i]!.data) : { name: '', symbol: '' };
    return {
      pool: publicKey.toBase58(),
      baseMint: account.baseMint.toBase58(),
      name: meta.name,
      symbol: meta.symbol,
      unclaimedQuoteFee: BigInt(account.creatorQuoteFee.toString()),
      ...(() => {
        const progress = threshold > 0n ? Math.min(1, Number(BigInt(account.quoteReserve.toString())) / Number(threshold)) : 0;
        return { progress, era: eraOf(progress) };
      })(),
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
