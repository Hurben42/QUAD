'use client';
import { useCallback, useEffect, useState } from 'react';
import { PublicKey, type Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buildClaimCreatorFeeTx, buildWithdrawSurplusTx, listCreatorPools, type CreatorPool } from '@/lib/dbc';
import { CREATOR_FEE, pct } from '@/lib/curve';
import { useQuadConfig } from '@/lib/useQuadConfig';
import { Button } from './Button';
import { WalletButton } from './WalletButton';

type Action = { pool: string; kind: 'claim' | 'surplus' };

/** Creator fees and surplus for the connected wallet's coins. */
export function CreatorDashboard() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { config } = useQuadConfig();
  const [pools, setPools] = useState<CreatorPool[] | null>(null);
  const [busy, setBusy] = useState<Action | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    if (!publicKey) return setPools(null);
    try {
      setPools(await listCreatorPools(connection, publicKey));
    } catch (e) {
      setMessage({ ok: false, text: String(e) });
    }
  }, [connection, publicKey]);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action: Action, build: () => Promise<Transaction>) {
    setBusy(action);
    setMessage(null);
    try {
      const sig = await sendTransaction(await build(), connection);
      const latest = await connection.getLatestBlockhash();
      const conf = await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      if (conf.value.err) throw new Error(`transaction failed: ${JSON.stringify(conf.value.err)}`);
      setMessage({ ok: true, text: action.kind === 'claim' ? 'Fees claimed to your wallet.' : 'Surplus withdrawn to your wallet.' });
      await load();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  }

  const hype = (x: bigint) => (config ? (Number(x) / 10 ** config.quoteDecimals).toFixed(4) : '—');
  const total = pools?.reduce((s, p) => s + p.unclaimedQuoteFee, 0n) ?? 0n;

  if (!publicKey)
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'flex-start' }}>
        <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)' }}>Connect the wallet you launched with to see your coins.</p>
        <WalletButton />
      </div>
    );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="q-tile" style={{ alignSelf: 'flex-start' }}>
        <div className="q-tile__pixel" />
        <div className="q-tile__num">{hype(total)} <em>HYPE</em></div>
        <div className="q-tile__label">Unclaimed · {pct(CREATOR_FEE)} of every trade</div>
      </div>
      {message && <p role="status" className="num" style={{ margin: 0, fontSize: 13, wordBreak: 'break-all', color: message.ok ? 'var(--success)' : 'var(--danger)' }}>{message.text}</p>}
      {pools === null ? (
        <p className="label">Loading your coins…</p>
      ) : pools.length === 0 ? (
        <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)' }}>No coin launched from this wallet yet. <a href="/launch" style={{ textDecoration: 'underline' }}>Launch one</a>.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pools.map((p) => {
            const pool = new PublicKey(p.pool);
            const claiming = busy?.pool === p.pool && busy.kind === 'claim';
            const withdrawing = busy?.pool === p.pool && busy.kind === 'surplus';
            return (
              <div key={p.pool} className="coin-card" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', padding: '16px 24px' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ font: '700 18px/24px var(--font-sans)' }}>{p.name || p.baseMint.slice(0, 6)} <span className="num" style={{ fontSize: 13, color: 'var(--text-muted)' }}>${p.symbol}</span></span>
                  <span className="label">{p.migrated ? 'Graduated' : p.curveComplete ? 'Curve complete' : 'On the curve'}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span className="num">{hype(p.unclaimedQuoteFee)} HYPE</span>
                  <Button sm disabled={busy !== null || p.unclaimedQuoteFee === 0n} onClick={() => run({ pool: p.pool, kind: 'claim' }, () => buildClaimCreatorFeeTx(connection, publicKey, pool))}>
                    {claiming ? 'Claiming…' : 'Claim fees'}
                  </Button>
                  {p.curveComplete && (
                    <Button sm variant="secondary" disabled={busy !== null || p.surplusWithdrawn} onClick={() => run({ pool: p.pool, kind: 'surplus' }, () => buildWithdrawSurplusTx(connection, publicKey, pool))}>
                      {p.surplusWithdrawn ? 'Surplus withdrawn' : withdrawing ? 'Withdrawing…' : 'Withdraw surplus'}
                    </Button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
