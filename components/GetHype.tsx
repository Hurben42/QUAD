import { HYPE_MINT } from '@/lib/hype';
import { CopyMint } from './CopyMint';
import { JupiterMark } from './JupiterMark';

const JUPITER_SWAP = `https://jup.ag/swap/SOL-${HYPE_MINT.toBase58()}`;
const HYPE_ON_SOLANA = 'https://tokens.solana.com/hyperliquid';

/** Landing block: every coin trades against HYPE, here is how to get some on Solana. */
export function GetHype() {
  return (
    <section id="get-hype" className="sec gh">
      <div className="gh-intro">
        <span className="label">05 / Get HYPE</span>
        <h2 className="sec-title">Every coin trades against HYPE.<br />Get some first.</h2>
        <p>HYPE on Solana is the Hyperliquid token bridged through Wormhole NTT. Swap for it in one click, or bring it over from Hyperliquid.</p>
        <CopyMint address={HYPE_MINT.toBase58()} label="HYPE mint on Solana" />
      </div>
      <div className="gh-ways">
        <a className="gh-way" href={JUPITER_SWAP} target="_blank" rel="noopener" style={{ ['--era' as string]: 'var(--era-1)' }}>
          <span className="gh-way-icon"><JupiterMark size={30} /></span>
          <span className="label">Fastest</span>
          <span className="gh-way-title">Swap on Jupiter</span>
          <span className="gh-way-text">From SOL, USDC or any Solana token, routed for the best price.</span>
          <span className="gh-way-go num">jup.ag ↗</span>
        </a>
        <a className="gh-way" href={HYPE_ON_SOLANA} target="_blank" rel="noopener" style={{ ['--era' as string]: 'var(--era-2)' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span className="gh-way-icon"><img src="/brand/hyperliquid-blob-green.svg" alt="" width={30} height={30} /></span>
          <span className="label">Already on Hyperliquid</span>
          <span className="gh-way-title">Bridge your HYPE</span>
          <span className="gh-way-text">Move HYPE from Hyperliquid to Solana through Wormhole NTT, same token on both sides.</span>
          <span className="gh-way-go num">tokens.solana.com ↗</span>
        </a>
      </div>
    </section>
  );
}
