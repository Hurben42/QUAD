/**
 * Server-only: upload a coin's metadata JSON to Irys (permanent on mainnet, ~60 days on devnet).
 * JSON under 100 KiB is free on Irys, so the platform key only signs — it never needs a balance.
 */
import 'server-only';
import fs from 'node:fs';
import bs58 from 'bs58';
import { Uploader } from '@irys/upload';
import { Solana } from '@irys/upload-solana';

/** IRYS_PRIVATE_KEY (base58 secret key, for hosting) or the PAYER_KEYPAIR file (local dev). Never in the repo. */
function signerSecret(): string {
  if (process.env.IRYS_PRIVATE_KEY) return process.env.IRYS_PRIVATE_KEY;
  const path = process.env.PAYER_KEYPAIR;
  if (path && fs.existsSync(path)) return bs58.encode(Uint8Array.from(JSON.parse(fs.readFileSync(path, 'utf8'))));
  throw new Error('no Irys signer: set IRYS_PRIVATE_KEY or PAYER_KEYPAIR');
}

let uploader: ReturnType<typeof build> | null = null;
function build() {
  const b = Uploader(Solana).withWallet(signerSecret());
  return process.env.NEXT_PUBLIC_CLUSTER === 'devnet' ? b.withRpc(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.devnet.solana.com').devnet() : b;
}

/** Metaplex off-chain metadata, plus the links the launch form collects (what Jupiter and DexScreener read). */
export type CoinMetadata = {
  name: string;
  symbol: string;
  description: string;
  image?: string;
  external_url?: string;
  extensions?: { website?: string; twitter?: string; telegram?: string };
  properties?: { files: { uri: string; type: string }[]; category: 'image' };
};

async function upload(data: string | Buffer, contentType: string): Promise<string> {
  uploader ??= build();
  const irys = await uploader;
  const receipt = await irys.upload(data, { tags: [{ name: 'Content-Type', value: contentType }] });
  return `https://gateway.irys.xyz/${receipt.id}`;
}

export const uploadMetadata = (meta: CoinMetadata) => upload(JSON.stringify(meta), 'application/json');
/** The coin's image (PNG, JPEG or WebP under 100 KiB, resized by the browser). */
export const uploadImage = (data: Buffer, contentType: string) => upload(data, contentType);
