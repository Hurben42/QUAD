'use client';
import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { buildLaunchTx } from '@/lib/dbc';
import { ANTI_SNIPER_FEE, BASE_FEE, pct } from '@/lib/curve';
import { useQuadConfig } from '@/lib/useQuadConfig';
import { Button } from './Button';

const toUnits = (amount: string, decimals: number) => {
  const [int = '0', frac = ''] = amount.trim().split('.');
  return BigInt(int || '0') * 10n ** BigInt(decimals) + BigInt((frac + '0'.repeat(decimals)).slice(0, decimals) || '0');
};
const fromUnits = (x: bigint, decimals: number) => Number(x) / 10 ** decimals;

type Result = { ok: true; pool: string; sig: string } | { ok: false; message: string };

/**
 * The white launch card from the design. One wallet signature: create pool (+ optional first buy).
 * Metadata goes to Irys first through /api/metadata.
 */
export function LaunchForm() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const { config, error: configError } = useQuadConfig();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [firstBuy, setFirstBuy] = useState('');
  const [step, setStep] = useState<null | 'upload' | 'sign' | 'confirm'>(null);
  const [result, setResult] = useState<Result | null>(null);

  const threshold = config ? fromUnits(config.threshold, config.quoteDecimals) : null;
  const validBuy = firstBuy === '' || /^\d*\.?\d*$/.test(firstBuy.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return setVisible(true);
    if (!config) return;
    setResult(null);
    try {
      setStep('upload');
      const res = await fetch('/api/metadata', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, symbol: ticker }) });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? 'metadata upload failed');

      setStep('sign');
      const firstBuyQuoteLamports = firstBuy ? toUnits(firstBuy, config.quoteDecimals) : undefined;
      const { tx, baseMint, pool } = await buildLaunchTx(connection, { name, symbol: ticker, uri: body.uri, creator: publicKey, firstBuyQuoteLamports });
      const sig = await sendTransaction(tx, connection, { signers: [baseMint] });

      setStep('confirm');
      const latest = await connection.getLatestBlockhash();
      const conf = await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      if (conf.value.err) throw new Error(`transaction failed: ${JSON.stringify(conf.value.err)}`);
      setResult({ ok: true, pool: pool.toBase58(), sig });
      setName('');
      setTicker('');
      setFirstBuy('');
      window.dispatchEvent(new Event('quad:launched'));
    } catch (err) {
      setResult({ ok: false, message: err instanceof Error ? err.message : String(err) });
    } finally {
      setStep(null);
    }
  }

  const busyLabel = { upload: 'Uploading metadata…', sign: 'Waiting for wallet…', confirm: 'Confirming…' };
  const fee = config && config.poolCreationFee > 0n ? `Launch fee ${fromUnits(config.poolCreationFee, 9)} SOL plus` : 'No launch fee, only';

  return (
    <form id="launch" className="card-light" data-theme="light" onSubmit={onSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 24px 60px -24px #00000099', width: '100%', maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, font: '800 28px/1.1 var(--font-sans)', letterSpacing: '-0.02em' }}>Launch one</h2>
        <span className="label">One transaction</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <div className="field"><label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hypedog" maxLength={32} required /></div>
        <div className="field"><label htmlFor="ticker">Ticker</label><input id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="HDOG" maxLength={10} required /></div>
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><label htmlFor="curve">Curve · HYPE to graduate</label><span className="num">{threshold ?? '—'} HYPE</span></div>
        <input id="curve" type="range" min={0} max={threshold ?? 1} value={threshold ?? 0} disabled readOnly style={{ height: 24, padding: 0, border: 0, accentColor: 'var(--brand)' }} />
        <span style={{ font: '500 12px/16px var(--font-sans)', color: 'var(--text-muted)' }}>Set by the QUAD config, the same for every coin. Other depths need their own config key.</span>
      </div>
      <div className="field">
        <label htmlFor="firstbuy">First buy · optional</label>
        <input id="firstbuy" inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} placeholder="0.00 HYPE" aria-invalid={!validBuy} />
        <span style={{ font: '500 12px/16px var(--font-sans)', color: 'var(--text-muted)' }}>Your own buy in the launch transaction pays {pct(BASE_FEE)}, not the {pct(ANTI_SNIPER_FEE)} anti-sniper fee.</span>
      </div>
      <Button type="submit" disabled={step !== null || !config || !validBuy} style={{ height: 52, fontSize: 16 }}>
        {step ? busyLabel[step] : publicKey ? 'Launch coin →' : 'Connect wallet to launch'}
      </Button>
      {configError && <p role="alert" className="num" style={{ margin: 0, fontSize: 12, color: 'var(--danger)', wordBreak: 'break-all' }}>{configError}</p>}
      {result && (
        <p role="status" className="num" style={{ margin: 0, fontSize: 12, wordBreak: 'break-all', color: result.ok ? 'var(--success)' : 'var(--danger)' }}>
          {result.ok ? <>Launched · <a href={`/coin/${result.pool}`} style={{ textDecoration: 'underline' }}>pool {result.pool}</a></> : result.message}
        </p>
      )}
      <p style={{ margin: 0, font: '500 12px/18px var(--font-sans)', color: 'var(--text-muted)' }}>{fee} about 0.021 SOL of rent. Mint authority is revoked in the same transaction. The coin never gets a freeze authority.</p>
    </form>
  );
}
