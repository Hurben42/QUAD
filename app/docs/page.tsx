import { DYNAMIC_BONDING_CURVE_PROGRAM_ID } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { SiteHeader } from '@/components/SiteHeader';
import { Stripes } from '@/components/Stripes';
import { DocToc } from '@/components/DocToc';
import {
  ANTI_SNIPER_FEE,
  ANTI_SNIPER_PERIODS,
  BASE_DECIMALS,
  BASE_FEE,
  CREATOR_FEE,
  CREATOR_TRADING_FEE_PERCENTAGE,
  DEFAULT_THRESHOLD_HYPE,
  ERA_WIDTHS,
  PROTOCOL_FEE_SHARE,
  RENT_ESTIMATE_SOL,
  TOTAL_COINS,
  buildQuadCurve,
  coins,
  pct,
  price,
} from '@/lib/curve';
import { DBC_CONFIG, QUOTE_MINT } from '@/lib/dbc';
import { HYPE_MINT } from '@/lib/hype';

export const metadata = { title: 'Docs — QUAD', description: 'How QUAD works: the four rules, the four-era curve, fees, launching and claiming, and the pool config.' };

/** The sections, in order; DocToc reads the same list. */
const SECTIONS = [
  ['overview', 'Overview'],
  ['rules', 'The four rules'],
  ['curve', 'The curve'],
  ['fees', 'Fees'],
  ['launch', 'Launching a coin'],
  ['creators', 'Creator fees'],
  ['config', 'Pool config'],
  ['risks', 'Risks'],
  ['faq', 'FAQ'],
] as const;

// Worked numbers at the default threshold. Coin and HYPE amounts do not depend on HYPE's decimals
// (read on-chain in the app); 8 is only the unit used for this illustration.
const EXAMPLE_QUOTE_DECIMALS = 8;
const SLOT_SECONDS = 0.4;

function example() {
  const qd = EXAMPLE_QUOTE_DECIMALS;
  const curve = buildQuadCurve({ totalSupply: TOTAL_COINS * 10n ** BigInt(BASE_DECIMALS), migrationQuote: BigInt(DEFAULT_THRESHOLD_HYPE) * 10n ** BigInt(qd) });
  const scale = 10 ** (BASE_DECIMALS - qd);
  const toCoins = (b: bigint) => Number(b) / 10 ** BASE_DECIMALS;
  const s = (x: bigint) => Number(x) / 2 ** 64;
  const startPrice = s(curve.sqrtStartPrice) ** 2 * scale;
  const endPrice = s(curve.points[3].sqrtPrice) ** 2 * scale;
  return {
    eras: curve.eras.map((e) => ({ coins: toCoins(e.base), hype: Number(e.quote) / 10 ** qd, avg: e.avgPrice * scale })),
    curveCoins: toCoins(curve.curveBase),
    migrationCoins: toCoins(curve.migrationBase),
    startPrice,
    endPrice,
    graduationCap: endPrice * Number(TOTAL_COINS),
  };
}

const n = (x: number) => Math.round(x).toLocaleString('en-US');
/** A rule card's era colour and era text colour. */
const era = (i: number) => ({ ['--era' as string]: `var(--era-${i})`, ['--era-t' as string]: `var(--era-${i}-text)` }) as React.CSSProperties;
const share = (x: number) => pct(x / Number(TOTAL_COINS));

