'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CoinAvatar } from './CoinAvatar';
import { LinkButton } from './Button';
import { QUOTE_MINT } from '@/lib/dbc';
import { trackPosition } from '@/lib/curve';
import { fetchCoinMetadata, fmt, hype, symbolOf, toTokenCard, type ApiCoin, type PoolsApi } from '@/lib/coin-view';
import { isAmount, toUnits } from '@/lib/useLaunch';
import { useQuickBuy, type QuickBuyStatus } from '@/lib/useQuickBuy';
import { tokenBalance } from '@/lib/wallet-balance';
import { explorerTx } from '@/lib/explorer';
import { useConnection } from '@solana/wallet-adapter-react';

const REFRESH_MS = 4_000;
const PRESETS = ['0.5', '1', '5'];
const SLIPPAGES = [100, 200, 500];

type Era = 1 | 2 | 3 | 4;
type Column = { key: string; title: string; hint: string; era: Era | null; match: (c: ApiCoin) => boolean; order: (a: ApiCoin, b: ApiCoin) => number };

const born = (c: ApiCoin) => c.createdAt ?? Number.MAX_SAFE_INTEGER; // unknown age: just launched
const newest = (a: ApiCoin, b: ApiCoin) => born(b) - born(a);
const closest = (a: ApiCoin, b: ApiCoin) => b.progress - a.progress;
const onEra = (e: Era) => (c: ApiCoin) => !c.migrated && c.era === e;

/** One column per step of the curve, then the graduated ones. Era 1 shows the newest first. */
const COLUMNS: Column[] = [
  { key: '1', title: 'Era 1', hint: 'New', era: 1, match: onEra(1), order: newest },
  { key: '2', title: 'Era 2', hint: 'Climbing', era: 2, match: onEra(2), order: closest },
  { key: '3', title: 'Era 3', hint: 'Halfway up', era: 3, match: onEra(3), order: closest },
  { key: '4', title: 'Era 4', hint: 'About to graduate', era: 4, match: onEra(4), order: closest },
  { key: 'g', title: 'Graduated', hint: 'On Meteora', era: null, match: (c) => c.migrated, order: newest },
];

type Flash = { dir: 'up' | 'down' | 'new'; n: number };

const age = (unix: number | null, now: number) => {
  if (!unix) return null;
  const s = Math.max(0, now / 1000 - unix);
  return s < 60 ? `${Math.floor(s)}s` : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/** Images from each coin's metadata JSON, fetched once per URI for the whole board. */
const images = new Map<string, Promise<string | null>>();
function useCoinImage(uri: string) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    if (!uri) return;
    if (!images.has(uri)) images.set(uri, fetchCoinMetadata(uri).then((m) => m?.image ?? null));
    let live = true;
    images.get(uri)!.then((s) => live && setSrc(s));
    return () => {
      live = false;
    };
  }, [uri]);
  return src;
}

/**
 * The live board, after the Rings terminal: every coin of the curve in one column per era,
 * refreshed every few seconds. Rows flash when their raise moves, new launches slide in, and a
 * coin on the curve buys in one click for the amount set in the toolbar.
 */
