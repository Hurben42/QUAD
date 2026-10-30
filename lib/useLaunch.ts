'use client';
import { useCallback, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buildLaunchTx, QUOTE_MINT } from './dbc';
import { useQuadConfig } from './useQuadConfig';

/** "1.5" → 150000000n at 8 decimals, without float rounding. */
export const toUnits = (amount: string, decimals: number) => {
  const [int = '0', frac = ''] = amount.trim().split('.');
  return BigInt(int || '0') * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
};
export const fromUnits = (x: bigint, decimals: number) => Number(x) / 10 ** decimals;
export const isAmount = (s: string) => s === '' || /^\d*\.?\d*$/.test(s.trim());

/** `image` is a data URL from lib/image.ts; links as typed, normalized by the server. */
export type LaunchInput = { name: string; ticker: string; firstBuy: string; description?: string; image?: string; website?: string; twitter?: string; telegram?: string };
export type LaunchPhase = 'upload' | 'sign' | 'confirm';
export type LaunchResult = { ok: true; pool: string; baseMint: string; sig: string } | { ok: false; message: string; phase: LaunchPhase };

const cluster = process.env.NEXT_PUBLIC_CLUSTER;
export const explorerTx = (sig: string) => `https://solscan.io/tx/${sig}${cluster && cluster !== 'mainnet-beta' ? `?cluster=${cluster}` : ''}`;
export const tradeUrl = (baseMint: string) => `https://jup.ag/swap/${QUOTE_MINT.toBase58()}-${baseMint}`;

/**
 * The launch itself: metadata to Irys (/api/metadata), then one wallet signature for
 * create pool (+ first buy), then confirmation. `phase` follows each step for the UI.
 */
export function useLaunch() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { config } = useQuadConfig();
  const [phase, setPhase] = useState<LaunchPhase | null>(null);
  const [result, setResult] = useState<LaunchResult | null>(null);

  const launch = useCallback(
    async (input: LaunchInput): Promise<LaunchResult> => {
      let current: LaunchPhase = 'upload';
      const step = (p: LaunchPhase) => setPhase((current = p));
      setResult(null);
      try {
        if (!publicKey) throw new Error('Connect a wallet first.');
        if (!config) throw new Error('The QUAD config is not loaded yet.');
        step('upload');
        const res = await fetch('/api/metadata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: input.name, symbol: input.ticker, description: input.description, image: input.image, website: input.website, twitter: input.twitter, telegram: input.telegram }) });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? 'metadata upload failed');

        step('sign');
        const firstBuyQuoteLamports = input.firstBuy ? toUnits(input.firstBuy, config.quoteDecimals) : undefined;
        const { tx, baseMint, pool } = await buildLaunchTx(connection, { name: input.name, symbol: input.ticker, uri: body.uri, creator: publicKey, firstBuyQuoteLamports });
        const sig = await sendTransaction(tx, connection, { signers: [baseMint] });

        step('confirm');
        const latest = await connection.getLatestBlockhash();
        const conf = await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
        if (conf.value.err) throw new Error(`transaction failed: ${JSON.stringify(conf.value.err)}`);
        const ok: LaunchResult = { ok: true, pool: pool.toBase58(), baseMint: baseMint.publicKey.toBase58(), sig };
        setResult(ok);
        window.dispatchEvent(new Event('quad:launched'));
        return ok;
      } catch (err) {
        const failed: LaunchResult = { ok: false, message: err instanceof Error ? err.message : String(err), phase: current };
        setResult(failed);
        return failed;
      } finally {
        setPhase(null);
      }
    },
    [connection, publicKey, sendTransaction, config],
  );

  return { launch, phase, result, reset: () => setResult(null) };
}
