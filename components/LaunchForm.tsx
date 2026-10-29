'use client';
import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { buildLaunchTx } from '@/lib/dbc';
import { Button } from './Button';

/** The white launch card from the design. Submits one transaction: create pool (+ optional first buy). */
export function LaunchForm({ quoteDecimals = 8 }: { quoteDecimals?: number }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [threshold, setThreshold] = useState(50);
  const [firstBuy, setFirstBuy] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!publicKey) return setResult('Connect a wallet first.');
    setBusy(true);
    try {
      // TODO: upload { name, symbol, image, description } to Arweave/Irys and pass the uri
      const uri = '';
      const firstBuyQuoteLamports = firstBuy ? BigInt(Math.round(Number(firstBuy) * 10 ** quoteDecimals)) : undefined;
      const { tx, pool } = await buildLaunchTx(connection, { name, symbol: ticker, uri, creator: publicKey, firstBuyQuoteLamports });
      const sig = await sendTransaction(tx, connection);
      setResult(`Launched · pool ${pool.toBase58()} · tx ${sig}`);
    } catch (err) {
      setResult(String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form id="launch" className="card-light" onSubmit={onSubmit} style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 20, boxShadow: '0 24px 60px -24px #00000099', width: '100%', maxWidth: 520 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h2 style={{ margin: 0, font: '800 28px/1.1 var(--font-sans)', letterSpacing: '-0.02em' }}>Launch one</h2>
        <span className="label" style={{ color: '#5b5f7a' }}>One transaction</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16 }}>
        <div className="field"><label htmlFor="name">Name</label><input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Hypedog" required /></div>
        <div className="field"><label htmlFor="ticker">Ticker</label><input id="ticker" value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="HDOG" maxLength={8} required /></div>
      </div>
      <div className="field">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}><label htmlFor="curve">Curve · HYPE to graduate</label><span className="num">{threshold} HYPE</span></div>
        <input id="curve" type="range" min={10} max={200} step={5} value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} style={{ height: 24, padding: 0, border: 0, accentColor: '#f88262' }} />
        <span style={{ font: '500 12px/16px var(--font-sans)', color: '#5b5f7a' }}>The default config graduates at 50 HYPE. Other depths need their own config key (see CLAUDE.md).</span>
      </div>
      <div className="field"><label htmlFor="firstbuy">First buy · optional</label><input id="firstbuy" inputMode="decimal" value={firstBuy} onChange={(e) => setFirstBuy(e.target.value)} placeholder="0.00 HYPE" /><span style={{ font: '500 12px/16px var(--font-sans)', color: '#5b5f7a' }}>Your own buy in the launch transaction pays 3.125%, not the 50% anti-sniper fee.</span></div>
      <Button type="submit" disabled={busy} style={{ height: 52, fontSize: 16 }}>{busy ? 'Launching…' : 'Launch coin →'}</Button>
      {result && <p className="num" style={{ margin: 0, fontSize: 12, wordBreak: 'break-all' }}>{result}</p>}
      <p style={{ margin: 0, font: '500 12px/18px var(--font-sans)', color: '#5b5f7a' }}>Launch fee 0.02 SOL plus about 0.021 SOL of rent. Mint authority is revoked in the same transaction. The coin never gets a freeze authority.</p>
    </form>
  );
}
