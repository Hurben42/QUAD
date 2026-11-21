/**
 * What the claim relayer agrees to co-sign as fee payer (docs/ANONYMOUS.md, "Relayer rules").
 * Pure: the route adds the checks that need the chain (QUAD pools and mints, simulation).
 */
import { ComputeBudgetProgram, PublicKey, Transaction } from '@solana/web3.js';
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID, DynamicBondingCurveIdl } from '@meteora-ag/dynamic-bonding-curve-sdk';

const MAX_INSTRUCTIONS = 8;
const TRANSFER_CHECKED = 12;
const CLAIM = DynamicBondingCurveIdl.instructions.find((i) => i.name === 'claim_creator_trading_fee')!;
const CLAIM_DISCRIMINATOR = Buffer.from(CLAIM.discriminator);
const CLAIM_POOL = CLAIM.accounts.findIndex((a) => a.name === 'pool');
const CLAIM_CREATOR = CLAIM.accounts.findIndex((a) => a.name === 'creator');

export type RelayRequest = { pools: PublicKey[]; mints: PublicKey[]; signers: PublicKey[] };

/** Throws with the reason when the relayer must not sign; returns what the route still has to check. */
export function checkRelayTx(tx: Transaction, relayer: PublicKey): RelayRequest {
  if (!tx.feePayer?.equals(relayer)) throw new Error('the relayer must be the fee payer');
  if (tx.instructions.length === 0 || tx.instructions.length > MAX_INSTRUCTIONS) throw new Error(`1–${MAX_INSTRUCTIONS} instructions`);
  const pools: PublicKey[] = [];
  const mints: PublicKey[] = [];
  const signed = (key: PublicKey) => tx.signatures.some((s) => s.publicKey.equals(key) && s.signature !== null);
  const relayerIn = (keys: { pubkey: PublicKey }[], from = 0) => keys.slice(from).some((k) => k.pubkey.equals(relayer));

  for (const ix of tx.instructions) {
    const program = ix.programId;
    if (program.equals(ComputeBudgetProgram.programId)) continue;
    if (program.equals(ASSOCIATED_TOKEN_PROGRAM_ID)) {
      // create (no data or 0) or createIdempotent (1); the relayer may fund it, nothing else
      if (ix.data.length > 1 || (ix.data.length === 1 && ix.data[0] > 1)) throw new Error('associated token: create only');
      if (relayerIn(ix.keys, 1)) throw new Error('associated token: the relayer may only fund it');
      continue;
    }
    if (program.equals(TOKEN_PROGRAM_ID) || program.equals(TOKEN_2022_PROGRAM_ID)) {
      if (ix.data[0] !== TRANSFER_CHECKED) throw new Error('token: transferChecked only');
      if (relayerIn(ix.keys)) throw new Error('token: the relayer cannot be part of a transfer');
      const authority = ix.keys[3];
      if (!authority?.isSigner || !signed(authority.pubkey)) throw new Error('token: the owner must sign');
      mints.push(ix.keys[1].pubkey);
      continue;
    }
    if (program.equals(DYNAMIC_BONDING_CURVE_PROGRAM_ID)) {
      if (!ix.data.subarray(0, 8).equals(CLAIM_DISCRIMINATOR)) throw new Error('curve: creator fee claims only');
      if (relayerIn(ix.keys)) throw new Error('curve: the relayer cannot be part of a claim');
      const creator = ix.keys[CLAIM_CREATOR];
      if (!creator?.isSigner || !signed(creator.pubkey)) throw new Error('curve: the creator must sign');
      pools.push(ix.keys[CLAIM_POOL].pubkey);
      continue;
    }
    throw new Error(`program ${program.toBase58()} is not relayed`);
  }
  if (!tx.verifySignatures(false)) throw new Error('a signature does not verify');
  const signers = tx.signatures.filter((s) => !s.publicKey.equals(relayer)).map((s) => s.publicKey);
  if (tx.signatures.some((s) => !s.publicKey.equals(relayer) && s.signature === null)) throw new Error('every signer but the relayer must have signed');
  return { pools, mints, signers };
}
