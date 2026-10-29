'use client';
import { useState } from 'react';
import { SiteHeader } from './SiteHeader';
import { Stripes } from './Stripes';
import { QuadMark } from './Lockup';
import { LaunchWizard } from './LaunchWizard';
import { CREATOR_FEE, pct } from '@/lib/curve';

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;

// Rays to the bottom centre, like the landing hero (viewBox 1400×900)
const RAYS = [-300, -60, 180, 420, 600, 800, 980, 1220, 1460, 1700];
const HORIZONS = [800, 690, 590];

/**
 * The /launch screen: era light across the top that brightens one era per step, rays converging
 * on the bottom centre, grain on the sky only (never on the cards).
 */
export function LaunchSky() {
  const [sun, setSun] = useState(1);
  return (
    <main className="lp" style={{ ['--sun' as string]: sun }}>
      <div className="lp-sky grain" aria-hidden="true">
        <div className="lp-glow"><Stripes /></div>
        <svg className="lp-rays" viewBox="0 0 1400 900" preserveAspectRatio="none">
          {RAYS.map((x, i) => <line key={x} x1="700" y1="900" x2={x} y2="0" pathLength={1} style={d(i)} />)}
          {HORIZONS.map((y, i) => <line key={y} x1="0" y1={y} x2="1400" y2={y} pathLength={1} style={d(RAYS.length + i)} />)}
        </svg>
      </div>

      <SiteHeader className="rise" style={d(0)} />

      <section className="lp-intro">
        <span className="lp-pill rise" style={d(1)}>
          <span className="lp-pill-mark"><QuadMark height={12} fill="white" /></span>
          Quoted in HYPE · on Solana
        </span>
        <h1 className="lp-h1 rise" style={d(2)}>Launch a coin in four eras.</h1>
        <p className="lp-lede rise" style={d(3)}>Four steps, one signature. You earn {pct(CREATOR_FEE)} of every trade, in HYPE.</p>
      </section>

      <LaunchWizard onSun={setSun} />
    </main>
  );
}
