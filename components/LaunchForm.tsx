'use client';
import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { ANTI_SNIPER_FEE, BASE_FEE, RENT_ESTIMATE_SOL, pct } from '@/lib/curve';
import { useQuadConfig } from '@/lib/useQuadConfig';
import { fromUnits, isAmount, tradeUrl, useLaunch } from '@/lib/useLaunch';
import { Button } from './Button';

/**
 * The white launch card from the landing design: everything on one card, one wallet signature.
 * The step-by-step version lives on /launch (LaunchWizard).
 */
export function LaunchForm() {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { config, error: configError } = useQuadConfig();
  const { launch, phase: step, result } = useLaunch();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [firstBuy, setFirstBuy] = useState('');

  const threshold = config ? fromUnits(config.threshold, config.quoteDecimals) : null;
  const validBuy = isAmount(firstBuy);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return setVisible(true);
    const r = await launch({ name, ticker, firstBuy });
    if (r.ok) {
      setName('');
      setTicker('');
      setFirstBuy('');
    }
  }

  const busyLabel = { upload: 'Uploading metadata…', sign: 'Waiting for wallet…', confirm: 'Confirming…' };
  const fee = config && config.poolCreationFee > 0n ? `Launch fee ${fromUnits(config.poolCreationFee, 9)} SOL plus` : 'No launch fee, only';

  return (
    <form id="launch" className="card-light card-lift launch-card" data-theme="light" onSubmit={onSubmit}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2>Launch one</h2>
        <span className="label"><span className="hide-m">One transaction</span><span className="show-m-i">One tx</span></span>
      </div>
      <div className="launch-pair">
        <div className="field"><label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hypedog" maxLength={32} required /></div>
        <div className="field"><label htmlFor="ticker">Ticker</label><input id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="HDOG" maxLength={10} required /></div>
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><label htmlFor="curve"><span className="hide-m">Curve · </span>HYPE to graduate</label><span className="num">{threshold ?? '—'} HYPE</span></div>
        <input id="curve" type="range" min={0} max={threshold ?? 1} value={threshold ?? 0} disabled readOnly style={{ height: 24, padding: 0, border: 0, accentColor: 'var(--brand)' }} />
        <div className="track show-m" aria-hidden="true"><span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" /></div>
        <span className="hint">Set by the QUAD config, the same for every coin. Other depths need their own config key.</span>
      </div>
      <div className="field">
        <label htmlFor="firstbuy">First buy · optional</label>
        <input id="firstbuy" inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} placeholder="0.00 HYPE" aria-invalid={!validBuy} />
        <span className="hint">Your own buy in the launch transaction pays {pct(BASE_FEE)}, not the {pct(ANTI_SNIPER_FEE)} anti-sniper fee.</span>
      </div>
      <Button type="submit" disabled={step !== null || !config || !validBuy} style={{ height: 52, fontSize: 16 }}>
        {step ? busyLabel[step] : publicKey ? 'Launch coin →' : 'Connect wallet to launch'}
      </Button>
      {configError && <p role="alert" className="num" style={{ margin: 0, fontSize: 12, color: 'var(--danger)', wordBreak: 'break-all' }}>{configError}</p>}
      {result && (
        <p role="status" className="num" style={{ margin: 0, fontSize: 12, wordBreak: 'break-all', color: result.ok ? 'var(--success)' : 'var(--danger)' }}>
          {result.ok ? <>Launched · <a href={tradeUrl(result.baseMint)} target="_blank" rel="noopener" style={{ textDecoration: 'underline' }}>pool {result.pool}</a></> : result.message}
        </p>
      )}
      <p style={{ margin: 0, font: '500 12px/18px var(--font-sans)', color: 'var(--text-muted)' }}>{fee} about {RENT_ESTIMATE_SOL} SOL of rent. Mint authority is revoked in the same transaction. The coin never gets a freeze authority.</p>
    </form>
  );
}
