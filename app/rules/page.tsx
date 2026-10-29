import { SiteHeader } from '@/components/SiteHeader';
import { Stripes } from '@/components/Stripes';
import { Reveal } from '@/components/Reveal';
import { QuadCoins } from '@/components/QuadCoins';
import { MARK_PATH } from '@/components/CreatorsArt';
import { PIXELS } from '@/components/RulePosters';
import { LinkButton } from '@/components/Button';
import {
  ANTI_SNIPER_FEE,
  BASE_DECIMALS,
  BASE_FEE,
  CREATOR_FEE,
  DEFAULT_THRESHOLD_HYPE,
  ERA_WIDTHS,
  PROTOCOL_FEE_SHARE,
  TOTAL_COINS,
  coins,
  exampleCurve,
  pct,
  price,
} from '@/lib/curve';

export const metadata = { title: 'The 4 rules — QUAD', description: 'Four rules written into every QUAD pool at launch: mint once, quote in HYPE, four eras, creators earn HYPE.' };

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;
const era = (i: number) => ({ ['--era' as string]: `var(--era-${i})`, ['--era-t' as string]: `var(--era-${i}-text)` }) as React.CSSProperties;
const n = (x: number) => Math.round(x).toLocaleString('en-US');

const RULES = [
  ['mint', 'Mint once'],
  ['quote', 'Quote in HYPE'],
  ['eras', 'Four eras'],
  ['fees', 'Creators earn HYPE'],
] as const;

// Rays to the hero's vanishing point (viewBox 1400×900) and to the eras stage's (440×340)
const RAYS = [-200, 100, 400, 700, 1000, 1300, 1600];
const STAGE_RAYS = [-100, 40, 150, 290, 400, 540];
// Sample pairs floating round the HYPE mark in rule 02 (illustration): [ticker, left, top]
const PAIRS: [string, string, string][] = [['$SDOG', '8%', '22%'], ['$VOLT', '64%', '17%'], ['$SUN', '10%', '62%'], ['$PX', '68%', '58%']];

