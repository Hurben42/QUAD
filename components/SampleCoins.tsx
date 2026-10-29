import { DEFAULT_THRESHOLD_HYPE, TOTAL_COINS, buildQuadCurve, eraOf, price, priceAtProgress, BASE_DECIMALS } from '@/lib/curve';
import { TokenCard, type TokenCardSize, type TokenCardView } from './TokenCard';

// Sample coins, shown until the first real launch (or when the curve cannot be reached).
// Names and progress are made up; prices and caps follow the real curve at that progress.
const SAMPLES: [name: string, ticker: string, progress: number, sub: string, size: TokenCardSize][] = [
  ['Sunrise', 'SUN', 0.96, 'Launched 6 h ago', 'xl'],
  ['Voltcat', 'VOLT', 0.84, 'Launched 41 min ago', 'tall'],
  ['Hypedog', 'HDOG', 0.62, 'Launched 14 min ago', 'sm'],
  ['Coralreef', 'REEF', 0.71, 'Launched 3 h ago', 'sm'],
  ['Quadrant', 'QDRT', 0.41, 'Launched 2 h ago', 'wide'],
  ['Halfstep', 'HALF', 0.55, 'Launched 1 h ago', 'sm'],
  ['Pixelfund', 'PX', 0.18, 'Launched 9 min ago', 'sm'],
];
const QUOTE_DECIMALS = 8; // illustration unit only: prices per coin do not depend on it

const fmt = (x: number) => (x >= 1000 ? `${(x / 1000).toFixed(1)}K` : x >= 100 ? x.toFixed(0) : x.toFixed(1));

export function sampleCoins(): (TokenCardView & { size: TokenCardSize })[] {
  const curve = buildQuadCurve({ totalSupply: TOTAL_COINS * 10n ** BigInt(BASE_DECIMALS), migrationQuote: BigInt(DEFAULT_THRESHOLD_HYPE) * 10n ** BigInt(QUOTE_DECIMALS) });
  const scale = 10 ** (BASE_DECIMALS - QUOTE_DECIMALS);
  return SAMPLES.map(([name, ticker, progress, sub, size]) => {
    const p = priceAtProgress(curve, progress) * scale;
    return {
      name,
      ticker,
      era: eraOf(progress),
      progress,
      price: `${price(p)} HYPE`,
      raised: `${(progress * DEFAULT_THRESHOLD_HYPE).toFixed(1)} / ${DEFAULT_THRESHOLD_HYPE}`,
      cap: `${fmt(p * Number(TOTAL_COINS))} HYPE`,
      sub,
      sample: true,
      size,
    };
  });
}

/** The On the curve grid with sample coins, clearly marked as such. */
export function SampleCoins() {
  const coins = sampleCoins();
  return (
    <div className="tk-wrap">
      <p className="tk-note"><span className="label">Preview</span>Sample coins until the first launch. Prices follow the real curve; names and progress are made up.</p>
      {/* the last row sinks into the page: clipped halfway and faded into the body colour */}
      <div className="tk-ground">
        <div className="tk-grid">
          {coins.map((c) => <TokenCard key={c.ticker} c={c} size={c.size} />)}
        </div>
      </div>
    </div>
  );
}
