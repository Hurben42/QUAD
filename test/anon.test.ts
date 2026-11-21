import { describe, it, expect } from 'vitest';
import { Keypair, PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js';
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { DYNAMIC_BONDING_CURVE_PROGRAM_ID, DynamicBondingCurveIdl } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { claimKeypair, newClaimSecret, quoteLamports, SECRET_PREFIX } from '../lib/anon';
import { checkRelayTx } from '../lib/anon-relay';

describe('claim secret', () => {
  it('derives the same claim key every time, and rejects what is not a secret', () => {
    const secret = newClaimSecret();
    expect(secret.startsWith(SECRET_PREFIX)).toBe(true);
    expect(claimKeypair(secret).publicKey.equals(claimKeypair(`  ${secret}\n`).publicKey)).toBe(true);
    expect(claimKeypair(newClaimSecret()).publicKey.equals(claimKeypair(secret).publicKey)).toBe(false);
    expect(() => claimKeypair(secret.slice(SECRET_PREFIX.length))).toThrow();
    expect(() => claimKeypair(secret.slice(0, -10))).toThrow();
  });
});

describe('quoteLamports', () => {
  it('is the launch plus the first buy at the rate, with the swap margin', () => {
    expect(quoteLamports(0, 5)).toBe(50_000_000n);
    expect(quoteLamports(2, 5)).toBe(458_000_000n); // 0.05 + 2 / 5 × 1.02 SOL
  });
});

describe('checkRelayTx', () => {
  const relayer = Keypair.generate();
  const claim = Keypair.generate();
  const mint = Keypair.generate().publicKey;
  const receiver = Keypair.generate().publicKey;
  const build = (...ixs: TransactionInstruction[]) => {
    const tx = new Transaction({ feePayer: relayer.publicKey, blockhash: PublicKey.default.toBase58(), lastValidBlockHeight: 0 }).add(...ixs);
    return tx;
  };
  const withdraw = () => [
    createAssociatedTokenAccountIdempotentInstruction(relayer.publicKey, getAssociatedTokenAddressSync(mint, receiver), receiver, mint),
    createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, claim.publicKey), mint, getAssociatedTokenAddressSync(mint, receiver), claim.publicKey, 1n, 6),
  ];
  const claimIx = (name = 'claim_creator_trading_fee') => {
    const def = DynamicBondingCurveIdl.instructions.find((i) => i.name === name)!;
    const keys = def.accounts.map((a) => ({ pubkey: a.name === 'creator' ? claim.publicKey : Keypair.generate().publicKey, isSigner: a.name === 'creator', isWritable: false }));
    return new TransactionInstruction({ programId: DYNAMIC_BONDING_CURVE_PROGRAM_ID, keys, data: Buffer.concat([Buffer.from(def.discriminator), Buffer.alloc(16)]) });
  };

  it('relays a token withdrawal and a fee claim signed by the claim key', () => {
    const tx = build(...withdraw());
    tx.partialSign(claim);
    expect(checkRelayTx(tx, relayer.publicKey).mints[0].equals(mint)).toBe(true);
    const fee = build(claimIx());
    fee.partialSign(claim);
    expect(checkRelayTx(fee, relayer.publicKey).pools).toHaveLength(1);
  });

  it('refuses anything that spends the relayer or skips the claim key', () => {
    const steal = build(SystemProgram.transfer({ fromPubkey: relayer.publicKey, toPubkey: claim.publicKey, lamports: 1 }));
    expect(() => checkRelayTx(steal, relayer.publicKey)).toThrow(/not relayed/);
    const relayerTransfer = build(createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, relayer.publicKey), mint, getAssociatedTokenAddressSync(mint, claim.publicKey), relayer.publicKey, 1n, 6));
    expect(() => checkRelayTx(relayerTransfer, relayer.publicKey)).toThrow(/relayer/);
    expect(() => checkRelayTx(build(...withdraw()), relayer.publicKey)).toThrow(/sign/);
    const otherPayer = build(...withdraw());
    otherPayer.feePayer = claim.publicKey;
    expect(() => checkRelayTx(otherPayer, relayer.publicKey)).toThrow(/fee payer/);
    const surplus = build(claimIx('creator_withdraw_surplus'));
    expect(() => checkRelayTx(surplus, relayer.publicKey)).toThrow(/creator fee claims only/);
  });
});
