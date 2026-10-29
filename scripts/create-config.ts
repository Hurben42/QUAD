/**
 * Creates the QUAD partner config on Meteora DBC.
 *
 *   pnpm config:devnet    (CLUSTER=devnet, use your own 8-decimal test quote mint in NEXT_PUBLIC_QUOTE_MINT)
 *   pnpm config:mainnet   (CLUSTER=mainnet-beta, real HYPE)
 *
 * Prints the config public key to put in NEXT_PUBLIC_DBC_CONFIG.
 * The parameters themselves live in lib/quad-config.ts (values from lib/curve.ts and the constants there).
 */
import 'dotenv/config';
import fs from 'node:fs';
import { Connection, Keypair, PublicKey, sendAndConfirmTransaction } from '@solana/web3.js';
import { DynamicBondingCurveClient } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { verifyCurve } from '../lib/curve';
import { readQuoteMint } from '../lib/hype';
import { buildQuadConfigParams } from '../lib/quad-config';

async function main() {
  const cluster = process.env.CLUSTER ?? 'devnet';
  const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? (cluster === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com');
  const connection = new Connection(rpc, 'confirmed');
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(process.env.PAYER_KEYPAIR ?? './keys/payer.json', 'utf8'))));
  const feeClaimer = new PublicKey(process.env.NEXT_PUBLIC_FEE_CLAIMER || payer.publicKey);
  const quote = await readQuoteMint(connection, new PublicKey(process.env.NEXT_PUBLIC_QUOTE_MINT!));
  const config = Keypair.generate();

  const { params, curve } = buildQuadConfigParams({
    payer: payer.publicKey,
    config: config.publicKey,
    feeClaimer,
    quoteMint: quote.mint,
    quoteDecimals: quote.decimals,
  });
  const check = verifyCurve(curve.sqrtStartPrice, curve.points);

  console.log(`cluster ${cluster} · quote ${quote.mint.toBase58()} (${quote.decimals} dec, ${quote.tokenType ? 'Token-2022' : 'SPL'})`);
  console.log(`curve base ${curve.curveBase} · migration base ${curve.migrationBase} · leftover ${curve.leftover}`);
  curve.eras.forEach((e, i) => console.log(`era ${i + 1}: base ${e.base} quote ${e.quote} avgPrice ${e.avgPrice.toExponential(4)}`));
  console.log(`verify: base ${check.base} quote ${check.quote}`);

  const client = new DynamicBondingCurveClient(connection, 'confirmed');
  const tx = await client.partner.createConfig(params); // runs the SDK's validateConfigParameters first
  const sig = await sendAndConfirmTransaction(connection, tx, [payer, config]);
  console.log(`\nconfig created: ${config.publicKey.toBase58()}\ntx ${sig}\n→ NEXT_PUBLIC_DBC_CONFIG=${config.publicKey.toBase58()}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
