/**
 * Devnet only: create an 8-decimal SPL mint that stands in for HYPE, and mint test units.
 *
 *   pnpm mint:devnet                       # 10,000 to the payer
 *   TEST_WALLET=<pubkey> pnpm mint:devnet  # also 1,000 to your browser wallet, for a launch from the UI
 *
 * Prints the mint to put in NEXT_PUBLIC_QUOTE_MINT.
 */
import './env';
import fs from 'node:fs';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from '@solana/spl-token';

const DECIMALS = 8; // HYPE on Solana has 8; the real mint is still read on-chain, never assumed

async function main() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com';
  if (!rpc.includes('devnet')) throw new Error(`refusing to create a test mint on ${rpc}: devnet only`);
  const connection = new Connection(rpc, 'confirmed');
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.PAYER_KEYPAIR ?? './keys/payer.json', 'utf8'))));

  const mint = process.env.NEXT_PUBLIC_QUOTE_MINT && process.env.REUSE_MINT ? new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT) : await createMint(connection, payer, payer.publicKey, null, DECIMALS);
  const unit = 10n ** BigInt(DECIMALS);
  const recipients: [PublicKey, bigint][] = [[payer.publicKey, 10_000n * unit]];
  if (process.env.TEST_WALLET) recipients.push([new PublicKey(process.env.TEST_WALLET), 1_000n * unit]);

  for (const [owner, amount] of recipients) {
    const ata = await getOrCreateAssociatedTokenAccount(connection, payer, mint, owner);
    await mintTo(connection, payer, mint, ata.address, payer, amount);
    console.log(`minted ${amount / unit} test HYPE to ${owner.toBase58()}`);
  }
  console.log(`\ntest quote mint (${DECIMALS} dec): ${mint.toBase58()}\n→ NEXT_PUBLIC_QUOTE_MINT=${mint.toBase58()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
