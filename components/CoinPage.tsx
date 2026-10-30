'use client';
import { useCallback, useEffect, useState } from 'react';
import { SiteHeader } from './SiteHeader';
import { LinkButton } from './Button';
import { EraSteps } from './EraSteps';
import { TokenCard } from './TokenCard';
import { CopyMint } from './CopyMint';
import { CoinAvatar } from './CoinAvatar';
import { tradeUrl } from '@/lib/dbc';
import { explorerAddress } from '@/lib/explorer';
import { BASE_FEE, CREATOR_FEE, TOTAL_COINS, coins, pct } from '@/lib/curve';
import { fetchCoinMetadata, fmt, hype, symbolOf, toTokenCard, type CoinMetadataJson, type PoolApi } from '@/lib/coin-view';
import { prettyLink, type LinkKind } from '@/lib/links';

const REFRESH_MS = 10_000;
/** Devnet only: test coins launched without links get sample ones, so the page shows the full layout. */
const SAMPLE_LINKS = process.env.NEXT_PUBLIC_CLUSTER === 'devnet';
const sampleLinks = (name: string) => {
  const s = name.toLowerCase().replace(/[^a-z0-9]/g, '') || 'quad';
  return { website: `https://${s}.xyz`, twitter: `https://x.com/${s}app`, telegram: `https://t.me/${s}app` };
};

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;
const short = (a: string) => `${a.slice(0, 4)}…${a.slice(-4)}`;
const when = (unix: number | null) => (unix ? new Date(unix * 1000).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : 'Just now');

