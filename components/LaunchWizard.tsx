'use client';
import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  ANTI_SNIPER_FEE,
  BASE_DECIMALS,
  BASE_FEE,
  CREATOR_FEE,
  RENT_ESTIMATE_SOL,
  TOTAL_COINS,
  baseOutForQuote,
  buildQuadCurve,
  coins,
  pct,
  price,
} from '@/lib/curve';
import { useQuadConfig, type QuadConfigView } from '@/lib/useQuadConfig';
import { useQuoteBalance } from '@/lib/useQuoteBalance';
import { explorerTx, fromUnits, isAmount, toUnits, tradeUrl, useLaunch, type LaunchPhase } from '@/lib/useLaunch';
import { Button, LinkButton } from './Button';
import { imageToDataUrl } from '@/lib/image';
import { normalizeLink, type LinkKind } from '@/lib/links';
import { EraSteps } from './EraSteps';

/** The four steps of a launch are the four eras: each one takes the coin a step further. */
const STEPS = ['Identity', 'Curve', 'First buy', 'Review'] as const;
const NAME_MAX = 32;
const TICKER_MAX = 10;
const DESCRIPTION_MAX = 280;
const BUY_PRESETS = ['1', '5', '10'];
const PHASES: [LaunchPhase, string, string][] = [
  ['upload', 'Upload metadata', 'Name, ticker, description, image and links, stored on Irys.'],
  ['sign', 'Sign in your wallet', 'One signature: the pool, the mint and your first buy.'],
  ['confirm', 'Confirm on Solana', 'The coin exists once the transaction lands.'],
];

type Draft = { name: string; ticker: string; description: string; firstBuy: string; image: string; imageName: string; website: string; twitter: string; telegram: string };
const EMPTY: Draft = { name: '', ticker: '', description: '', firstBuy: '', image: '', imageName: '', website: '', twitter: '', telegram: '' };
const LINKS: [LinkKind, string, string][] = [
  ['website', 'Website', 'hypedog.xyz'],
  ['twitter', 'X', '@hypedog'],
  ['telegram', 'Telegram', 't.me/hypedog'],
];

const initials = (d: Draft) => (d.name.trim().split(/\s+/).map((w) => w[0]).join('') || d.ticker).replace(/[^A-Za-z0-9]/g, '').slice(0, 2).toUpperCase() || 'Q';
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const fmt = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : x.toFixed(x < 1 ? 4 : 1));

/** Prices and amounts of the curve this config builds, for the preview, the curve step and the first buy. */
function useCurveView(config: QuadConfigView | null, firstBuy: string) {
  return useMemo(() => {
    if (!config) return null;
    const curve = buildQuadCurve({ totalSupply: TOTAL_COINS * 10n ** BigInt(BASE_DECIMALS), migrationQuote: config.threshold });
    const qd = config.quoteDecimals;
    const scale = 10 ** (BASE_DECIMALS - qd);
    const s0 = Number(curve.sqrtStartPrice) / 2 ** 64;
    const buy = isAmount(firstBuy) ? Number(firstBuy || 0) : 0;
    const net = buy > 0 ? BigInt(Math.floor(buy * (1 - BASE_FEE) * 10 ** qd)) : 0n;
    const out = net > 0n ? Number(baseOutForQuote(curve.sqrtStartPrice, curve.points, net)) / 10 ** BASE_DECIMALS : 0;
    return {
      threshold: fromUnits(config.threshold, qd),
      startPrice: s0 * s0 * scale,
      eras: curve.eras.map((e) => ({ coins: Number(e.base) / 10 ** BASE_DECIMALS, hype: fromUnits(e.quote, qd), price: e.avgPrice * scale })),
      migrationCoins: Number(curve.migrationBase) / 10 ** BASE_DECIMALS,
      buy,
      buyFee: buy * BASE_FEE,
      buyCoins: out,
      progress: Math.min(1, Number(net) / Number(config.threshold)),
      launchFee: Number(config.poolCreationFee) / 1e9,
    };
  }, [config, firstBuy]);
}

