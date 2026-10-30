import type { Metadata } from 'next';
import { CoinPage } from '@/components/CoinPage';
import { loadPools } from '@/lib/pools-cache';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ pool: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { pool } = await params;
  try {
    const coin = (await loadPools()).coins.find((c) => c.pool === pool);
    if (coin) {
      const symbol = coin.symbol || coin.baseMint.slice(0, 4).toUpperCase();
      return { title: `${coin.name || symbol} ($${symbol}) — QUAD`, description: `${coin.name || symbol} on the QUAD curve, quoted in HYPE: era ${coin.era}, ${Math.round(coin.progress * 100)}% to graduation.` };
    }
  } catch {
    // the page reports the error itself
  }
  return { title: 'Coin — QUAD' };
}

export default async function Page({ params }: Props) {
  const { pool } = await params;
  return <CoinPage pool={pool} />;
}
