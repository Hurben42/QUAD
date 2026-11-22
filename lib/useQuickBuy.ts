'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { buildCurveSwapTx, quoteCurveSwap, readCurveState, referralTokenAccount } from './dbc';

export type QuickBuyStatus =
  | { pool: string; symbol: string; phase: 'sign' | 'confirm'; sig?: string }
  | { pool: string; symbol: string; phase: 'done'; sig: string }
  | { pool: string; symbol: string; phase: 'error'; message: string };

/**
 * One-click buys for the live board: a fixed HYPE amount straight on the curve, quoted against
 * the pool's state at click time, with QUAD's referral cut like the token page's panel.
 * One buy at a time; a click while one is in flight is ignored.
 */
export function useQuickBuy(onDone?: () => void) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [status, setStatus] = useState<QuickBuyStatus | null>(null);
  const referral = useRef<PublicKey | null | undefined>(undefined);
  const busy = useRef(false);

  useEffect(() => {
    referralTokenAccount(connection).then((r) => (referral.current = r), () => (referral.current = null));
  }, [connection]);

  const buy = useCallback(
    async (pool: string, symbol: string, amountIn: bigint, slippageBps: number) => {
      if (!publicKey) return setVisible(true);
      if (busy.current || amountIn <= 0n) return;
      busy.current = true;
      setStatus({ pool, symbol, phase: 'sign' });
      try {
        const poolKey = new PublicKey(pool);
        const state = await readCurveState(connection, poolKey);
        if (state.migrated) throw new Error('graduated: it trades on Jupiter now');
        const ref = referral.current ?? null;
        const quote = quoteCurveSwap(state, 'buy', amountIn, slippageBps, !!ref);
        const tx = await buildCurveSwapTx(connection, { pool: poolKey, owner: publicKey, side: 'buy', amountIn: quote.amountIn, minimumOut: quote.minimumOut, referralTokenAccount: ref });
        const sig = await sendTransaction(tx, connection);
        setStatus({ pool, symbol, phase: 'confirm', sig });
        const latest = await connection.getLatestBlockhash();
        const conf = await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
        if (conf.value.err) throw new Error(`transaction failed: ${JSON.stringify(conf.value.err)}`);
        setStatus({ pool, symbol, phase: 'done', sig });
        onDone?.();
      } catch (e) {
        setStatus({ pool, symbol, phase: 'error', message: e instanceof Error ? e.message : String(e) });
      } finally {
        busy.current = false;
      }
    },
    [connection, publicKey, sendTransaction, setVisible, onDone],
  );

  return { buy, status, clear: useCallback(() => setStatus(null), []), connected: !!publicKey, owner: publicKey };
}
