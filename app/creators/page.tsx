import { SiteHeader } from '@/components/SiteHeader';
import { LinkButton } from '@/components/Button';
import { FeeStream } from '@/components/FeeStream';
import { CreatorCard } from '@/components/CreatorCard';
import { Stripes } from '@/components/Stripes';
import { EarningsCalc } from '@/components/EarningsCalc';
import { CreatorDashboard } from '@/components/CreatorDashboard';
import { BASE_FEE, CREATOR_FEE, DEFAULT_THRESHOLD_HYPE, PROTOCOL_FEE_SHARE, pct } from '@/lib/curve';

export const metadata = { title: 'Creators — QUAD', description: `Launch a coin on QUAD and earn ${pct(CREATOR_FEE)} of every trade, in HYPE. Claim it any time.` };

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;
// Rays converging under the cards (viewBox 1400×900), like the landing hero
const RAYS = [200, 480, 760, 980, 1180, 1400, 1640, 1900];

const era = (i: number) => ({ ['--era' as string]: `var(--era-${i})`, ['--era-t' as string]: `var(--era-${i}-text)` }) as React.CSSProperties;

export default function CreatorsPage() {
  const protocolFee = BASE_FEE * PROTOCOL_FEE_SHARE;
  // To graduate, buys must leave the threshold in the pool after fees, so they pay fees on more than it.
  const minGraduationEarnings = (DEFAULT_THRESHOLD_HYPE / (1 - BASE_FEE)) * CREATOR_FEE;

  return (
    <main className="cr">
      <div className="cr-sky grain" aria-hidden="true">
        <div className="cr-glow"><Stripes /></div>
        <svg className="cr-rays" viewBox="0 0 1400 900" preserveAspectRatio="none">
          {RAYS.map((x, i) => <line key={x} x1="1000" y1="900" x2={x} y2="0" pathLength={1} style={d(i)} />)}
          {[780, 660].map((y, i) => <line key={y} x1="0" y1={y} x2="1400" y2={y} pathLength={1} style={d(RAYS.length + i)} />)}
        </svg>
      </div>
      <SiteHeader className="rise" style={d(0)} />

      {/* HERO */}
      <section className="cr-hero">
        <div className="cr-copy">
          <span className="label rise" style={d(1)}>Creators</span>
          <h1 className="rise" style={d(2)}>Your coin<br />pays you in HYPE.</h1>
          <p className="cr-lede rise" style={d(3)}>
            Launch a coin and the wallet you launch with earns {pct(CREATOR_FEE)} of every trade, buy or sell, in HYPE. It accrues in the pool and waits for you. No vesting, no lock, no form to fill.
          </p>
          <div className="cr-ctas rise" style={d(4)}>
            <LinkButton href="/launch">Launch a coin <span className="num">→</span></LinkButton>
            <LinkButton variant="secondary" href="#claim">Claim your fees</LinkButton>
          </div>
          <dl className="cr-stats rise" style={d(5)}>
            <div><dt className="label">Per trade</dt><dd className="num">{pct(CREATOR_FEE)}</dd></div>
            <div><dt className="label">Paid in</dt><dd className="num">HYPE</dd></div>
            <div><dt className="label">Claim</dt><dd className="num">Any time</dd></div>
          </dl>
        </div>

        <div className="cr-card-stage rise" style={d(3)}>
          <div className="cr-card cr-card--back" aria-hidden="true"><CreatorCard symbol="VOLT" pool="9vQe3Lm7pTn2Kx8RfW4yUaZc1HbD6sJgNo5EiVrXwq" era={3} progress={0.68} claimable="0.4210" sample /></div>
          <div className="cr-card"><CreatorCard symbol="SDOG" pool="7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU" era={2} progress={0.42} claimable="0.8125" earned="3.4125" sample /></div>
        </div>
      </section>

      {/* 01 HOW YOU EARN */}
      <section className="cr-sec">
        <div className="cr-head"><span className="label">01 / How you earn</span><h2>Three steps, one of them is yours.</h2></div>
        <ol className="cr-steps">
          <li className="doc-rule" style={era(1)}>
            <div className="doc-rule-top"><span className="label">Step 01</span><span className="num doc-rule-stat">Launch</span></div>
            <h3>You launch the coin.</h3>
            <p>The wallet that signs the launch is the creator. It is written into the pool, so the fees can only ever go there.</p>
          </li>
          <li className="doc-rule" style={era(2)}>
            <div className="doc-rule-top"><span className="label">Step 02</span><span className="num doc-rule-stat">Trade</span></div>
            <h3>People trade it.</h3>
            <p>Every buy and every sell on the curve pays {pct(BASE_FEE)}. {pct(CREATOR_FEE)} of the trade is set aside for you, in HYPE.</p>
          </li>
          <li className="doc-rule" style={era(4)}>
            <div className="doc-rule-top"><span className="label">Step 03</span><span className="num doc-rule-stat">Claim</span></div>
            <h3>You claim it.</h3>
            <p>Whenever you like, in one transaction, to your wallet. What you do not claim stays yours in the pool.</p>
          </li>
        </ol>
      </section>

      {/* 02 THE MATH */}
      <section className="cr-sec">
        <div className="cr-head">
          <span className="label">02 / The math</span>
          <h2>Volume in, HYPE out.</h2>
          <p>Your share does not depend on price, only on how much is traded. A coin that graduates has traded at least {DEFAULT_THRESHOLD_HYPE} HYPE on its way up: at least <span className="num">{minGraduationEarnings.toFixed(2)} HYPE</span> to its creator, before a single sell.</p>
        </div>
        <div className="cr-math-row">
          <FeeStream />
          <EarningsCalc />
        </div>
      </section>

      {/* 03 WHERE THE FEE GOES */}
      <section className="cr-sec">
        <div className="cr-head"><span className="label">03 / Where the fee goes</span><h2>Most of every fee is yours.</h2></div>
        <div className="cr-split">
          <div className="cr-split-bar" aria-hidden="true">
            <i style={{ flex: CREATOR_FEE / BASE_FEE, background: 'var(--era-sweep)' }}><span className="num">{pct(CREATOR_FEE)}</span></i>
            <i style={{ flex: protocolFee / BASE_FEE, background: 'var(--surface-2)' }}><span className="num">{pct(protocolFee)}</span></i>
          </div>
          <dl className="cr-split-legend">
            <div><dt><i style={{ background: 'var(--era-4)' }} />Creator</dt><dd className="num">{pct(CREATOR_FEE / BASE_FEE)} of the fee</dd></div>
            <div><dt><i style={{ background: 'var(--line-strong)' }} />Meteora, the pool program</dt><dd className="num">{pct(PROTOCOL_FEE_SHARE)} of the fee</dd></div>
            <div><dt><i style={{ background: 'var(--surface-2)' }} />QUAD</dt><dd className="num">0%</dd></div>
          </dl>
          <p className="cr-after">After graduation the coin trades on a Meteora pool with a 2% fee. You own half of its locked liquidity and claim half of that pool&apos;s fees from Meteora.</p>
        </div>
      </section>

      {/* 04 CLAIM */}
      <section className="cr-sec" id="claim">
        <div className="cr-head"><span className="label">04 / Claim</span><h2>Your coins.</h2><p>Connect the wallet you launched with. Once a curve completes, the HYPE raised above the threshold can also be withdrawn, once.</p></div>
        <div className="cr-claim"><CreatorDashboard /></div>
      </section>

      <footer className="container doc-foot">
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
        <a className="label" href="/docs#creators">Read the docs →</a>
      </footer>
    </main>
  );
}
