import { HYPE_MINT } from '@/lib/hype';
import { CopyMint } from './CopyMint';
import { JupiterMark } from './JupiterMark';
import { MARK_PATH } from './CreatorsArt';

const JUPITER_SWAP = `https://jup.ag/swap/SOL-${HYPE_MINT.toBase58()}`;
const HYPE_ON_SOLANA = 'https://tokens.solana.com/hyperliquid';
// Rays to the sun at the bottom centre of the poster (viewBox 1200×560)
const RAYS = [-300, 0, 260, 480, 600, 720, 940, 1200, 1500];

/**
 * Landing block, as a QUAD poster: HYPE rises over the era horizon with its contract address
 * as a tag; the two ways to get it run along the foot of the poster.
 */
export function GetHype() {
  return (
    <section id="get-hype" className="sec">
      <div className="gh grain">
        <div className="gh-sky" aria-hidden="true">
          <div className="gh-sun" />
          <svg className="gh-rays" viewBox="0 0 1200 560" preserveAspectRatio="none">
            {RAYS.map((x) => <line key={x} x1="600" y1="560" x2={x} y2="0" />)}
            {[470, 390, 330].map((y) => <line key={y} x1="0" y1={y} x2="1200" y2={y} />)}
          </svg>
        </div>

        <div className="gh-top">
          <div className="gh-head">
            <span className="label">05 / Get HYPE</span>
            <h2>Every coin trades<br />against HYPE.</h2>
          </div>
          <span className="label gh-tag">Quoted in HYPE · on Solana</span>
        </div>

        <div className="gh-center">
          <div className="gh-mark" aria-hidden="true">
            <svg viewBox="-20 -20 240 240">
              <path d={MARK_PATH} fill="var(--on-era-1)" stroke="var(--on-era-1)" strokeWidth="24" strokeLinejoin="round" />
              <image href="/brand/hyperliquid-blob-green.svg" x="0" y="0" width="200" height="200" />
            </svg>
          </div>
          <CopyMint address={HYPE_MINT.toBase58()} label="HYPE mint on Solana" />
        </div>

        <div className="gh-routes">
          <a className="gh-route" href={JUPITER_SWAP} target="_blank" rel="noopener">
            <span className="gh-route-icon"><JupiterMark size={24} /></span>
            <span className="gh-route-body">
              <span className="label">A · Fastest</span>
              <span className="gh-route-title">Swap on Jupiter</span>
              <span className="gh-route-text">From SOL, USDC or any Solana token.</span>
            </span>
            <span className="gh-route-go" aria-hidden="true">↗</span>
          </a>
          <a className="gh-route" href={HYPE_ON_SOLANA} target="_blank" rel="noopener">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <span className="gh-route-icon"><img src="/brand/hyperliquid-blob-green.svg" alt="" width={24} height={24} /></span>
            <span className="gh-route-body">
              <span className="label">B · From Hyperliquid</span>
              <span className="gh-route-title">Bridge your HYPE</span>
              <span className="gh-route-text">Through Wormhole NTT, same token on both sides.</span>
            </span>
            <span className="gh-route-go" aria-hidden="true">↗</span>
          </a>
        </div>
      </div>
    </section>
  );
}
