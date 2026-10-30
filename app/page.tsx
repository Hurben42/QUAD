import { LinkButton } from '@/components/Button';
import { SiteHeader } from '@/components/SiteHeader';
import { CurveList } from '@/components/CurveList';
import { LaunchForm } from '@/components/LaunchForm';
import { LaunchFeeStat } from '@/components/LaunchFeeStat';
import { RulePosters } from '@/components/RulePosters';
import { GetHype } from '@/components/GetHype';
import { BASE_FEE, CREATOR_FEE, PROTOCOL_FEE_SHARE, TOTAL_COINS, coins, pct } from '@/lib/curve';

/**
 * The landing, section by section, after design/website/landing-desktop.html (≥901px)
 * and landing-mobile.html (≤900px). One DOM; the layout switches in app/globals.css.
 */


// Halving steps: share of the curve's coins (width) and average price (height), per era
const STEPS = [
  { w: 8, h: '12.5%', label: 'Era 1', x: '1×' },
  { w: 4, h: '25%', label: 'Era 2', x: '2×' },
  { w: 2, h: '50%', label: '3', x: '4×' },
  { w: 1, h: '100%', label: '', x: '8×' },
];

/** Entrance order for the hero's staggered animations (see .rise / .rays in globals.css). */
const stagger = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;

function Rays({ viewW, viewH, cx, xs, ys, className, opacity }: { viewW: number; viewH: number; cx: number; xs: number[]; ys: number[]; className: string; opacity: number }) {
  return (
    <svg className={`rays hero-bg ${className}`} aria-hidden="true" viewBox={`0 0 ${viewW} ${viewH}`} preserveAspectRatio="none" style={{ opacity }}>
      {xs.map((x, i) => <line key={x} x1={cx} y1={viewH} x2={x} y2="0" pathLength={1} style={stagger(i)} />)}
      {ys.map((y, i) => <line key={y} className="ray-h" x1="0" y1={y} x2={viewW} y2={y} pathLength={1} style={stagger(xs.length + i)} />)}
    </svg>
  );
}