/** The four rules, one chapter each, after the landing's posters A, B and C. */
export default function RulesPage() {
  const ex = exampleCurve();
  const protocolFee = BASE_FEE * PROTOCOL_FEE_SHARE;

  return (
    <main className="rp">
      <div className="rp-sky grain" aria-hidden="true">
        <div className="rp-glow"><Stripes /></div>
        <svg className="rp-rays" viewBox="0 0 1400 900" preserveAspectRatio="none">
          {RAYS.map((x, i) => <line key={x} x1="700" y1="900" x2={x} y2="0" pathLength={1} style={d(i)} />)}
          {[790, 680].map((y, i) => <line key={y} x1="0" y1={y} x2="1400" y2={y} pathLength={1} style={d(RAYS.length + i)} />)}
        </svg>
      </div>

      <SiteHeader className="rise" style={d(0)} />

      <header className="rp-hero">
        <span className="label rise" style={d(1)}>The 4 rules</span>
        <h1 className="rise" style={d(2)}>Written into the pool at launch.<br />Nobody edits them after.</h1>
        <p className="rise" style={d(3)}>Every coin starts with the same four. They live in one Meteora pool config and the bonding curve enforces them trade by trade, for the creator and for QUAD alike.</p>
        <nav className="rp-index rise" style={d(4)} aria-label="The 4 rules">
          {RULES.map(([id, label], i) => (
            <a key={id} href={`#${id}`} style={era(i + 1)}>
              <span className="num">0{i + 1}</span>
              <span>{label}</span>
            </a>
          ))}
        </nav>
      </header>

      {/* 01 MINT ONCE: the stripes become a supply counter */}
      <Reveal id="mint" className="rp-ch">
        <div className="rp-visual rp-mint">
          <Stripes />
          <div className="rp-mint-fade" />
          <QuadCoins />
          <div className="rp-visual-tags"><span className="label on-art">Rule 01</span><span className="label on-art">Supply</span></div>
          <div className="rp-mint-count">
            <span className="num">{coins(TOTAL_COINS)}</span>
            <span className="label">coins · minted in one transaction</span>
          </div>
        </div>
        <div className="rp-text" style={era(1)}>
          <span className="label rp-kicker">01 / Supply</span>
          <h2>Mint once.</h2>
          <p>{coins(TOTAL_COINS)} coins per launch, like HYPE&apos;s own supply. They all exist from the first transaction: the mint authority is revoked in the same transaction and the coin never gets a freeze authority. Nobody can print more, nobody can freeze a wallet.</p>
          <dl className="rp-spec">
            <div><dt>Supply</dt><dd className="num">{coins(TOTAL_COINS)} · {BASE_DECIMALS} decimals</dd></div>
            <div><dt>Mint authority</dt><dd className="num">Revoked at launch</dd></div>
            <div><dt>Freeze authority</dt><dd className="num">None, ever</dd></div>
            <div><dt>Metadata</dt><dd className="num">Immutable</dd></div>
          </dl>
        </div>
      </Reveal>

      {/* 02 QUOTE IN HYPE: price, fees and liquidity converge on HYPE */}
      <Reveal id="quote" className="rp-ch rp-ch--flip">
        <div className="rp-visual rp-quote grain">
          <svg className="rp-quote-burst" viewBox="0 0 600 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return <line key={i} x1={300 + 70 * Math.cos(a)} y1={250 + 70 * Math.sin(a)} x2={300 + 700 * Math.cos(a)} y2={250 + 700 * Math.sin(a)} />;
            })}
            <circle cx="300" cy="250" r="120" /><circle cx="300" cy="250" r="190" />
          </svg>
          <div className="rp-visual-tags"><span className="label on-art">Rule 02</span><span className="label on-art">Quote</span></div>
          <div className="rp-quote-mark" aria-hidden="true">
            <svg viewBox="-20 -20 240 240">
              <path d={MARK_PATH} fill="var(--on-era-1)" stroke="var(--on-era-1)" strokeWidth="24" strokeLinejoin="round" />
              <image href="/brand/hyperliquid-blob-green.svg" x="0" y="0" width="200" height="200" />
            </svg>
          </div>
          {PAIRS.map(([pair, x, y], i) => <span key={pair} className="rp-pair num" style={{ left: x, top: y, ...d(i) }}>{pair}<i>/HYPE</i></span>)}
          <div className="rp-marquee" aria-hidden="true">
            <div>{Array.from({ length: 2 }, (_, k) => <span key={k}>PRICE IN HYPE <b>•</b> FEES IN HYPE <b>•</b> LIQUIDITY IN HYPE <b>•</b> PRICE IN HYPE <b>•</b> FEES IN HYPE <b>•</b> LIQUIDITY IN HYPE <b>•</b> </span>)}</div>
          </div>
        </div>
        <div className="rp-text" style={era(2)}>
          <span className="label rp-kicker">02 / Quote</span>
          <h2>Quote in HYPE.</h2>
          <p>Every price on the curve is a HYPE price, every fee is paid in HYPE and the liquidity at graduation is HYPE. A coin&apos;s success is measured in the asset its community already holds.</p>
          <dl className="rp-spec">
            <div><dt>Quote token</dt><dd className="num">HYPE on Solana (Wormhole NTT)</dd></div>
            <div><dt>Fees collected in</dt><dd className="num">HYPE only</dd></div>
            <div><dt>Decimals, token program</dt><dd className="num">Read on-chain</dd></div>
          </dl>
          <p className="rp-aside">QUAD is paired to HYPE; it is not affiliated with Hyperliquid.</p>
        </div>
      </Reveal>

      {/* 03 FOUR ERAS: the horizon stage, the steps big, a cursor walking them */}
      <Reveal id="eras" className="rp-ch">
        <div className="rp-visual rp-eras grain">
          <div className="rp-eras-sun" aria-hidden="true" />
          <svg className="rp-eras-rays" viewBox="0 0 440 340" preserveAspectRatio="none" aria-hidden="true">
            {STAGE_RAYS.map((x) => <line key={x} x1="220" y1="340" x2={x} y2="0" />)}
            {[250, 160].map((y) => <line key={y} x1="0" y1={y} x2="440" y2={y} />)}
          </svg>
          <div className="rp-visual-tags"><span className="label">Rule 03</span><span className="label">Eras</span></div>
          <div className="rp-steps" aria-hidden="true">
            {ERA_WIDTHS.map((w, i) => (
              <div key={i} style={{ flex: w, height: `${100 / 2 ** (3 - i)}%`, background: `var(--era-${i + 1})`, color: `var(--on-era-${i + 1})` }}>
                <span className="num">{2 ** i}×</span>
              </div>
            ))}
            <i className="rp-cursor" />
          </div>
        </div>
        <div className="rp-text" style={era(3)}>
          <span className="label rp-kicker">03 / Eras</span>
          <h2>Every era costs twice.</h2>
          <p>Four eras on every coin. Each one sells half as many coins as the last for the same HYPE, so each era costs twice as much. Inside an era the price climbs smoothly, no jumps. At {DEFAULT_THRESHOLD_HYPE} HYPE:</p>
          <div className="doc-table-wrap">
            <table className="doc-table">
              <thead><tr><th>Era</th><th>Coins</th><th>HYPE</th><th>Avg price</th></tr></thead>
              <tbody>
                {ex.eras.map((e, i) => (
                  <tr key={i}><td><i style={{ background: `var(--era-${i + 1})` }} />Era {i + 1}</td><td className="num">{n(e.coins)}</td><td className="num">{e.hype.toFixed(2)}</td><td className="num">{price(e.avg)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="rp-aside">Then it graduates: {n(ex.migrationCoins)} coins and the HYPE raised move into a Meteora pool, liquidity locked for good.</p>
        </div>
      </Reveal>

      {/* 04 CREATORS EARN HYPE: pixels, live badge, the number big */}
      <Reveal id="fees" className="rp-ch rp-ch--flip">
        <div className="rp-visual rp-fees grain">
          <div className="rp-fees-sun" aria-hidden="true" />
          <div className="rp-visual-tags"><span className="label">Rule 04</span><span className="label">Fees</span></div>
          <div className="px rp-px" aria-hidden="true">
            {PIXELS.map((v, i) => <b key={i} className={v === 1 ? 'wash-white' : undefined} style={{ ...(v > 1 ? { background: `var(--era-${v})` } : {}), ...d(i) }} />)}
          </div>
          <div className="rp-fees-body">
            <span className="rp-live"><i />Curve live</span>
            <span className="num rp-fees-big">{pct(CREATOR_FEE)}</span>
            <span className="label">of every trade · to the creator · in HYPE</span>
          </div>
        </div>
        <div className="rp-text" style={era(4)}>
          <span className="label rp-kicker">04 / Fees</span>
          <h2>Creators earn HYPE, on every trade.</h2>
          <p>Every buy and every sell on the curve pays {pct(BASE_FEE)}. {pct(CREATOR_FEE)} of the trade goes to the wallet that launched the coin, in HYPE, claimable any time. Right after a launch the fee starts at {pct(ANTI_SNIPER_FEE)} and decays in seconds, so bots pay; the creator&apos;s own first buy does not.</p>
          <dl className="rp-spec">
            <div><dt>Per trade</dt><dd className="num">{pct(BASE_FEE)}</dd></div>
            <div><dt>To the creator</dt><dd className="num">{pct(CREATOR_FEE)}</dd></div>
            <div><dt>To Meteora</dt><dd className="num">{pct(protocolFee)}</dd></div>
            <div><dt>Mint · Freeze</dt><dd className="num">0 / 0</dd></div>
          </dl>
          <p><a className="rp-link" href="/creators">How creators get paid →</a></p>
        </div>
      </Reveal>

      <Reveal className="rp-end">
        <span className="label">Four rules, one config</span>
        <h2>Launch with these four.</h2>
        <div className="rp-end-ctas">
          <LinkButton href="/launch">Launch a coin <span className="num">→</span></LinkButton>
          <LinkButton variant="secondary" href="/docs#config">Read the config</LinkButton>
        </div>
      </Reveal>

      <footer className="container doc-foot">
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
        <span className="label">Paired to HYPE · not affiliated with Hyperliquid</span>
      </footer>
    </main>
  );
}
