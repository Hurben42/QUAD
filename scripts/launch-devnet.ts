/**
 * Devnet: launch a coin through the same code path as the UI (lib/dbc.ts#buildLaunchTx),
 * signed by the payer keypair instead of a browser wallet.
 *
 *   pnpm dev                                    # in another terminal: serves /api/metadata (Irys)
 *   NAME=Testdog SYMBOL=TDOG FIRST_BUY=1 pnpm launch:devnet
 */
import './env';
import fs from 'node:fs';
import { Connection, Keypair, sendAndConfirmTransaction } from '@solana/web3.js';
import { buildLaunchTx } from '../lib/dbc';
import { readQuoteMint } from '../lib/hype';
import { QUOTE_MINT } from '../lib/dbc';

async function main() {
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com';
  if (!rpc.includes('devnet')) throw new Error('devnet only');
  const connection = new Connection(rpc, 'confirmed');
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.PAYER_KEYPAIR ?? './keys/payer.json', 'utf8'))));
  const name = process.env.NAME ?? 'Testdog';
  const symbol = process.env.SYMBOL ?? 'TDOG';
  const quote = await readQuoteMint(connection, QUOTE_MINT);

  const app = process.env.APP_URL ?? 'http://localhost:3000';
  const res = await fetch(`${app}/api/metadata`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, symbol }) });
  const body = await res.json();
  if (!res.ok) throw new Error(`metadata: ${body.error}`);
  console.log(`metadata ${body.uri}`);

  const firstBuy = process.env.FIRST_BUY ? BigInt(Math.round(Number(process.env.FIRST_BUY) * 10 ** quote.decimals)) : undefined;
  const { tx, baseMint, pool } = await buildLaunchTx(connection, { name, symbol, uri: body.uri, creator: payer.publicKey, firstBuyQuoteLamports: firstBuy });
  const sig = await sendAndConfirmTransaction(connection, tx, [payer, baseMint]);
  console.log(`launched ${name} ($${symbol})\npool ${pool.toBase58()}\nmint ${baseMint.publicKey.toBase58()}\ntx ${sig}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