export default function Page() {
  const stats = [['Fee per trade', 'Fee', pct(BASE_FEE)], ['To creator', 'Creator', `${pct(CREATOR_FEE)} HYPE`], ['Supply', 'Supply', coins(TOTAL_COINS, true)]];
  return (
    <main>
      {/* HERO — full bleed, the nav sits on it. On mobile the launch card drops below the artwork. */}
      <section id="top" className="hero grain">
        <div className="horizon hero-bg" aria-hidden="true" />
        <Rays className="hide-m" viewW={1400} viewH={840} cx={700} xs={[-200, 0, 200, 400, 600, 800, 1000, 1200, 1400, 1600]} ys={[722, 596, 479]} opacity={0.55} />
        <Rays className="show-m" viewW={390} viewH={600} cx={195} xs={[-120, 30, 140, 250, 360, 510]} ys={[480, 340]} opacity={0.5} />

        <SiteHeader className="rise" style={stagger(0)} />

        <div className="hero-grid container">
          <div className="hero-copy">
            <div className="rise" style={{ ...stagger(1), display: 'flex', justifyContent: 'space-between' }}><span className="label">01 / Launchpad<span className="hide-m"> · Solana</span></span><span className="label">Quoted in HYPE</span></div>
            <h1 className="hero-h1"><span className="rise" style={{ ...stagger(2), display: 'block' }}>Four eras.</span><span className="rise" style={{ ...stagger(3), display: 'block' }}>Priced in HYPE.</span></h1>
            <p className="hero-lede rise" style={stagger(4)}>
              {coins(TOTAL_COINS)} coins, minted once.<span className="hide-m"> Traded against HYPE on a curve that climbs in four eras:</span> <span className="hide-m">each</span><span className="show-m-i">Each</span> era sells half as many coins as the last, for the same HYPE. <span className="hide-m">The creator earns</span><span className="show-m-i">Creators earn</span> {pct(CREATOR_FEE)} of every trade, in HYPE.
            </p>
            <div className="hero-ctas rise" style={stagger(5)}><LinkButton href="/launch">Launch coin <span className="num">→</span></LinkButton><LinkButton variant="secondary" href="#rules">See the eras</LinkButton></div>
            <dl className="hero-stats rise" style={stagger(6)}>
              {stats.map(([k, km, v]) => (
                <div key={k}><dt className="label"><span className="hide-m">{k}</span><span className="show-m">{km}</span></dt><dd className="num">{v}</dd></div>
              ))}
            </dl>
          </div>
          <div className="hero-form rise rise-late" style={stagger(3)}><LaunchForm /></div>
        </div>
      </section>

      {/* THE FOUR RULES */}
      <section id="rules" className="sec" style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div className="rules-head sec-head">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span className="label">02 / The 4 rules</span><h2 className="sec-title">Written into the pool at launch.<br className="hide-m" /><span className="hide-m"> Nobody edits them after.</span></h2></div>
          <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 400 }}>Every coin starts with the same four. They live in a Meteora pool config and the bonding curve enforces them trade by trade.</p>
        </div>
        <RulePosters />
      </section>

      {/* THE HALVING STEPS — desktop only in the design */}
      <section className="sec hide-m" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', gap: 48, alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span className="label">03 / The halving steps</span>
          <h2 className="sec-title">Half the coins.<br />Twice the price.</h2>
          <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 440 }}>Of the coins on the curve, era 1 sells 8/15, era 2 sells 4/15, era 3 sells 2/15 and era 4 sells 1/15. Each era raises the same HYPE, so the average price doubles at every step. Graduation moves the pool to Meteora with the liquidity locked.</p>
          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10, font: '500 14px/20px var(--font-sans)', color: 'var(--text-muted)' }}>
            {STEPS.map((s, i) => (
              <li key={i} style={{ display: 'flex', gap: 12 }}><span className="num" style={{ color: `var(--era-${i + 1}-text)`, minWidth: 56 }}>Era {i + 1}</span>{s.w}/15 of the coins · {s.x} price</li>
            ))}
          </ul>
        </div>
        <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }} aria-label="The four eras drawn as steps: widths 8, 4, 2, 1 for the coins sold, heights doubling for the price">
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 360 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ flex: s.w, height: s.h, background: `var(--era-${i + 1})`, borderRadius: '6px 6px 0 0', display: 'flex', alignItems: 'flex-start', justifyContent: s.label ? 'space-between' : 'center', padding: s.label ? '10px 12px' : '10px 6px', color: `var(--on-era-${i + 1})` }}>
                {s.label && <span className="label" style={{ color: 'inherit' }}>{s.label}</span>}<span className="num" style={{ fontSize: 12 }}>{s.x}</span>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'var(--line-strong)' }} />
          <figcaption style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}><span className="label">Width = coins sold per era</span><span className="label">Height = average price in HYPE</span></figcaption>
        </figure>
      </section>

      {/* ON THE CURVE */}
      <section id="curve" className="sec" style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div className="sec-head" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span className="label">0<span className="hide-m">4</span><span className="show-m-i">3</span> / On the curve</span><h2 className="sec-title">Coins on their steps right now.</h2></div>
        <CurveList limit={6} seeAllHref="/tokens" />
      </section>

      {/* GET HYPE */}
      <GetHype />

      {/* CREATORS — on mobile only the gradient card */}
      <section id="creators" className="sec creators">
        <div className="grain hide-m" style={{ position: 'relative', overflow: 'hidden', borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--line)', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 32, minHeight: 480 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <span className="label">06 / Creators</span>
            <h2 className="sec-title">Your coin pays you in HYPE.</h2>
            <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 480 }}>{pct(CREATOR_FEE)} of every trade, buy or sell, on the curve and after graduation, goes to the wallet you name at launch. The trade pays {pct(BASE_FEE)} in total; Meteora keeps {pct(PROTOCOL_FEE_SHARE)} of the fee.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, paddingTop: 24, borderTop: '1px solid var(--line)' }}>
            {[[pct(CREATOR_FEE), 'Creator, in HYPE'], [pct(BASE_FEE * PROTOCOL_FEE_SHARE), 'Protocol']].map(([v, k]) => (
              <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><span className="num" style={{ fontSize: 28, lineHeight: '32px' }}>{v.replace('%', '')}<span style={{ color: 'var(--era-4-text)' }}>%</span></span><span className="label">{k}</span></div>
            ))}
            <LaunchFeeStat />
          </div>
        </div>
        <div className="creators-cta grain">
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label on-art">Launch yours</span><span className="label on-art">Era 1 → 4</span></div>
          <svg viewBox="0 0 96 120" aria-hidden="true" shapeRendering="crispEdges"><QuadMarkPaths /></svg>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 16, flexWrap: 'wrap' }}>
            <p>Name it, add your first buy, press launch.</p>
            <a className="q-btn btn-ink" href="/launch">Launch coin <span className="num">→</span></a>
          </div>
        </div>
      </section>

      <footer id="docs" className="sec footer" style={{ padding: '96px 40px 40px', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ height: 1, background: 'var(--line)' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 32, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 360 }}>
            <span style={{ font: '800 22px/1 var(--font-sans)', letterSpacing: '-0.04em' }}>QUAD</span>
            <p style={{ margin: 0, font: '500 13px/20px var(--font-sans)', color: 'var(--text-muted)' }}><span className="hide-m">A launchpad on Solana. </span>Coins are quoted in HYPE on Solana (Wormhole NTT). QUAD is paired to HYPE; it is not affiliated with Hyperliquid.</p>
          </div>
          <nav className="hide-m" style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }} aria-label="Footer">
            {[
              ['Product', [['/launch', 'Launch'], ['/tokens', 'All tokens'], ['/creators#claim', 'Creator fees'], ['#get-hype', 'Get HYPE']]],
              ['Read', [['/docs', 'Docs'], ['/rules', 'The 4 rules'], ['/docs#config', 'Pool config']]],
              ['Follow', [['https://x.com', 'X'], ['https://github.com', 'GitHub']]],
            ].map(([title, links]) => (
              <div key={title as string} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span className="label">{title as string}</span>
                {(links as string[][]).map(([href, label]) => <a key={label} href={href} style={{ font: '600 14px/1 var(--font-sans)' }} {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>{label}</a>)}
              </div>
            ))}
          </nav>
          <nav className="show-m" style={{ gap: 20, flexWrap: 'wrap' }} aria-label="Footer">
            {[['/launch', 'Launch'], ['/tokens', 'All tokens'], ['/creators#claim', 'Creator fees'], ['/docs', 'Docs'], ['https://x.com', 'X']].map(([href, label]) => <a key={label} href={href} style={{ font: '600 14px/1 var(--font-sans)' }}>{label}</a>)}
          </nav>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}><span className="label">© 2026 QUAD<span className="show-m-i"> · Four eras · Priced in HYPE</span></span><span className="label hide-m">Four eras · Priced in HYPE</span></div>
      </footer>
    </main>
  );
}

/** The QUAD mark's shapes in white, sized by the parent svg (see components/Lockup.tsx for the source). */
function QuadMarkPaths() {
  return (
    <g fill="var(--on-era-1)">
      <rect x="24" y="0" width="48" height="24" /><rect x="0" y="24" width="24" height="48" /><rect x="72" y="24" width="24" height="36" />
      <polygon points="24,72 72,72 96,96 96,120 72,96 24,96" />
    </g>
  );
}
