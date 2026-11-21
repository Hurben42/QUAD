/**
 * Anonymous launches, the parts the browser and the server share: the claim secret, the quote,
 * the order as the API shows it. See docs/ANONYMOUS.md.
 */
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { ANON_LAUNCH_SOL, ANON_SWAP_MARGIN } from './curve';

export const SECRET_PREFIX = 'quad-claim-';

/** 32 random bytes as `quad-claim-<base58>`. Drawn in the browser; never sent anywhere. */
export function newClaimSecret(): string {
  return SECRET_PREFIX + bs58.encode(globalThis.crypto.getRandomValues(new Uint8Array(32)));
}

/** The key the secret controls: the pool's creator and the receiver of the first buy. */
export function claimKeypair(secret: string): Keypair {
  const s = secret.trim();
  if (!s.startsWith(SECRET_PREFIX)) throw new Error('A claim secret starts with quad-claim-');
  let seed: Uint8Array;
  try {
    seed = bs58.decode(s.slice(SECRET_PREFIX.length));
  } catch {
    throw new Error('This claim secret is not valid base58.');
  }
  if (seed.length !== 32) throw new Error('This claim secret is incomplete.');
  return Keypair.fromSeed(seed);
}

/** SOL lamports an order costs: the launch plus the first buy at the quoted rate, with the swap margin. */
export function quoteLamports(firstBuyHype: number, hypePerSol: number, poolCreationFeeSol = 0): bigint {
  const launch = BigInt(Math.round((ANON_LAUNCH_SOL + poolCreationFeeSol) * 1e9));
  const buy = firstBuyHype > 0 ? BigInt(Math.ceil((firstBuyHype / hypePerSol) * (1 + ANON_SWAP_MARGIN) * 1e9)) : 0n;
  return launch + buy;
}

/** The launch delay as a range: "5–20 s", "5–30 min". */
export function delayText(minS: number, maxS: number): string {
  if (maxS < 120) return `${minS}–${maxS} s`;
  return `${Math.max(1, Math.round(minS / 60))}–${Math.round(maxS / 60)} min`;
}

export type AnonStatus = 'awaiting_payment' | 'paid' | 'launching' | 'launched' | 'failed' | 'expired';

/** An order as /api/anon/orders shows it: never the deposit key, never the secret. */
export type AnonOrderView = {
  id: string;
  status: AnonStatus;
  name: string;
  symbol: string;
  claimKey: string;
  depositAddress: string;
  /** SOL lamports to pay, and paid so far */
  amountLamports: string;
  paidLamports: string;
  firstBuyHype: number;
  expiresAt: number;
  /** when the queued launch fires, unix ms */
  launchAt: number | null;
  pool: string | null;
  baseMint: string | null;
  signature: string | null;
  error: string | null;
};

export type AnonQuote = {
  hypePerSol: number;
  launchSol: number;
  firstBuyCapHype: number;
  delayMinS: number;
  delayMaxS: number;
  relayer: string;
};