/** One coin of the curve: its card, where it stands on the four eras, and what is written into its pool. */
export function CoinPage({ pool }: { pool: string }) {
  const [data, setData] = useState<PoolApi | null>(null);
  const [error, setError] = useState<{ status: number; message: string } | null>(null);
  const [meta, setMeta] = useState<CoinMetadataJson | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/pools/${pool}`, { cache: 'no-store' });
      const api = await res.json();
      if (!res.ok) throw Object.assign(new Error(api.error ?? res.statusText), { status: res.status });
      setData(api as PoolApi);
      setError(null);
    } catch (e) {
      setError({ status: (e as { status?: number }).status ?? 0, message: e instanceof Error ? e.message : String(e) });
    }
  }, [pool]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  const uri = data?.coin.uri ?? '';
  useEffect(() => {
    let live = true;
    fetchCoinMetadata(uri).then((m) => live && setMeta(m));
    return () => {
      live = false;
    };
  }, [uri]);

  if (!data) {
    const missing = error?.status === 404 || error?.status === 400;
    return (
      <main className="cr">
        <SiteHeader />
        <section className="cr-sec coin-missing">
          <div className="cr-head">
            <span className="label">Coin</span>
            <h2>{missing ? 'No QUAD coin at this address.' : error ? 'The curve is out of reach.' : 'Reading the curve…'}</h2>
            <p className="num" style={{ wordBreak: 'break-all' }}>{pool}</p>
            {error && !missing && <p>Retrying every {REFRESH_MS / 1000} s. {error.message}</p>}
          </div>
          <div className="cr-ctas"><LinkButton href="/#curve" variant="secondary">Back to the curve</LinkButton></div>
        </section>
      </main>
    );
  }

  const { coin } = data;
  const symbol = symbolOf(coin);
  const name = coin.name || symbol;
  const card = { ...toTokenCard(coin, data), href: tradeUrl(coin.baseMint) }; // the card keeps its initial; the photo sits by the name
  const raised = hype(coin.quoteRaised, data.quoteDecimals);
  const threshold = hype(coin.quoteThreshold, data.quoteDecimals);
  const complete = coin.progress >= 1;
  const state = coin.migrated ? 'graduated' : complete ? 'complete' : 'curve';
  const own = {
    website: meta?.extensions?.website ?? meta?.external_url,
    twitter: meta?.extensions?.twitter,
    telegram: meta?.extensions?.telegram,
  };
  const social = SAMPLE_LINKS && meta && !own.website && !own.twitter && !own.telegram ? sampleLinks(name) : own;
  const links = (['website', 'twitter', 'telegram'] as LinkKind[])
    .map((kind) => [kind, social[kind]] as const)
    .filter((l): l is readonly [LinkKind, string] => typeof l[1] === 'string' && /^https?:\/\//.test(l[1]));

  return (
    <main className="cr">
      <div className="cr-sky coin-glow" style={{ ['--era' as string]: `var(--era-${coin.era})` }} aria-hidden="true" />
      <SiteHeader className="rise" style={d(0)} />

      <section className="cr-hero coin-hero">
        <div className="cr-copy">
          <span className="label rise" style={d(1)}>
            Coin · ${symbol} · {coin.migrated ? <span className="coin-status">Graduated</span> : <span className={`q-era q-era--${coin.era}`}>Era {coin.era}</span>}
          </span>
          <div className="coin-id rise" style={d(2)}>
            <div className="coin-id-photo">{meta?.image ? <img src={meta.image} alt="" /> : <CoinAvatar name={name} era={coin.era} />}</div>
            <div className="coin-id-text">
              <h1 className="coin-name">{name}</h1>
              <p className="cr-lede">{meta?.description || `${name} trades against HYPE on the four-era curve. ${pct(CREATOR_FEE)} of every trade goes to its creator, in HYPE.`}</p>
              {links.length > 0 && (
                <ul className="coin-links">
                  {links.map(([kind, href]) => <li key={kind}><a className="num" href={href} target="_blank" rel="noopener">{prettyLink(kind, href)} <span aria-hidden="true">↗</span></a></li>)}
                </ul>
              )}
            </div>
          </div>
          <div className="cr-ctas rise" style={d(4)}>
            <LinkButton href={tradeUrl(coin.baseMint)} target="_blank" rel="noopener">Trade on Jupiter <span className="num">↗</span></LinkButton>
            <LinkButton variant="secondary" href={explorerAddress(coin.baseMint)} target="_blank" rel="noopener">Explorer <span className="num">↗</span></LinkButton>
          </div>
          <div className="coin-ca rise" style={d(5)}><CopyMint address={coin.baseMint} label="contract address" /></div>
          <dl className="cr-stats rise" style={d(6)}>
            <div><dt className="label">Price</dt><dd className="num">{card.price.replace(/ HYPE$/, '')}<small>HYPE</small></dd></div>
            <div><dt className="label">Raised</dt><dd className="num">{fmt(raised)}<small>HYPE</small></dd></div>
            <div><dt className="label">Mkt cap</dt><dd className="num">{card.cap.replace(/ HYPE$/, '')}<small>HYPE</small></dd></div>
          </dl>
        </div>
        <div className="cr-card-stage coin-stage rise" style={d(3)}>
          <div className="cr-card coin-card-wide"><TokenCard c={card} size="wide" /></div>
        </div>
      </section>

      <section className="cr-sec" id="curve">
        <div className="cr-head">
          <span className="label">01 / The curve</span>
          <h2>{state === 'graduated' ? 'Graduated.' : state === 'complete' ? 'Curve complete.' : `Era ${coin.era} of 4.`}</h2>
          <p>
            {state === 'graduated' && <>The curve raised its <span className="num">{fmt(threshold)} HYPE</span>. {name} now trades on a Meteora pool with its liquidity locked, and its creator keeps earning {pct(CREATOR_FEE)} of every trade.</>}
            {state === 'complete' && <>The threshold of <span className="num">{fmt(threshold)} HYPE</span> is reached. The move to the Meteora pool is pending.</>}
            {state === 'curve' && <>Each era sells half as many coins as the last for the same HYPE. <span className="num">{fmt(Math.max(0, threshold - raised))} HYPE</span> to go.</>}
          </p>
        </div>
        <div className="coin-curve">
          <EraSteps progress={coin.progress} height={140} />
          <div className="coin-curve-meta">
            <span className="num num-lg">{Math.round(coin.progress * 100)}%</span>
            <span className="label">To graduation</span>
            <span className="num">{fmt(raised)} / {fmt(threshold)} HYPE</span>
          </div>
        </div>
      </section>

      <section className="cr-sec" id="onchain">
        <div className="cr-head"><span className="label">02 / On-chain</span><h2>Written into the pool.</h2></div>
        <dl className="doc-kv coin-kv">
          <div><dt>Mint</dt><dd className="num"><a href={explorerAddress(coin.baseMint)} target="_blank" rel="noopener">{coin.baseMint}</a></dd></div>
          <div><dt>Pool</dt><dd className="num"><a href={explorerAddress(coin.pool)} target="_blank" rel="noopener">{coin.pool}</a></dd></div>
          <div><dt>Creator</dt><dd className="num"><a href={explorerAddress(coin.creator)} target="_blank" rel="noopener">{coin.creator}</a> <span className="hide-m">· earns {pct(CREATOR_FEE)} of every trade, in HYPE</span></dd></div>
          <div><dt>Launched</dt><dd className="num">{when(coin.createdAt)}</dd></div>
          <div><dt>Supply</dt><dd className="num">{coins(TOTAL_COINS)} · minted once · no mint or freeze authority</dd></div>
          <div><dt>Fee per trade</dt><dd className="num">{pct(BASE_FEE)} · {pct(CREATOR_FEE)} to the creator</dd></div>
          <div><dt>Graduation</dt><dd className="num">{fmt(threshold)} HYPE raised</dd></div>
          {coin.dammPool && <div><dt>Meteora pool</dt><dd className="num"><a href={explorerAddress(coin.dammPool)} target="_blank" rel="noopener">{coin.dammPool}</a></dd></div>}
          {coin.uri && <div><dt>Metadata</dt><dd className="num"><a href={coin.uri} target="_blank" rel="noopener">{short(coin.uri.replace(/^https?:\/\//, ''))}</a></dd></div>}
        </dl>
      </section>

      <footer className="container doc-foot">
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
        <a className="label" href="/#curve">All coins on the curve →</a>
      </footer>
    </main>
  );
}