export default function DocsPage() {
  const ex = example();
  const protocolFee = BASE_FEE * PROTOCOL_FEE_SHARE;
  const platformFee = BASE_FEE - protocolFee - CREATOR_FEE;
  const config = process.env.NEXT_PUBLIC_DBC_CONFIG ? DBC_CONFIG.toBase58() : null;

  return (
    <main className="doc">
      <div className="doc-sky grain" aria-hidden="true"><div className="doc-glow"><Stripes /></div></div>
      <SiteHeader />

      <header className="doc-hero">
        <span className="label">Docs</span>
        <h1>How QUAD works.</h1>
        <p>Every coin launched on QUAD follows the same four rules, written into one Meteora pool config. This page explains them, with the numbers the app actually uses.</p>
      </header>

      <div className="doc-grid">
        <DocToc sections={SECTIONS} />

        <article className="doc-body">
          <section id="overview">
            <h2><span className="label">01</span>Overview</h2>
            <p>QUAD is a launchpad on Solana. You name a coin, sign one transaction, and it starts trading against HYPE on a bonding curve. The curve climbs in four eras; when it has raised its threshold in HYPE, the coin graduates to a Meteora pool with its liquidity locked for good.</p>
            <p>There is no custom on-chain program. Each coin is a pool of Meteora&apos;s Dynamic Bonding Curve, created from the QUAD config; the config fixes the rules at launch and nobody can edit them after, QUAD included.</p>
            <p className="doc-note">QUAD is paired to HYPE, the Hyperliquid token bridged to Solana through Wormhole NTT. QUAD is not affiliated with Hyperliquid.</p>
          </section>

          <section id="rules">
            <h2><span className="label">02</span>The four rules</h2>
            <ol className="doc-rules">
              <li className="doc-rule" style={era(1)}>
                <div className="doc-rule-top"><span className="label">Rule 01 · Supply</span><span className="num doc-rule-stat">{coins(TOTAL_COINS, true)}</span></div>
                <h3>Mint once</h3>
                <p>{coins(TOTAL_COINS)} coins per launch, like HYPE&apos;s own supply. Minted in the launch transaction, mint authority revoked in the same transaction, never a freeze authority.</p>
                <div className="doc-rule-viz">
                  <div className="viz-bar"><i style={{ width: '100%' }} /></div>
                  <div className="viz-legend"><span className="label">100% at launch</span><span className="label">No mint · No freeze</span></div>
                </div>
              </li>
              <li className="doc-rule" style={era(2)}>
                <div className="doc-rule-top"><span className="label">Rule 02 · Quote</span><span className="num doc-rule-stat">HYPE</span></div>
                <h3>Quote in HYPE</h3>
                <p>Every price on the curve is a HYPE price and every fee is paid in HYPE. HYPE&apos;s decimals and token program are read on-chain, never assumed.</p>
                <div className="doc-rule-viz viz-chips">
                  {['Price', 'Fees', 'Liquidity'].map((k) => <span key={k} className="viz-chip"><span className="label">{k}</span><span className="num">HYPE</span></span>)}
                </div>
              </li>
              <li className="doc-rule" style={era(3)}>
                <div className="doc-rule-top"><span className="label">Rule 03 · Eras</span><span className="num doc-rule-stat">2×</span></div>
                <h3>Four eras</h3>
                <p>Each era sells half as many coins as the last, for the same HYPE. The average price doubles from one era to the next.</p>
                <div className="doc-rule-viz">
                  <div className="viz-steps" aria-hidden="true">
                    {ERA_WIDTHS.map((w, i) => <i key={i} style={{ flex: w, height: `${100 / 2 ** (3 - i)}%`, background: `var(--era-${i + 1})` }} />)}
                  </div>
                  <div className="viz-legend"><span className="label">Width = coins</span><span className="label">Height = price</span></div>
                </div>
              </li>
              <li className="doc-rule" style={era(4)}>
                <div className="doc-rule-top"><span className="label">Rule 04 · Fees</span><span className="num doc-rule-stat">{pct(CREATOR_FEE)}</span></div>
                <h3>Creators earn HYPE</h3>
                <p>{pct(CREATOR_FEE)} of every trade on the curve goes to the wallet that launched the coin, in HYPE.</p>
                <div className="doc-rule-viz">
                  <div className="viz-split" aria-hidden="true"><i style={{ flex: CREATOR_FEE / BASE_FEE, background: 'var(--era-4)' }} /><i style={{ flex: protocolFee / BASE_FEE, background: 'var(--line-strong)' }} /></div>
                  <div className="viz-legend"><span className="label">Creator {pct(CREATOR_FEE)}</span><span className="label">Meteora {pct(protocolFee)}</span></div>
                </div>
              </li>
            </ol>
          </section>

          <section id="curve">
            <h2><span className="label">03</span>The curve</h2>
            <p>The curve is four constant-product segments joined end to end. Each one raises a quarter of the threshold; the square-root price grows by √2 per era, so the price doubles. Of the coins sold on the curve, era 1 sells {ERA_WIDTHS[0]}/15, era 2 {ERA_WIDTHS[1]}/15, era 3 {ERA_WIDTHS[2]}/15 and era 4 {ERA_WIDTHS[3]}/15.</p>
            <p>At the default threshold of {DEFAULT_THRESHOLD_HYPE} HYPE:</p>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead><tr><th>Era</th><th>Coins sold</th><th>Share of supply</th><th>HYPE raised</th><th>Average price</th></tr></thead>
                <tbody>
                  {ex.eras.map((e, i) => (
                    <tr key={i}>
                      <td><i style={{ background: `var(--era-${i + 1})` }} />Era {i + 1}</td>
                      <td className="num">{n(e.coins)}</td>
                      <td className="num">{share(e.coins)}</td>
                      <td className="num">{e.hype.toFixed(2)}</td>
                      <td className="num">{price(e.avg)}</td>
                    </tr>
                  ))}
                  <tr className="doc-total"><td>Curve</td><td className="num">{n(ex.curveCoins)}</td><td className="num">{share(ex.curveCoins)}</td><td className="num">{DEFAULT_THRESHOLD_HYPE.toFixed(2)}</td><td className="num">{price(ex.startPrice)} → {price(ex.endPrice)}</td></tr>
                </tbody>
              </table>
            </div>
            <h3>Graduation</h3>
            <p>When the curve has raised the threshold, it stops. The HYPE raised and {n(ex.migrationCoins)} coins ({share(ex.migrationCoins)} of the supply) move into a Meteora DAMM v2 pool at the era 4 price, so the coin keeps trading where the curve left it. Market cap at graduation: about {n(ex.graduationCap)} HYPE, whatever the supply.</p>
            <p>The curve and the migration use the whole supply: the rounding leaves at most a few coins of dust. The pool&apos;s liquidity is locked permanently, half on the creator&apos;s side and half on QUAD&apos;s.</p>
          </section>

          <section id="fees">
            <h2><span className="label">04</span>Fees</h2>
            <div className="doc-table-wrap">
              <table className="doc-table">
                <thead><tr><th>On every trade on the curve</th><th>Share</th></tr></thead>
                <tbody>
                  <tr><td>Total fee, paid in HYPE</td><td className="num">{pct(BASE_FEE)}</td></tr>
                  <tr><td>To the creator</td><td className="num">{pct(CREATOR_FEE)}</td></tr>
                  <tr><td>To Meteora ({pct(PROTOCOL_FEE_SHARE)} of the fee)</td><td className="num">{pct(protocolFee)}</td></tr>
                  <tr><td>To QUAD</td><td className="num">{pct(platformFee)}</td></tr>
                </tbody>
              </table>
            </div>
            <h3>Anti-sniper fee</h3>
            <p>Right after a launch, the fee starts at {pct(ANTI_SNIPER_FEE)} and decays exponentially to the base fee over {ANTI_SNIPER_PERIODS} slots, about {Math.round(ANTI_SNIPER_PERIODS * SLOT_SECONDS)} seconds. Bots that buy in the first blocks pay most of their buy in fees.</p>
            <p>The creator&apos;s first buy, inside the launch transaction, is exempt: it pays the base {pct(BASE_FEE)}.</p>
            <h3>After graduation</h3>
            <p>The DAMM v2 pool charges its own fee of 2% per trade. The creator owns half of the locked liquidity and claims that half of the pool&apos;s fees from Meteora.</p>
            <h3>Launch cost</h3>
            <p>About {RENT_ESTIMATE_SOL} SOL of rent for the new accounts, plus the config&apos;s launch fee, shown in the launch form (read on-chain).</p>
          </section>

          <section id="launch">
            <h2><span className="label">05</span>Launching a coin</h2>
            <ol className="doc-steps">
              <li><h3>Identity</h3><p>Name (up to 32 bytes), ticker (up to 10 letters or digits) and an optional description. They are stored on Irys and written into the token metadata, which is immutable: nobody can rename the coin after.</p></li>
              <li><h3>Curve</h3><p>Nothing to choose: every coin runs on the same four-era curve and graduates at the same threshold.</p></li>
              <li><h3>First buy</h3><p>Optional. It goes in the launch transaction, so nobody can trade before you, at the base fee.</p></li>
              <li><h3>Review and sign</h3><p>One wallet signature creates the mint, the pool and your first buy. The wallet that signs is the creator: it receives the fees.</p></li>
            </ol>
            <p><a className="q-btn q-btn--primary" href="/launch">Launch a coin <span className="num">→</span></a></p>
          </section>

          <section id="creators">
            <h2><span className="label">06</span>Creator fees</h2>
            <p>Fees accrue in the pool, in HYPE, and wait for you. On the <a href="/creator">Creator fees</a> page, connect the wallet you launched with: each of your coins shows its unclaimed HYPE and a Claim button. Claim as often as you like; each claim is one transaction.</p>
            <p>Once the curve is complete, the HYPE raised above the threshold by the last trade is surplus. The creator can withdraw its share once, from the same page.</p>
          </section>

          <section id="config">
            <h2><span className="label">07</span>Pool config</h2>
            <p>Everything above lives in one Meteora DBC config. Anyone can read it on-chain and check it against this page.</p>
            <dl className="doc-kv">
              <div><dt>DBC program</dt><dd className="num">{DYNAMIC_BONDING_CURVE_PROGRAM_ID.toBase58()}</dd></div>
              <div><dt>QUAD config</dt><dd className="num">{config ?? 'Not published yet'}</dd></div>
              <div><dt>Quote mint</dt><dd className="num">{QUOTE_MINT.toBase58()}{QUOTE_MINT.equals(HYPE_MINT) ? ' (HYPE)' : ' (test mint)'}</dd></div>
              <div><dt>Supply</dt><dd className="num">{coins(TOTAL_COINS)} · {BASE_DECIMALS} decimals</dd></div>
              <div><dt>Threshold</dt><dd className="num">{DEFAULT_THRESHOLD_HYPE} HYPE</dd></div>
              <div><dt>Fees</dt><dd className="num">{pct(BASE_FEE)} base · {pct(ANTI_SNIPER_FEE)} start · {ANTI_SNIPER_PERIODS} slots · creator share {CREATOR_TRADING_FEE_PERCENTAGE}%</dd></div>
              <div><dt>Collected in</dt><dd className="num">Quote only (HYPE)</dd></div>
              <div><dt>Migration</dt><dd className="num">DAMM v2 · 2% pool fee · LP 100% locked</dd></div>
              <div><dt>Metadata</dt><dd className="num">Immutable · first swap at minimum fee</dd></div>
            </dl>
          </section>

          <section id="risks">
            <h2><span className="label">08</span>Risks</h2>
            <ul className="doc-list">
              <li>Coins on a bonding curve are volatile and most never graduate. You can lose all the HYPE you put in.</li>
              <li>QUAD never holds your keys or your funds: every action is a transaction you sign. Check what your wallet shows before signing.</li>
              <li>Anyone can launch a coin with any name. A name or a ticker proves nothing about who is behind it.</li>
              <li>Nothing on QUAD is investment advice.</li>
            </ul>
          </section>

          <section id="faq">
            <h2><span className="label">09</span>FAQ</h2>
            <details className="doc-faq"><summary>Why HYPE and not SOL?</summary><p>QUAD coins are paired to HYPE: prices, liquidity and creator fees are all in HYPE, so a coin&apos;s success is measured in the asset its community already holds.</p></details>
            <details className="doc-faq"><summary>Where do I get HYPE on Solana?</summary><p>Swap for it on Jupiter (the Get HYPE button), or bridge it from Hyperliquid through Wormhole NTT.</p></details>
            <details className="doc-faq"><summary>Can I change my coin after launch?</summary><p>No. The name, ticker and description are immutable, the supply is fixed and the rules come from the config.</p></details>
            <details className="doc-faq"><summary>Where do I trade a coin?</summary><p>Jupiter routes to QUAD pools on the curve and after graduation; every coin links to it.</p></details>
            <details className="doc-faq"><summary>Is QUAD part of Hyperliquid?</summary><p>No. QUAD is paired to HYPE; it is not affiliated with Hyperliquid.</p></details>
          </section>
        </article>
      </div>

      <footer className="container doc-foot">
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
        <span className="label">Paired to HYPE · not affiliated with Hyperliquid</span>
      </footer>
    </main>
  );
}
