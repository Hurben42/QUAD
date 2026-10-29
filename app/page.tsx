import { Lockup, QuadMark } from '@/components/Lockup';
import { LinkButton } from '@/components/Button';
import { EraSteps } from '@/components/EraSteps';
import { CurveList } from '@/components/CurveList';
import { WalletButton } from '@/components/WalletButton';
import { LaunchForm } from '@/components/LaunchForm';

/** The landing, section by section, after design/website/landing-desktop.html. */
function Rays({ h = 840 }: { h?: number }) {
  return (
    <svg className="rays" aria-hidden="true" viewBox={`0 0 1400 ${h}`} preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}>
      {[-200, 0, 200, 400, 600, 800, 1000, 1200, 1400, 1600].map((x) => <line key={x} x1="700" y1={h} x2={x} y2="0" />)}
      {[0.86, 0.71, 0.57].map((f) => <line key={f} x1="0" y1={h * f} x2="1400" y2={h * f} />)}
    </svg>
  );
}

export default function Page() {
  return (
    <main>
      {/* HERO — full bleed, the nav sits on it */}
      <section className="grain" style={{ position: 'relative', overflow: 'hidden', background: 'var(--surface-0)', minHeight: 840 }}>
        <div className="horizon" aria-hidden="true" />
        <Rays />
        <header className="container" style={{ position: 'relative', zIndex: 1, padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <Lockup size="sm" />
          <nav style={{ display: 'flex', gap: 4 }} aria-label="Primary">
            {[['#launch', 'Launch'], ['#curve', 'On the curve'], ['#rules', 'The four rules'], ['#creators', 'Creators'], ['/docs', 'Docs']].map(([href, label]) => (
              <a key={href} href={href} style={{ font: '700 14px/1 var(--font-sans)', color: 'var(--text-muted)', padding: '10px 12px', borderRadius: 'var(--radius-sm)' }}>{label}</a>
            ))}
          </nav>
          <div style={{ display: 'flex', gap: 12 }}>
            <LinkButton variant="secondary" href="https://jup.ag" target="_blank" rel="noopener" style={{ height: 40 }}>Get HYPE</LinkButton>
            <WalletButton style={{ height: 40 }} />
          </div>
        </header>
        <div className="container" style={{ position: 'relative', padding: '48px 56px 72px', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 48, alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28, paddingTop: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span className="label">01 / Launchpad · Solana</span><span className="label">Quoted in HYPE</span></div>
            <h1 style={{ margin: 0, font: '800 88px/0.95 var(--font-sans)', letterSpacing: '-0.035em', maxWidth: 620 }}>Four eras.<br />Priced in HYPE.</h1>
            <p style={{ margin: 0, font: '500 18px/28px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 520 }}>21,000,000 coins, minted once. Traded against HYPE on a curve that climbs in four eras: each era sells half as many coins as the last, for the same HYPE. The creator earns 2.5% of every trade, in HYPE.</p>
            <div style={{ display: 'flex', gap: 12 }}><LinkButton href="#launch">Launch coin <span className="num">→</span></LinkButton><LinkButton variant="secondary" href="#rules">See the eras</LinkButton></div>
            <dl style={{ margin: '24px 0 0', display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24, maxWidth: 520 }}>
              {[['Fee per trade', '3.125%'], ['To creator', '2.5% HYPE'], ['Supply', '21M']].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><dt className="label">{k}</dt><dd className="num" style={{ margin: 0, fontSize: 24, lineHeight: '28px' }}>{v}</dd></div>
              ))}
            </dl>
          </div>
          <div style={{ justifySelf: 'end', width: '100%', maxWidth: 520 }}><LaunchForm /></div>
        </div>
      </section>

      {/* THE FOUR RULES — three poster blocks (see design/website for the exact markup) */}
      <section id="rules" className="container" style={{ padding: '96px 40px 0', display: 'flex', flexDirection: 'column', gap: 40 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span className="label">02 / The four rules</span><h2 style={{ margin: 0, font: '800 48px/1 var(--font-sans)', letterSpacing: '-0.03em' }}>Written into the pool at launch.<br />Nobody edits them after.</h2></div>
          <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 400 }}>Every coin starts with the same four. They live in a Meteora pool config and the bonding curve enforces them trade by trade.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 24 }}>
          {/* TODO: port posters A (stripes), B (horizon + white card), C (pixels + stats) from design/website/landing-desktop.html */}
          <article className="card-light" style={{ minHeight: 560, padding: 28, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 16 }}><h3 style={{ margin: 0, font: '800 44px/1 var(--font-sans)', letterSpacing: '-0.03em' }}>Mint once.<br />Quote in HYPE.</h3></article>
          <article className="grain" style={{ minHeight: 560, borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}><h3 style={{ margin: 0, font: '800 22px/1.15 var(--font-sans)' }}>Every era costs twice.</h3></article>
          <article className="grain" style={{ minHeight: 560, borderRadius: 'var(--radius-lg)', border: '1px solid var(--line)', padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}><h3 style={{ margin: 0, font: '800 36px/1.05 var(--font-sans)', letterSpacing: '-0.03em' }}>Creators earn HYPE,<br />on every trade.</h3></article>
        </div>
      </section>

      {/* THE HALVING STEPS */}
      <section className="container" style={{ padding: '96px 40px 0', display: 'grid', gridTemplateColumns: 'minmax(0, 5fr) minmax(0, 7fr)', gap: 48, alignItems: 'end' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <span className="label">03 / The halving steps</span>
          <h2 style={{ margin: 0, font: '800 48px/1 var(--font-sans)', letterSpacing: '-0.03em' }}>Half the coins.<br />Twice the price.</h2>
          <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 440 }}>Of the coins on the curve, era 1 sells 8/15, era 2 sells 4/15, era 3 sells 2/15 and era 4 sells 1/15. Each era raises the same HYPE, so the average price doubles at every step.</p>
        </div>
        <EraSteps progress={1} height={360} />
      </section>

      {/* ON THE CURVE */}
      <section id="curve" className="container" style={{ padding: '96px 40px 0', display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><span className="label">04 / On the curve</span><h2 style={{ margin: 0, font: '800 48px/1 var(--font-sans)', letterSpacing: '-0.03em' }}>Coins on their steps right now.</h2></div>
        <CurveList />
      </section>

      {/* CREATORS */}
      <section id="creators" className="container" style={{ padding: '96px 40px 0', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 24 }}>
        <div className="grain" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--surface-1)', border: '1px solid var(--line)', padding: 40, display: 'flex', flexDirection: 'column', gap: 20, minHeight: 480 }}>
          <span className="label">05 / Creators</span>
          <h2 style={{ margin: 0, font: '800 48px/1 var(--font-sans)', letterSpacing: '-0.03em' }}>Your coin pays you in HYPE.</h2>
          <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 480 }}>2.5% of every trade, buy or sell, on the curve and after graduation, goes to the wallet you name at launch.</p>
        </div>
        <div className="grain" style={{ borderRadius: 'var(--radius-lg)', background: 'var(--brand-vertical)', padding: 40, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 480 }}>
          <span className="label" style={{ color: '#fff' }}>Launch yours</span>
          <div style={{ alignSelf: 'center' }}><QuadMark height={240} fill="white" /></div>
          <LinkButton href="#launch" style={{ background: '#0b0d18', color: '#fff', alignSelf: 'flex-start' }}>Launch coin <span className="num">→</span></LinkButton>
        </div>
      </section>

      <footer className="container" style={{ padding: '96px 40px 40px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ height: 1, background: 'var(--line)' }} />
        <p style={{ margin: 0, font: '500 13px/20px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 480 }}>A launchpad on Solana. Coins are quoted in HYPE on Solana (Wormhole NTT). QUAD is paired to HYPE; it is not affiliated with Hyperliquid.</p>
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
      </footer>
    </main>
  );
}
