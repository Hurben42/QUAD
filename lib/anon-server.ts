/**
 * Anonymous launches, server side (docs/ANONYMOUS.md): orders, the private payment desk, the
 * delayed queue and the burner that launches. Server-only: it holds the treasury and deposit keys.
 *
 * Orders are JSON files in ANON_DATA_DIR, one per order, with a lock file per order so the worker
 * and the status route never launch the same order twice. Production needs a database and a KMS.
 */
import 'server-only';
import fs from 'node:fs';
import path from 'node:path';
import { randomInt, randomUUID } from 'node:crypto';
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import {
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createCloseAccountInstruction,
  createTransferCheckedInstruction,
  getAccount,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { DBC_CONFIG, QUOTE_MINT, buildAnonLaunchTxs, makeClient } from './dbc';
import { HYPE_MINT, readQuoteMint } from './hype';
import { ANON_FIRST_BUY_CAP_SHARE, ANON_LAUNCH_SOL } from './curve';
import { quoteLamports, type AnonOrderView, type AnonQuote, type AnonStatus } from './anon';
import { uploadCoinMetadata } from './irys';
import type { LaunchInput } from './launch-input';

const DEVNET = process.env.NEXT_PUBLIC_CLUSTER === 'devnet';
const ORDER_TTL_MS = 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;
const TX_FEE = 5_000;
const LOCK_STALE_MS = 5 * 60 * 1000;

type OrderRecord = {
  id: string;
  createdAt: number;
  expiresAt: number;
  input: LaunchInput;
  firstBuyHype: number;
  /** HYPE lamports */
  firstBuyLamports: string;
  claimKey: string;
  deposit: { publicKey: string; secretKey: number[] };
  amountLamports: string;
  hypePerSol: number;
  status: AnonStatus;
  paidLamports: string;
  swept: boolean;
  launchAt: number | null;
  attempts: number;
  uri: string | null;
  /** written before the launch is sent, to recover a crash after it landed */
  pending: { baseMint: string; pool: string } | null;
  pool: string | null;
  baseMint: string | null;
  signature: string | null;
  error: string | null;
};

// ---- storage ---------------------------------------------------------------------------------
const dataDir = () => process.env.ANON_DATA_DIR ?? path.join(process.cwd(), '.data', 'anon');
const ordersDir = () => path.join(dataDir(), 'orders');
const orderFile = (id: string) => path.join(ordersDir(), `${id}.json`);
const indexFile = () => path.join(dataDir(), 'pools.json');
const isId = (id: string) => /^[0-9a-f-]{36}$/.test(id);

function write(rec: OrderRecord) {
  fs.mkdirSync(ordersDir(), { recursive: true, mode: 0o700 });
  const tmp = `${orderFile(rec.id)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(rec, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, orderFile(rec.id));
}
function read(id: string): OrderRecord | null {
  if (!isId(id) || !fs.existsSync(orderFile(id))) return null;
  return JSON.parse(fs.readFileSync(orderFile(id), 'utf8')) as OrderRecord;
}
/** Runs `fn` holding the order's lock; returns null when another process holds it. */
async function withLock<T>(id: string, fn: () => Promise<T>): Promise<T | null> {
  const lock = `${orderFile(id)}.lock`;
  try {
    if (fs.existsSync(lock) && Date.now() - fs.statSync(lock).mtimeMs > LOCK_STALE_MS) fs.unlinkSync(lock);
    fs.closeSync(fs.openSync(lock, 'wx'));
  } catch {
    return null;
  }
  try {
    return await fn();
  } finally {
    fs.rmSync(lock, { force: true });
  }
}

/** Pools launched anonymously, for the badge. */
export function anonymousPools(): Set<string> {
  try {
    return new Set(JSON.parse(fs.readFileSync(indexFile(), 'utf8')) as string[]);
  } catch {
    return new Set();
  }
}
function indexPool(pool: string) {
  const all = anonymousPools();
  all.add(pool);
  fs.mkdirSync(dataDir(), { recursive: true, mode: 0o700 });
  fs.writeFileSync(indexFile(), JSON.stringify([...all]), { mode: 0o600 });
}

// ---- chain and keys --------------------------------------------------------------------------
const connection = () => new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
function keypairAt(file: string) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(file, 'utf8'))));
}
export const treasury = () => keypairAt(process.env.ANON_TREASURY_KEYPAIR || process.env.PAYER_KEYPAIR || './keys/payer.json');
export const relayer = () => keypairAt(process.env.ANON_RELAYER_KEYPAIR || process.env.ANON_TREASURY_KEYPAIR || process.env.PAYER_KEYPAIR || './keys/payer.json');
const tokenProgram = (tokenType: 0 | 1) => (tokenType === 1 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID);

let rate: { at: number; value: number } | null = null;
/** HYPE per SOL: ANON_HYPE_PER_SOL when set, else Jupiter's prices (mainnet). */
async function hypePerSol(): Promise<number> {
  const fixed = Number(process.env.ANON_HYPE_PER_SOL);
  if (fixed > 0) return fixed;
  if (DEVNET) throw new Error('set ANON_HYPE_PER_SOL on devnet: there is no price for a test mint');
  if (rate && Date.now() - rate.at < 60_000) return rate.value;
  const sol = 'So11111111111111111111111111111111111111112';
  const hype = HYPE_MINT.toBase58();
  const res = await fetch(`https://lite-api.jup.ag/price/v3?ids=${sol},${hype}`, { cache: 'no-store' });
  const body = (await res.json()) as Record<string, { usdPrice?: number }>;
  const value = (body[sol]?.usdPrice ?? 0) / (body[hype]?.usdPrice ?? 0);
  if (!(value > 0) || !Number.isFinite(value)) throw new Error('no SOL/HYPE price from Jupiter');
  rate = { at: Date.now(), value };
  return value;
}
function delays() {
  const min = Number(process.env.ANON_DELAY_MIN_S) || (DEVNET ? 30 : 300);
  const max = Math.max(min, Number(process.env.ANON_DELAY_MAX_S) || (DEVNET ? 120 : 1800));
  return { min, max };
}

let configRead: Promise<{ thresholdHype: number; poolCreationFeeSol: number; quoteDecimals: number }> | null = null;
function readConfig() {
  configRead ??= (async () => {
    const c = connection();
    const [cfg, quote] = await Promise.all([makeClient(c).state.getPoolConfig(DBC_CONFIG), readQuoteMint(c, QUOTE_MINT)]);
    if (!cfg) throw new Error(`QUAD config ${DBC_CONFIG.toBase58()} not found`);
    return {
      thresholdHype: Number(cfg.migrationQuoteThreshold.toString()) / 10 ** quote.decimals,
      poolCreationFeeSol: Number(cfg.poolCreationFee.toString()) / LAMPORTS_PER_SOL,
      quoteDecimals: quote.decimals,
    };
  })().catch((e) => {
    configRead = null;
    throw e;
  });
  return configRead;
}

export async function getQuote(): Promise<AnonQuote> {
  const [cfg, perSol] = await Promise.all([readConfig(), hypePerSol()]);
  const { min, max } = delays();
  return {
    hypePerSol: perSol,
    launchSol: ANON_LAUNCH_SOL + cfg.poolCreationFeeSol,
    firstBuyCapHype: cfg.thresholdHype * ANON_FIRST_BUY_CAP_SHARE,
    delayMinS: min,
    delayMaxS: max,
    relayer: relayer().publicKey.toBase58(),
  };
}

// ---- orders ----------------------------------------------------------------------------------
function view(r: OrderRecord): AnonOrderView {
  return {
    id: r.id,
    status: r.status,
    name: r.input.name,
    symbol: r.input.symbol,
    claimKey: r.claimKey,
    depositAddress: r.deposit.publicKey,
    amountLamports: r.amountLamports,
    paidLamports: r.paidLamports,
    firstBuyHype: r.firstBuyHype,
    expiresAt: r.expiresAt,
    launchAt: r.launchAt,
    pool: r.pool,
    baseMint: r.baseMint,
    signature: r.signature,
    error: r.error,
  };
}

export class OrderError extends Error {}

export async function createOrder(input: LaunchInput, firstBuyHype: number, claimKey: PublicKey): Promise<AnonOrderView> {
  const [cfg, quote] = await Promise.all([readConfig(), getQuote()]);
  if (!(firstBuyHype >= 0) || !Number.isFinite(firstBuyHype)) throw new OrderError('first buy: a number of HYPE');
  if (firstBuyHype > quote.firstBuyCapHype) throw new OrderError(`first buy: up to ${quote.firstBuyCapHype} HYPE on an anonymous launch`);
  const deposit = Keypair.generate();
  const rec: OrderRecord = {
    id: randomUUID(),
    createdAt: Date.now(),
    expiresAt: Date.now() + ORDER_TTL_MS,
    input,
    firstBuyHype,
    firstBuyLamports: BigInt(Math.round(firstBuyHype * 10 ** cfg.quoteDecimals)).toString(),
    claimKey: claimKey.toBase58(),
    deposit: { publicKey: deposit.publicKey.toBase58(), secretKey: Array.from(deposit.secretKey) },
    amountLamports: quoteLamports(firstBuyHype, quote.hypePerSol, cfg.poolCreationFeeSol).toString(),
    hypePerSol: quote.hypePerSol,
    status: 'awaiting_payment',
    paidLamports: '0',
    swept: false,
    launchAt: null,
    attempts: 0,
    uri: null,
    pending: null,
    pool: null,
    baseMint: null,
    signature: null,
    error: null,
  };
  write(rec);
  return view(rec);
}

export function getOrder(id: string): AnonOrderView | null {
  const r = read(id);
  return r && view(r);
}

/** Moves one order as far as it can go now. Safe to call from any process, any number of times. */
export async function processOrder(id: string): Promise<AnonOrderView | null> {
  await withLock(id, async () => {
    const rec = read(id);
    if (rec) await step(rec);
  });
  return getOrder(id);
}

/** Every open order, oldest first (the worker's loop). */
export async function processAll(): Promise<number> {
  if (!fs.existsSync(ordersDir())) return 0;
  const open = fs
    .readdirSync(ordersDir())
    .filter((f) => f.endsWith('.json'))
    .map((f) => read(f.slice(0, -5)))
    .filter((r): r is OrderRecord => !!r && (r.status === 'awaiting_payment' || r.status === 'paid' || r.status === 'launching'))
    .sort((a, b) => a.createdAt - b.createdAt);
  for (const r of open) await processOrder(r.id);
  return open.length;
}

async function step(rec: OrderRecord) {
  const c = connection();
  if (rec.status === 'awaiting_payment') {
    const balance = BigInt(await c.getBalance(new PublicKey(rec.deposit.publicKey)));
    rec.paidLamports = balance.toString();
    if (balance >= BigInt(rec.amountLamports)) {
      const { min, max } = delays();
      rec.status = 'paid';
      rec.launchAt = Date.now() + randomInt(min, max + 1) * 1000;
    } else if (Date.now() > rec.expiresAt) {
      rec.status = 'expired';
      rec.error = balance > 0n ? 'Expired with a partial payment: write to QUAD for a refund.' : null;
    }
    write(rec);
  }
  if (rec.status === 'paid' && !rec.swept) {
    try {
      await sweep(c, rec);
      rec.swept = true;
      write(rec);
    } catch {
      // retried on the next pass; the launch does not wait for it
    }
  }
  if (rec.status === 'launching' && rec.pending) {
    // a previous attempt stopped after sending: did it land?
    if (await c.getAccountInfo(new PublicKey(rec.pending.pool))) {
      Object.assign(rec, { status: 'launched', pool: rec.pending.pool, baseMint: rec.pending.baseMint, signature: rec.signature ?? null, error: null });
      indexPool(rec.pending.pool);
      write(rec);
      return;
    }
    rec.status = 'paid';
  }
  if ((rec.status === 'paid' || rec.status === 'launching') && rec.launchAt !== null && Date.now() >= rec.launchAt) {
    rec.status = 'launching';
    rec.attempts += 1;
    rec.pending = null;
    write(rec);
    try {
      await launch(c, rec);
    } catch (e) {
      rec.error = e instanceof Error ? e.message : String(e);
      const pending = rec.pending as OrderRecord['pending']; // set by launch() before it sends
      if (pending && (await c.getAccountInfo(new PublicKey(pending.pool)).catch(() => null))) return step(rec);
      rec.status = rec.attempts >= MAX_ATTEMPTS ? 'failed' : 'paid';
      rec.pending = null;
      write(rec);
    }
  }
}

/** The deposit's SOL to the treasury. */
async function sweep(c: Connection, rec: OrderRecord) {
  const deposit = Keypair.fromSecretKey(Uint8Array.from(rec.deposit.secretKey));
  const balance = await c.getBalance(deposit.publicKey);
  if (balance <= TX_FEE) return;
  const tx = new Transaction().add(SystemProgram.transfer({ fromPubkey: deposit.publicKey, toPubkey: treasury().publicKey, lamports: balance - TX_FEE }));
  await sendAndConfirmTransaction(c, tx, [deposit]);
}

async function launch(c: Connection, rec: OrderRecord) {
  const t = treasury();
  if (!rec.uri) {
    rec.uri = (await uploadCoinMetadata(rec.input)).uri;
    write(rec);
  }
  const quote = await readQuoteMint(c, QUOTE_MINT);
  const program = tokenProgram(quote.tokenType);
  const burner = Keypair.generate();
  const firstBuy = BigInt(rec.firstBuyLamports);
  const { poolCreationFeeSol } = await readConfig();

  // 1. the treasury funds the burner: SOL for the launch, HYPE for the first buy
  const fund = new Transaction().add(SystemProgram.transfer({ fromPubkey: t.publicKey, toPubkey: burner.publicKey, lamports: Math.round((ANON_LAUNCH_SOL + poolCreationFeeSol) * LAMPORTS_PER_SOL) }));
  const burnerQuote = getAssociatedTokenAddressSync(QUOTE_MINT, burner.publicKey, false, program);
  if (firstBuy > 0n) {
    fund.add(
      createAssociatedTokenAccountIdempotentInstruction(t.publicKey, burnerQuote, burner.publicKey, QUOTE_MINT, program),
      createTransferCheckedInstruction(getAssociatedTokenAddressSync(QUOTE_MINT, t.publicKey, false, program), QUOTE_MINT, burnerQuote, t.publicKey, firstBuy, quote.decimals, [], program),
    );
  }
  await sendAndConfirmTransaction(c, fund, [t]);

  // 2. the burner launches, buys for the claim key and hands it the creator role
  const { txs, baseMint, pool } = await buildAnonLaunchTxs(c, {
    name: rec.input.name,
    symbol: rec.input.symbol,
    uri: rec.uri,
    burner: burner.publicKey,
    claimKey: new PublicKey(rec.claimKey),
    firstBuyQuoteLamports: firstBuy,
  });
  rec.pending = { baseMint: baseMint.publicKey.toBase58(), pool: pool.toBase58() };
  write(rec);
  let signature = '';
  for (const [i, tx] of txs.entries()) {
    const sig = await sendAndConfirmTransaction(c, tx, i === 0 ? [burner, baseMint] : [burner]);
    if (i === 0) signature = sig;
  }

  // 3. the burner's leftovers back to the treasury; the key is dropped with this scope
  try {
    const back = new Transaction();
    const left = await getAccount(c, burnerQuote, 'confirmed', program).catch(() => null);
    if (left && left.amount === 0n) back.add(createCloseAccountInstruction(burnerQuote, t.publicKey, burner.publicKey, [], program));
    const lamports = await c.getBalance(burner.publicKey);
    if (lamports > TX_FEE) back.add(SystemProgram.transfer({ fromPubkey: burner.publicKey, toPubkey: t.publicKey, lamports: lamports - TX_FEE }));
    if (back.instructions.length > 0) await sendAndConfirmTransaction(c, back, [burner]);
  } catch {
    // dust stays on a key nobody holds; not worth failing a launch that landed
  }

  Object.assign(rec, { status: 'launched', pool: pool.toBase58(), baseMint: baseMint.publicKey.toBase58(), signature, error: null, pending: null });
  indexPool(rec.pool!);
  write(rec);
}