export function LiveBoard() {
  const { connection } = useConnection();
  const [api, setApi] = useState<PoolsApi | null>(null);
  const [ok, setOk] = useState(true);
  const [updated, setUpdated] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [query, setQuery] = useState('');
  const [amount, setAmount] = useState('1');
  const [slippage, setSlippage] = useState(200);
  const [mobileCol, setMobileCol] = useState('1');
  const [flashes, setFlashes] = useState<Record<string, Flash>>({});
  const [balance, setBalance] = useState<bigint | null>(null);
  const seen = useRef<Map<string, string> | null>(null);
  const tick = useRef(0);

  const loading = useRef(false);
  const load = useCallback(async () => {
    if (loading.current) return; // a slow RPC must not stack reads
    loading.current = true;
    try {
      const res = await fetch('/api/pools', { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      const next = body as PoolsApi;
      // flash what moved since the last read; the first read only sets the baseline
      const prev = seen.current;
      if (prev) {
        const moved: Record<string, Flash> = {};
        for (const c of next.coins) {
          const before = prev.get(c.pool);
          const n = ++tick.current;
          if (before === undefined) moved[c.pool] = { dir: 'new', n };
          else if (BigInt(c.quoteRaised) > BigInt(before)) moved[c.pool] = { dir: 'up', n };
          else if (BigInt(c.quoteRaised) < BigInt(before)) moved[c.pool] = { dir: 'down', n };
        }
        if (Object.keys(moved).length) setFlashes((f) => ({ ...f, ...moved }));
      }
      seen.current = new Map(next.coins.map((c) => [c.pool, c.quoteRaised]));
      setApi(next);
      setOk(true);
      setUpdated(Date.now());
    } catch {
      setOk(false);
    } finally {
      loading.current = false;
    }
  }, []);

  const quick = useQuickBuy(load);
  const owner = quick.owner;
  const refreshBalance = useCallback(() => {
    if (!owner) return setBalance(null);
    tokenBalance(connection, QUOTE_MINT, owner).then(setBalance, () => undefined);
  }, [connection, owner]);

  useEffect(() => {
    load();
    const t = setInterval(load, REFRESH_MS);
    const c = setInterval(() => setNow(Date.now()), 1000);
    window.addEventListener('quad:launched', load);
    return () => {
      clearInterval(t);
      clearInterval(c);
      window.removeEventListener('quad:launched', load);
    };
  }, [load]);
  useEffect(refreshBalance, [refreshBalance]);
  useEffect(() => {
    if (quick.status?.phase === 'done') refreshBalance();
  }, [quick.status, refreshBalance]);

  const q = query.trim().toLowerCase();
  const coins = useMemo(() => (api?.coins ?? []).filter((c) => !q || c.name.toLowerCase().includes(q) || c.symbol.toLowerCase().includes(q) || c.baseMint.toLowerCase() === q || c.pool.toLowerCase() === q), [api, q]);
  const decimals = api?.quoteDecimals ?? 9;
  const amountIn = isAmount(amount) && Number(amount) > 0 ? toUnits(amount, decimals) : 0n;
  const over = balance !== null && amountIn > balance;
  const since = updated ? Math.max(0, Math.round((now - updated) / 1000)) : null;

  return (
    <div className="bd">
      <div className="bd-bar">
        <span className={`bd-live ${ok ? '' : 'is-off'}`} role="status">
          <span className="bd-dot" aria-hidden="true" />
          {ok ? 'Live' : 'Reconnecting'}
          <span className="num">{since === null ? '…' : since < 2 ? 'just now' : `${since}s ago`}</span>
        </span>
        <input className="bd-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ticker or mint" aria-label="Search tokens" />
        <div className="bd-quick">
          <span className="label">Quick buy</span>
          <div className="bd-amount">
            <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} aria-label="Quick buy amount in HYPE" aria-invalid={!isAmount(amount) || over} autoComplete="off" />
            <span className="num">HYPE</span>
          </div>
          <div className="wz-chips">
            {PRESETS.map((v) => <button key={v} type="button" className={amount === v ? 'on' : ''} onClick={() => setAmount(v)}>{v}</button>)}
          </div>
          <label className="bd-slip">
            <span className="label">Slip</span>
            <span className="bd-select">
              <select value={slippage} onChange={(e) => setSlippage(Number(e.target.value))}>
                {SLIPPAGES.map((b) => <option key={b} value={b}>{b / 100}%</option>)}
              </select>
            </span>
          </label>
          {balance !== null && <span className={`num bd-bal ${over ? 'is-over' : ''}`}>{fmt(Number(balance) / 10 ** decimals)} HYPE</span>}
        </div>
      </div>

      {api && api.coins.length > 0 && <Highlighted coins={api.coins} api={api} flashes={flashes} />}

      <div className="bd-pick show-m" role="tablist" aria-label="Columns">
        {COLUMNS.map((col) => (
          <button key={col.key} type="button" role="tab" className="era-tab" aria-selected={mobileCol === col.key} onClick={() => setMobileCol(col.key)} style={col.era ? { ['--era' as string]: `var(--era-${col.era})`, ['--on' as string]: `var(--on-era-${col.era})` } : undefined}>
            {col.title} <span className="num">{coins.filter(col.match).length}</span>
          </button>
        ))}
      </div>

      <div className="bd-cols">
        {COLUMNS.map((col) => {
          const list = coins.filter(col.match).sort(col.order);
          return (
            <section key={col.key} className={`bd-col ${mobileCol === col.key ? 'is-picked' : ''}`} aria-label={col.title} style={{ ['--era' as string]: col.era ? `var(--era-${col.era})` : 'var(--success)' }}>
              <header className="bd-col-head">
                <span className="bd-col-title">{col.title}<span className="num">{list.length}</span></span>
                <span className="bd-col-hint">{col.hint}</span>
              </header>
              <div className="bd-list">
                {!api ? (
                  <p className="bd-empty">Reading the curve…</p>
                ) : list.length === 0 ? (
                  <p className="bd-empty">{q ? 'No match.' : col.era ? `No token in era ${col.era} right now.` : 'No token has graduated yet.'}</p>
                ) : (
                  list.map((c) => <BoardCard key={c.pool} c={c} api={api} now={now} flash={flashes[c.pool]} status={quick.status?.pool === c.pool ? quick.status : null} buyLabel={amountIn > 0n ? `${amount} HYPE` : '—'} disabled={amountIn === 0n || over} onBuy={() => quick.buy(c.pool, symbolOf(c), amountIn, slippage)} connected={quick.connected} />)
                )}
              </div>
            </section>
          );
        })}
      </div>

      {api && api.coins.length === 0 && (
        <div className="bd-none">
          <p>No token on the curve yet.</p>
          <LinkButton href="/launch">Launch the first one <span className="num">→</span></LinkButton>
        </div>
      )}

      {quick.status && <BuyToast s={quick.status} onClose={quick.clear} />}
    </div>
  );
}

function BoardCard({ c, api, now, flash, status, buyLabel, disabled, onBuy, connected }: { c: ApiCoin; api: PoolsApi; now: number; flash?: Flash; status: QuickBuyStatus | null; buyLabel: string; disabled: boolean; onBuy: () => void; connected: boolean }) {
  const view = toTokenCard(c, api);
  const image = useCoinImage(c.uri);
  const pos = trackPosition(c.progress);
  const busy = status?.phase === 'sign' || status?.phase === 'confirm';
  return (
    <article className="bd-card" style={{ ['--era' as string]: `var(--era-${c.era})` }}>
      {flash && <span key={flash.n} className={`bd-flash bd-flash--${flash.dir}`} aria-hidden="true" />}
      <a className="bd-main" href={view.href}>
        <span className="bd-photo">{image ? <img src={image} alt="" loading="lazy" /> : <CoinAvatar name={view.name} era={c.era} />}</span>
        <span className="bd-id">
          <span className="bd-name">{view.name}</span>
          <span className="bd-meta">
            <span className="num">${view.ticker}</span>
            {c.createdAt && <span className="num">{age(c.createdAt, now)}</span>}
            {c.anonymous && <span className="anon-badge" title="Launched anonymously: no creator wallet">Anon</span>}
          </span>
        </span>
        <span className="bd-cap">
          <span className="num"><span className="bd-k">MC</span> {view.cap.replace(/ HYPE$/, '')}</span>
          <Change x={c.change} />
        </span>
      </a>
      {connected && !c.migrated && (
        <button type="button" className="bd-buy" onClick={onBuy} disabled={busy || disabled} aria-label={`Buy $${view.ticker} for ${buyLabel}`}>
          {busy ? (status?.phase === 'sign' ? 'Sign…' : '…') : <><span aria-hidden="true">⚡</span>{buyLabel.replace(/ HYPE$/, '')}</>}
        </button>
      )}
      <div className="bd-progress">
        <span className="track" aria-hidden="true">
          <span className="s1" /><span className="s2" /><span className="s3" /><span className="s4" />
          <span className="fill" style={{ width: `${pos * 100}%`, ['--p' as string]: Math.max(pos, 0.001) }} />
        </span>
        <span className="num">{fmt(hype(c.quoteRaised, api.quoteDecimals))}/{fmt(hype(c.quoteThreshold, api.quoteDecimals))} · {Math.round(c.progress * 100)}%</span>
      </div>
    </article>
  );
}

const HIGHLIGHTED = 12;

/** Signed percent, green up and red down; nothing without a baseline. */
function Change({ x }: { x?: number | null }) {
  if (x === null || x === undefined || !Number.isFinite(x)) return null;
  const p = x * 100;
  const text = Math.abs(p) >= 1000 ? `${(p / 1000).toFixed(1)}K%` : `${p.toFixed(1)}%`;
  return <span className={`num bd-chg ${p > 0.05 ? 'is-up' : p < -0.05 ? 'is-down' : ''}`} title="Price change over 24 h">{p > 0.05 ? '+' : ''}{text}</span>;
}

/**
 * The strip above the columns, after the Rings terminal: the biggest coins by market cap,
 * each with its 24 h change. A chip flashes green on a buy and red on a sell, like the cards.
 */
function Highlighted({ coins, api, flashes }: { coins: ApiCoin[]; api: PoolsApi; flashes: Record<string, Flash> }) {
  const top = [...coins].sort((a, b) => b.spotPrice - a.spotPrice).slice(0, HIGHLIGHTED);
  return (
    <div className="bd-hl" aria-label="Highlighted">
      <span className="bd-hl-label"><span aria-hidden="true">☆</span> Highlighted</span>
      <div className="bd-hl-list">
        {top.map((c) => {
          const view = toTokenCard(c, api);
          const f = flashes[c.pool];
          return (
            <a key={c.pool} className="bd-chip" href={view.href} style={{ ['--era' as string]: `var(--era-${c.era})` }}>
              {f && f.dir !== 'new' && <span key={f.n} className={`bd-flash bd-flash--${f.dir}`} aria-hidden="true" />}
              <ChipPhoto c={c} name={view.name} />
              <span className="bd-chip-sym">${view.ticker}</span>
              <span className="num bd-chip-cap">{view.cap.replace(/ HYPE$/, '')}</span>
              <Change x={c.change} />
            </a>
          );
        })}
      </div>
    </div>
  );
}

function ChipPhoto({ c, name }: { c: ApiCoin; name: string }) {
  const image = useCoinImage(c.uri);
  return <span className="bd-chip-photo">{image ? <img src={image} alt="" loading="lazy" /> : <CoinAvatar name={name} era={c.era} />}</span>;
}

function BuyToast({ s, onClose }: { s: QuickBuyStatus; onClose: () => void }) {
  useEffect(() => {
    if (s.phase !== 'done') return;
    const t = setTimeout(onClose, 8000);
    return () => clearTimeout(t);
  }, [s, onClose]);
  return (
    <div className={`bd-toast is-${s.phase}`} role={s.phase === 'error' ? 'alert' : 'status'}>
      <span>
        {s.phase === 'sign' && <>Sign the ${s.symbol} buy in your wallet…</>}
        {s.phase === 'confirm' && <>Confirming the ${s.symbol} buy…</>}
        {s.phase === 'done' && <>Bought ${s.symbol} · <a href={explorerTx(s.sig)} target="_blank" rel="noopener" className="num">{short(s.sig)} ↗</a></>}
        {s.phase === 'error' && <>${s.symbol}: {s.message}</>}
      </span>
      {(s.phase === 'done' || s.phase === 'error') && <button type="button" onClick={onClose} aria-label="Dismiss">×</button>}
    </div>
  );
}
