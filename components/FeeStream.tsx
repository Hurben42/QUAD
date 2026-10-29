'use client';
import { useEffect, useState } from 'react';
import { CREATOR_FEE, pct } from '@/lib/curve';

// An illustration, not data: a loop of sample trades on a sample coin.
const SAMPLE: [side: 'Buy' | 'Sell', hype: number][] = [
  ['Buy', 4],
  ['Sell', 1.2],
  ['Buy', 0.8],
  ['Buy', 12.5],
  ['Sell', 3.4],
  ['Buy', 2.1],
  ['Buy', 6.4],
  ['Sell', 0.9],
];
const EVERY_MS = 1800;
const SHOWN = 4;

/** The creators hero illustration: trades land, 2.5% of each one adds to the creator's HYPE. */
export function FeeStream() {
  const [n, setN] = useState(SHOWN);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setN((x) => x + 1), EVERY_MS);
    return () => clearInterval(t);
  }, []);

  const trades = Array.from({ length: SHOWN }, (_, i) => {
    const k = n - 1 - i;
    const [side, hype] = SAMPLE[k % SAMPLE.length];
    return { k, side, hype, fee: hype * CREATOR_FEE, era: ((Math.floor(k / 3) % 4) + 1) as 1 | 2 | 3 | 4 };
  });
  const total = Array.from({ length: n }, (_, k) => SAMPLE[k % SAMPLE.length][1] * CREATOR_FEE).reduce((a, b) => a + b, 0);

  return (
    <div className="cr-wallet" aria-label={`Illustration: every trade sends ${pct(CREATOR_FEE)} to the creator, in HYPE`}>
      <div className="cr-wallet-top"><span className="label">Illustration · Creator wallet</span><span className="cr-live"><i />Live</span></div>
      <div className="cr-total">
        <span className="num" key={n}>+{total.toFixed(4)}</span>
        <span className="label">HYPE earned · Sundog $SDOG</span>
      </div>
      <ol className="cr-trades">
        {trades.map((t, i) => (
          <li key={t.k} className={i === 0 ? 'cr-trade cr-trade--new' : 'cr-trade'}>
            <span className={`q-era q-era--${t.era}`}>{t.side}</span>
            <span className="num">{t.hype.toFixed(2)} HYPE</span>
            <span className="num cr-fee">+{t.fee.toFixed(4)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
