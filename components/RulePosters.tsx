import { STRIPES, STRIPES_M, Stripes } from './Stripes';
import { BASE_FEE, CREATOR_FEE, DEFAULT_THRESHOLD_HYPE, TOTAL_COINS, coins, pct } from '@/lib/curve';

/**
 * "The four rules": posters A (stripes), B (horizon + white card), C (pixels + stats),
 * after design/website/landing-desktop.html and landing-mobile.html.
 */

// 5×5 pixel mark of poster C: 0 empty, 1 white wash, 2–4 era colour
const PIXELS = [1, 0, 4, 0, 0, 0, 3, 4, 1, 0, 1, 3, 1, 2, 0, 0, 0, 2, 1, 4, 0, 1, 0, 0, 1];

// The sample coin drawn in poster B: an illustration, not live data
const SAMPLE_PROGRESS = 0.62;

export function RulePosters() {
  const sampleRaised = (SAMPLE_PROGRESS * DEFAULT_THRESHOLD_HYPE).toFixed(1);
  return (
    <div className="rules-grid">
      {/* Poster A: stripes */}
      <article className="poster poster-a" data-theme="light" style={{ background: 'var(--surface-0)', color: 'var(--text)' }}>
        <Stripes set={STRIPES} className="hide-m" />
        <Stripes set={STRIPES_M} className="show-m" />
        <div aria-hidden="true" style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 30%, var(--surface-0) 72%)' }} />
        <div className="poster-tags"><span className="label on-art">Rule 1 · 2</span><span className="label on-art">Supply · Quote</span></div>
        <div className="poster-body">
          <h3>Mint once.<br />Quote in HYPE.</h3>
          <p style={{ margin: 0, font: '500 14px/20px var(--font-sans)', color: 'var(--text-muted)' }}>
            {coins(TOTAL_COINS)} coins exist from the first transaction. Every price on the curve is a HYPE price.
          </p>
          <span className="label hide-m">Fixed supply · HYPE on Solana</span>
        </div>
      </article>

      {/* Poster B: horizon + white card */}
      <article className="poster poster-dark poster-b grain">
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 0, height: '60%', background: 'var(--era-horizon)' }} />
        <svg className="rays hide-m" aria-hidden="true" viewBox="0 0 440 340" preserveAspectRatio="none" style={{ position: 'absolute', left: 0, top: 0, width: '100%', height: '60%', opacity: 0.6 }}>
          {[-100, 40, 150, 290, 400, 540].map((x) => <line key={x} x1="220" y1="340" x2={x} y2="0" />)}
          {[250, 160].map((y) => <line key={y} x1="0" y1={y} x2="440" y2={y} />)}
        </svg>
        <div className="poster-tags"><span className="label">Rule 3</span><span className="label">Eras</span></div>
        <div className="poster-card" data-theme="light" style={{ background: 'var(--surface-1)', color: 'var(--text)' }}>
          <h3>Every era costs twice.</h3>
          <p style={{ margin: 0, font: '500 13px/18px var(--font-sans)', color: 'var(--text-muted)' }}>
            Four eras on every coin. Each one sells half as many coins as the last for the same HYPE<span className="hide-m">, so each era costs twice as much. The curve climbs smoothly, no jumps</span>.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 12, borderRadius: 'var(--radius-sm)', background: 'var(--surface-0)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={{ font: '700 13px/18px var(--font-sans)' }}>Hypedog · $HDOG</span><span className="q-era q-era--2">Era 2</span></div>
            <div className="track" role="progressbar" aria-valuenow={SAMPLE_PROGRESS * 100} aria-valuemin={0} aria-valuemax={100} aria-label="Distance to graduation">
              <span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" />
              <div className="fill" style={{ width: `${SAMPLE_PROGRESS * 100}%`, ['--w' as string]: '360px' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span className="num" style={{ fontSize: 12 }}>{sampleRaised} / {DEFAULT_THRESHOLD_HYPE} HYPE</span>
              <span className="label">{SAMPLE_PROGRESS * 100}%<span className="hide-m"> to graduation</span></span>
            </div>
          </div>
        </div>
      </article>

      {/* Poster C: pixels + stats */}
      <article className="poster poster-dark poster-c grain">
        <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '45%', background: 'var(--era-horizon)', opacity: 0.55 }} />
        <div className="poster-tags"><span className="label">Rule 4</span><span className="label">Fees</span></div>
        <div className="px hide-m" aria-hidden="true" style={{ position: 'absolute', top: 72, right: 24 }}>
          {PIXELS.map((v, i) => <b key={i} className={v === 1 ? 'wash-white' : undefined} style={v > 1 ? { background: `var(--era-${v})` } : undefined} />)}
        </div>
        <div className="poster-body">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', height: 28, padding: '0 12px', borderRadius: 'var(--radius-pill)', font: '600 12px/1 var(--font-mono)', background: 'var(--surface-2)', border: '1px solid var(--line)', color: 'var(--text-muted)' }}>
            <i style={{ width: 8, height: 8, borderRadius: 'var(--radius-pill)', background: 'var(--success)' }} />Curve live
          </span>
          <h3>Creators earn HYPE,<br className="hide-m" /> on every trade.</h3>
          <div className="poster-stats">
            <div><span className="num">{pct(CREATOR_FEE)}</span><span className="label"><span className="hide-m">To creator</span><span className="show-m">Creator</span></span></div>
            <div><span className="num">{pct(BASE_FEE)}</span><span className="label">Per trade</span></div>
            <div><span className="num">0 / 0</span><span className="label">Mint · Freeze</span></div>
          </div>
        </div>
      </article>
    </div>
  );
}
