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

  return (
    <form id="launch" className="card-light card-lift launch-card lf" data-theme="light" onSubmit={onSubmit}>
      <div className="lf-sweep" aria-hidden="true" />
      <div className="lf-head">
        <div className="lf-title">
          <span className="label">01 / Launch</span>
          <h2>Launch one</h2>
        </div>
        <a className="lf-steps" href="/launch">Step by step <span className="num">→</span></a>
      </div>

      <div className="launch-pair">
        <div className="field lf-field"><label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hypedog" maxLength={32} required autoComplete="off" /></div>
        <div className="field lf-field"><label htmlFor="ticker">Ticker</label><div className="lf-affix"><span className="num">$</span><input id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="HDOG" maxLength={10} required autoComplete="off" /></div></div>
      </div>

      <div className="lf-curve" aria-label={`Four eras, graduates at ${threshold ?? '—'} HYPE`}>
        <div className="lf-curve-steps" aria-hidden="true">
          {[8, 4, 2, 1].map((w, i) => <i key={i} style={{ flex: w, height: `${100 / 2 ** (3 - i)}%`, background: `var(--era-${i + 1})` }} />)}
        </div>
        <div className="lf-curve-meta">
          <span className="label">The curve · same for every coin</span>
          <span className="lf-curve-grad"><span className="num">{threshold ?? '—'}</span> HYPE to graduate</span>
        </div>
      </div>

      <div className="field lf-field">
        <div className="lf-row"><label htmlFor="firstbuy">First buy · optional</label><span className="hint">{pct(BASE_FEE)} fee, not {pct(ANTI_SNIPER_FEE)}</span></div>
        <div className="lf-affix lf-affix--end"><input id="firstbuy" inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} placeholder="0.00" aria-invalid={!validBuy} autoComplete="off" /><span className="num">HYPE</span></div>
        <div className="lf-chips">
          {['', '1', '5', '10'].map((v) => <button type="button" key={v || 'none'} className={firstBuy === v ? 'on' : ''} onClick={() => setFirstBuy(v)}>{v ? `${v} HYPE` : 'None'}</button>)}
        </div>
      </div>

      <Button type="submit" className="lf-go" disabled={step !== null || !config || !validBuy}>
        {step ? busyLabel[step] : publicKey ? <>Launch coin <span className="num">→</span></> : 'Connect wallet to launch'}
      </Button>

      {configError && <p role="alert" className="lf-alert"><i />{configError}</p>}
      {result && (
        <p role="status" className={`lf-alert ${result.ok ? 'lf-alert--ok' : ''}`}>
          <i />{result.ok ? <>Launched · <a href={tradeUrl(result.baseMint)} target="_blank" rel="noopener">pool {result.pool}</a></> : result.message}
        </p>
      )}

      <ul className="lf-facts">
        <li><span className="num">{config && config.poolCreationFee > 0n ? `${fromUnits(config.poolCreationFee, 9)} SOL` : '0 SOL'}</span><span>launch fee</span></li>
        <li><span className="num">≈ {RENT_ESTIMATE_SOL} SOL</span><span>rent</span></li>
        <li><span className="num">0 / 0</span><span>mint · freeze</span></li>
      </ul>
    </form>
  );
}