/** The /launch flow: four era-steps, then the launch itself, then the live coin. Reports its step to tint the sky. */
export function LaunchWizard({ onSun }: { onSun?: (level: number) => void }) {
  const { publicKey } = useWallet();
  const { setVisible } = useWalletModal();
  const { config, error: configError } = useQuadConfig();
  const balance = useQuoteBalance(config);
  const { launch, phase, result, reset } = useLaunch();
  const [step, setStep] = useState(0);
  const [visited, setVisited] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [imageError, setImageError] = useState<string | null>(null);
  const view = useCurveView(config, draft.firstBuy);

  const stage = phase || (result && !result.ok) ? 'launching' : result?.ok ? 'done' : 'edit';
  useEffect(() => onSun?.(stage === 'done' ? 5 : stage === 'launching' ? 4.5 : step + 1), [onSun, stage, step]);

  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const v = k === 'ticker' ? e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : e.target.value;
    setDraft((d) => ({ ...d, [k]: v }));
  };

  async function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const image = await imageToDataUrl(file);
      setDraft((d) => ({ ...d, image, imageName: file.name }));
      setImageError(null);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : String(err));
    }
  }
  const linkErrors = LINKS.map(([kind]) => {
    try {
      normalizeLink(kind, draft[kind]);
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  });

  const buyLamports = config && isAmount(draft.firstBuy) && draft.firstBuy ? toUnits(draft.firstBuy, config.quoteDecimals) : 0n;
  const overBalance = balance !== null && buyLamports > balance;
  const valid = [
    draft.name.trim().length > 0 && new TextEncoder().encode(draft.name.trim()).length <= NAME_MAX && draft.ticker.length > 0 && linkErrors.every((e) => !e),
    true,
    isAmount(draft.firstBuy) && !overBalance,
    true,
  ];

  const go = (to: number) => {
    setStep(to);
    setVisited((v) => Math.max(v, to));
  };
  const next = () => (step < 3 ? valid[step] && go(step + 1) : submit());
  async function submit() {
    if (!publicKey) return setVisible(true);
    await launch({
      name: draft.name.trim(),
      ticker: draft.ticker,
      firstBuy: draft.firstBuy,
      description: draft.description.trim() || undefined,
      image: draft.image || undefined,
      website: draft.website.trim() || undefined,
      twitter: draft.twitter.trim() || undefined,
      telegram: draft.telegram.trim() || undefined,
    });
  }
  function again() {
    reset();
    setDraft(EMPTY);
    setImageError(null);
    setStep(0);
    setVisited(0);
  }

  return (
    <div className="lp-grid">
      <form className="glass wz rise" style={{ ['--d' as string]: 4 }} onSubmit={(e) => (e.preventDefault(), stage === 'edit' && next())} aria-label="Launch a coin">
        {/* the stepper: one era per step */}
        <ol className="wz-steps">
          {STEPS.map((label, i) => {
            const state = stage !== 'edit' || i < step ? 'done' : i === step ? 'on' : 'off';
            return (
              <li key={label}>
                <button type="button" className={`wz-step wz-step--${state}`} style={{ ['--era' as string]: `var(--era-${i + 1})` }} disabled={stage !== 'edit' || i > visited} onClick={() => go(i)} aria-current={i === step && stage === 'edit' ? 'step' : undefined}>
                  <span className="wz-bar" />
                  <span><span className="label">Era {i + 1}</span><span className="wz-step-name">{label}</span></span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="wz-body" key={`${stage}-${step}`}>
          {stage === 'edit' && step === 0 && (
            <>
              <div className="launch-pair">
                <div className="field"><label htmlFor="wz-name">Name</label><input id="wz-name" value={draft.name} onChange={set('name')} placeholder="Hypedog" maxLength={NAME_MAX} autoFocus autoComplete="off" /></div>
                <div className="field"><label htmlFor="wz-ticker">Ticker</label><input id="wz-ticker" value={draft.ticker} onChange={set('ticker')} placeholder="HDOG" maxLength={TICKER_MAX} autoComplete="off" /></div>
              </div>
              <div className="field">
                <div className="wz-row"><label htmlFor="wz-desc">Description · optional</label><span className="hint">{draft.description.length}/{DESCRIPTION_MAX}</span></div>
                <textarea id="wz-desc" value={draft.description} onChange={set('description')} placeholder="One line on what this coin is." maxLength={DESCRIPTION_MAX} rows={3} />
              </div>
              <div className="field">
                <div className="wz-row"><label htmlFor="wz-image">Image · optional</label><span className="hint">Square, resized to 512 px</span></div>
                <label className="wz-file" htmlFor="wz-image">
                  {draft.image ? <img src={draft.image} alt="" /> : <span className="wz-file-empty num">+</span>}
                  <span className="wz-file-name">{draft.imageName || 'Choose a PNG, JPG or WebP'}</span>
                  <span className="num wz-file-cta">{draft.image ? 'Change' : 'Browse'}</span>
                  <input id="wz-image" type="file" accept="image/*" onChange={pickImage} />
                </label>
                {imageError && <span className="hint wz-field-error">{imageError}</span>}
              </div>
              <div className="wz-links">
                {LINKS.map(([kind, label, placeholder], i) => (
                  <div className="field" key={kind}>
                    <label htmlFor={`wz-${kind}`}>{label} · optional</label>
                    <input id={`wz-${kind}`} value={draft[kind]} onChange={set(kind)} placeholder={placeholder} aria-invalid={!!linkErrors[i]} autoComplete="off" />
                    {linkErrors[i] && <span className="hint wz-field-error">{linkErrors[i]}</span>}
                  </div>
                ))}
              </div>
            </>
          )}

          {stage === 'edit' && step === 1 && (
            <>
              <Heading title="Four eras, fixed." sub="Every QUAD coin runs on the same curve. Each era sells half the coins of the last for the same HYPE." />
              <div className="wz-eras" role="table" aria-label="The four eras">
                <div role="row" className="wz-eras-head"><span role="columnheader" className="label">Era</span><span role="columnheader" className="label">Coins</span><span role="columnheader" className="label">HYPE</span><span role="columnheader" className="label">Avg price</span></div>
                {[0, 1, 2, 3].map((i) => (
                  <div role="row" key={i}>
                    <span role="cell"><i style={{ background: `var(--era-${i + 1})` }} />Era {i + 1}</span>
                    <span role="cell" className="num">{view ? fmt(view.eras[i].coins) : `${[8, 4, 2, 1][i]}/15`}</span>
                    <span role="cell" className="num">{view ? fmt(view.eras[i].hype) : '—'}</span>
                    <span role="cell" className="num">{view ? price(view.eras[i].price) : '—'}</span>
                  </div>
                ))}
              </div>
              <p className="lp-note">
                At <span className="num">{view ? `${view.threshold} HYPE` : '—'}</span> the coin graduates to a Meteora pool with <span className="num">{view ? fmt(view.migrationCoins) : '—'}</span> coins, liquidity locked for good.
              </p>
            </>
          )}

          {stage === 'edit' && step === 2 && (
            <>
              <Heading title={`Buy first, at ${pct(BASE_FEE)}.`} sub={`Your buy goes in the launch transaction, before anyone else can trade, and skips the ${pct(ANTI_SNIPER_FEE)} anti-sniper fee.`} />
              <div className="field">
                <div className="wz-row"><label htmlFor="wz-buy">Amount · optional</label>{balance !== null && config && <button type="button" className="wz-link" onClick={() => setDraft((d) => ({ ...d, firstBuy: String(fromUnits(balance, config.quoteDecimals)) }))}>Balance {fmt(fromUnits(balance, config.quoteDecimals))} HYPE</button>}</div>
                <div className="wz-amount"><input id="wz-buy" inputMode="decimal" value={draft.firstBuy} onChange={set('firstBuy')} placeholder="0.00" aria-invalid={!valid[2]} autoFocus autoComplete="off" /><span className="num">HYPE</span></div>
                <div className="wz-chips">
                  <button type="button" className={draft.firstBuy === '' ? 'on' : ''} onClick={() => setDraft((d) => ({ ...d, firstBuy: '' }))}>None</button>
                  {BUY_PRESETS.map((v) => <button type="button" key={v} className={draft.firstBuy === v ? 'on' : ''} onClick={() => setDraft((d) => ({ ...d, firstBuy: v }))}>{v} HYPE</button>)}
                </div>
                {overBalance && <span className="hint" style={{ color: 'var(--danger)' }}>More than your wallet holds.</span>}
              </div>
              <dl className="lp-rows">
                <div><dt>You get</dt><dd className="num">{view && view.buyCoins > 0 ? `≈ ${Math.round(view.buyCoins).toLocaleString('en-US')} coins` : '—'}</dd></div>
                <div><dt>Share of supply</dt><dd className="num">{view && view.buyCoins > 0 ? pct(view.buyCoins / Number(TOTAL_COINS)) : '—'}</dd></div>
                <div><dt>Fee</dt><dd className="num">{view && view.buy > 0 ? `${view.buyFee.toPrecision(3)} HYPE` : pct(BASE_FEE)}</dd></div>
              </dl>
            </>
          )}

          {stage === 'edit' && step === 3 && (
            <>
              <Heading title="Ready to launch." sub="One signature does it all. Check it once more." />
              <dl className="lp-rows">
                <div><dt>Coin</dt><dd className="num">{draft.name.trim()} · ${draft.ticker}</dd></div>
                <div><dt>Image</dt><dd className="num">{draft.image ? draft.imageName : 'None'}</dd></div>
                <div><dt>Links</dt><dd className="num">{LINKS.filter(([k]) => draft[k].trim()).map(([, l]) => l).join(' · ') || 'None'}</dd></div>
                <div><dt>Supply</dt><dd className="num">{coins(TOTAL_COINS)}</dd></div>
                <div><dt>Graduates at</dt><dd className="num">{view ? `${view.threshold} HYPE` : '—'}</dd></div>
                <div><dt>Your first buy</dt><dd className="num">{Number(draft.firstBuy) > 0 ? `${draft.firstBuy} HYPE${view ? ` → ≈ ${fmt(view.buyCoins)} coins` : ''}` : 'None'}</dd></div>
                <div><dt>You earn</dt><dd className="num">{pct(CREATOR_FEE)} of every trade, in HYPE</dd></div>
                <div><dt>Launch cost</dt><dd className="num">{view && view.launchFee > 0 ? `${view.launchFee} SOL + ` : ''}≈ {RENT_ESTIMATE_SOL} SOL rent</dd></div>
              </dl>
              <p className="lp-note">Mint authority is revoked in the same transaction. The coin never gets a freeze authority. Fees go to {publicKey ? <span className="num">{short(publicKey.toBase58())}</span> : 'the wallet you connect'}.</p>
            </>
          )}

          {stage === 'launching' && (
            <>
              <Heading kicker="Launching" title={result && !result.ok ? 'It did not go through.' : 'Launching your coin.'} sub={result && !result.ok ? 'Nothing was created on-chain unless the last step failed. Check your wallet, then try again.' : 'Keep this tab open. It takes a few seconds.'} />
              <ol className="wz-phases">
                {PHASES.map(([p, title, sub], i) => {
                  const at = PHASES.findIndex(([q]) => q === (phase ?? (result && !result.ok ? result.phase : 'upload')));
                  const failed = result && !result.ok && i === at;
                  const state = failed ? 'fail' : i < at ? 'done' : i === at ? 'on' : 'off';
                  return (
                    <li key={p} className={`wz-phase wz-phase--${state}`} style={{ ['--era' as string]: `var(--era-${i + 2})` }}>
                      <span className="wz-dot" aria-hidden="true">{state === 'done' ? '✓' : state === 'fail' ? '!' : i + 1}</span>
                      <span><span className="wz-phase-title">{title}</span><span className="lp-note">{sub}</span></span>
                    </li>
                  );
                })}
              </ol>
              {result && !result.ok && <p role="alert" className="num wz-error">{result.message}</p>}
            </>
          )}

          {stage === 'done' && result?.ok && (
            <>
              <Heading kicker="Era 1 · Live" title={`${draft.name.trim() || 'Your coin'} is live.`} sub={`$${draft.ticker} is on the curve. Every trade from now on pays you ${pct(CREATOR_FEE)} in HYPE.`} />
              <dl className="lp-rows">
                <div><dt>Pool</dt><dd className="num">{short(result.pool)}</dd></div>
                <div><dt>Mint</dt><dd className="num">{short(result.baseMint)}</dd></div>
                <div><dt>Transaction</dt><dd className="num"><a href={explorerTx(result.sig)} target="_blank" rel="noopener" className="wz-link">{short(result.sig)} ↗</a></dd></div>
              </dl>
              <div className="wz-actions-inline">
                <LinkButton href={tradeUrl(result.baseMint)} target="_blank" rel="noopener">Trade <span className="num">↗</span></LinkButton>
                <LinkButton variant="secondary" href="/creators#claim">Creator fees</LinkButton>
              </div>
            </>
          )}

          {configError && stage === 'edit' && <p role="alert" className="num wz-error">{configError}</p>}
        </div>

        <div className="wz-foot">
          {stage === 'edit' && (
            <>
              <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0} style={{ visibility: step === 0 ? 'hidden' : undefined }}>← Back</Button>
              <Button type="submit" disabled={!valid[step] || (step === 3 && !!publicKey && !config)}>
                {step < 3 ? <>Continue <span className="num">→</span></> : publicKey ? <>Launch coin <span className="num">→</span></> : 'Connect wallet to launch'}
              </Button>
            </>
          )}
          {stage === 'launching' && result && !result.ok && (
            <>
              <Button type="button" variant="ghost" onClick={() => (reset(), go(3))}>← Back to review</Button>
              <Button type="button" onClick={submit}>Try again</Button>
            </>
          )}
          {stage === 'launching' && !result && <span className="label" style={{ marginLeft: 'auto' }}>Do not close this tab</span>}
          {stage === 'done' && <Button type="button" variant="secondary" onClick={again} style={{ marginLeft: 'auto' }}>Launch another</Button>}
        </div>
      </form>

      {/* live preview of the coin, as a token card */}
      <aside className="tk lp-preview rise" style={{ ['--d' as string]: 5, ['--era' as string]: 'var(--era-1)', ['--on' as string]: 'var(--on-era-1)' }} aria-label="Preview">
        <div className="tk-art grain">
          <span className="label tk-art-tag">Preview · live</span>
          {draft.image ? <span className="tk-photo"><img src={draft.image} alt="" /></span> : <span className="tk-initials num">{initials(draft)}</span>}
          <span className="tk-pct num">{view ? `${(view.progress * 100).toFixed(1)}%` : '0%'}</span>
        </div>
        <div className="tk-body">
          <div className="tk-head">
            <span className="tk-name">{draft.name.trim() || 'Your coin'} <span className="num">${draft.ticker || 'TICKER'}</span></span>
            <span className="q-era q-era--1">Era 1</span>
          </div>
          {draft.description.trim() && <p className="lp-note lp-desc">{draft.description.trim()}</p>}
          <EraSteps progress={view?.progress ?? 0} height={44} labels={false} />
          <dl className="tk-stats">
            <div><dt className="label">Supply</dt><dd className="num">{coins(TOTAL_COINS, true)}</dd></div>
            <div><dt className="label">Start price</dt><dd className="num">{view ? price(view.startPrice) : '—'}</dd></div>
            <div><dt className="label">Graduates</dt><dd className="num">{view ? `${view.threshold} HYPE` : '—'}</dd></div>
          </dl>
          <div className="tk-foot"><span className="label">{view && view.buyCoins > 0 ? `First buy ≈ ${fmt(view.buyCoins)} coins` : 'Updates as you type'}</span><span className="label tk-sample">Not live</span></div>
        </div>
      </aside>
    </div>
  );
}

function Heading({ kicker, title, sub }: { kicker?: string; title: string; sub: string }) {
  return (
    <div className="wz-head">
      {kicker && <span className="label">{kicker}</span>}
      <h2>{title}</h2>
      <p className="lp-note">{sub}</p>
    </div>
  );
}
