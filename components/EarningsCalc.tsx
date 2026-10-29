'use client';
import { useState } from 'react';
import { CREATOR_FEE, pct } from '@/lib/curve';

const MAX_VOLUME = 10_000;
const STEP = 50;
const START = 1_000;

/** Volume traded on your coin → what you earn, at the creator's share of every trade. */
export function EarningsCalc() {
  const [volume, setVolume] = useState(START);
  const earned = volume * CREATOR_FEE;
  return (
    <div className="cr-calc">
      <div className="cr-calc-row">
        <label htmlFor="cr-volume" className="label">Volume traded on your coin</label>
        <span className="num cr-calc-in">{volume.toLocaleString('en-US')} HYPE</span>
      </div>
      <input id="cr-volume" type="range" min={0} max={MAX_VOLUME} step={STEP} value={volume} onChange={(e) => setVolume(Number(e.target.value))} style={{ ['--v' as string]: `${(volume / MAX_VOLUME) * 100}%` }} />
      <div className="cr-calc-out">
        <span className="label">You earn · {pct(CREATOR_FEE)}</span>
        <span className="num">{earned.toLocaleString('en-US', { maximumFractionDigits: 2 })} <em>HYPE</em></span>
      </div>
    </div>
  );
}
