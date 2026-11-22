'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { tokenBalance } from '@/lib/wallet-balance';
import { Button } from './Button';
import { QUOTE_MINT, buildCurveSwapTx, quoteCurveSwap, readCurveState, referralTokenAccount, type CurveQuote, type CurveSide, type CurveState } from '@/lib/dbc';
import { BASE_FEE, CREATOR_FEE, QUAD_REFERRAL_FEE, pct } from '@/lib/curve';
import { isAmount, toUnits } from '@/lib/useLaunch';
import { explorerTx } from '@/lib/explorer';

const REFRESH_MS = 15_000;
const SLIPPAGES = [100, 200, 500];
const BUY_PRESETS = ['0.5', '1', '5'];
const SELL_PRESETS = [25, 50, 100];

const units = (x: bigint, d: number) => Number(x) / 10 ** d;
const show = (x: number) => (x >= 1e6 ? `${(x / 1e6).toFixed(2)}M` : x >= 1e3 ? `${(x / 1e3).toFixed(1)}K` : x >= 1 ? x.toFixed(2) : x.toPrecision(3));
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/**
 * The token page's trade panel: buy or sell straight on the curve with the connected wallet.
 * Same 3.125% fee as anywhere; QUAD's referral cut comes out of Meteora's share of it.
 */
export function CurveSwap({ pool, baseMint, symbol, migrated, quoteDecimals, baseDecimals, onTraded }: { pool: string; baseMint: string; symbol: string; migrated: boolean; quoteDecimals: number; baseDecimals: number; onTraded?: () => void }) {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [side, setSide] = useState<CurveSide>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(200);
  const [state, setState] = useState<CurveState | null>(null);
  const [referral, setReferral] = useState<PublicKey | null>(null);
  const [balances, setBalances] = useState<{ hype: bigint; coin: bigint } | null>(null);
  const [phase, setPhase] = useState<'idle' | 'sign' | 'confirm'>('idle');
  const [result, setResult] = useState<{ ok: true; sig: string } | { ok: false; message: string } | null>(null);

  const poolKey = useMemo(() => new PublicKey(pool), [pool]);
  const mintKey = useMemo(() => new PublicKey(baseMint), [baseMint]);

  const refresh = useCallback(async () => {
    try {
      setState(await readCurveState(connection, poolKey));
    } catch {
      // keep the last state; the next tick retries
    }
  }, [connection, poolKey]);
  const refreshBalances = useCallback(async () => {
    if (!publicKey) return setBalances(null);
    const [hype, coin] = await Promise.all([tokenBalance(connection, QUOTE_MINT, publicKey), tokenBalance(connection, mintKey, publicKey)]);
    setBalances({ hype, coin });
  }, [connection, publicKey, mintKey]);

  useEffect(() => {
    if (migrated) return;
    refresh();
    referralTokenAccount(connection).then(setReferral, () => setReferral(null));
    const t = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(t);
  }, [connection, refresh, migrated]);
  useEffect(() => {
    refreshBalances().catch(() => undefined);
  }, [refreshBalances]);

  const [decIn, decOut] = side === 'buy' ? [quoteDecimals, baseDecimals] : [baseDecimals, quoteDecimals];
  const [unitIn, unitOut] = side === 'buy' ? ['HYPE', `$${symbol}`] : [`$${symbol}`, 'HYPE'];
  const amountIn = isAmount(amount) && amount && Number(amount) > 0 ? toUnits(amount, decIn) : 0n;
  const balanceIn = balances ? (side === 'buy' ? balances.hype : balances.coin) : null;
  const over = balanceIn !== null && amountIn > balanceIn;

  const { quote, quoteError } = useMemo((): { quote: CurveQuote | null; quoteError: string | null } => {
    if (!state || amountIn === 0n || state.migrated) return { quote: null, quoteError: null };
    try {
      return { quote: quoteCurveSwap(state, side, amountIn, slippage, !!referral), quoteError: null };
    } catch (e) {
      return { quote: null, quoteError: e instanceof Error ? e.message : String(e) };
    }
  }, [state, side, amountIn, slippage, referral]);

  async function trade() {
    if (!publicKey) return setVisible(true);
    if (!quote) return;
    setResult(null);
    try {
      setPhase('sign');
      const tx = await buildCurveSwapTx(connection, { pool: poolKey, owner: publicKey, side, amountIn: quote.amountIn, minimumOut: quote.minimumOut, referralTokenAccount: referral });
      const sig = await sendTransaction(tx, connection);
      setPhase('confirm');
      const latest = await connection.getLatestBlockhash();
      const conf = await connection.confirmTransaction({ signature: sig, ...latest }, 'confirmed');
      if (conf.value.err) throw new Error(`transaction failed: ${JSON.stringify(conf.value.err)}`);
      setResult({ ok: true, sig });
      setAmount('');
      await Promise.all([refresh(), refreshBalances()]);
      onTraded?.();
    } catch (e) {
      setResult({ ok: false, message: e instanceof Error ? e.message : String(e) });
    } finally {
      setPhase('idle');
    }
  }

  // a graduated coin trades on its Meteora pool: the page's Trade on Jupiter button covers it
  if (migrated || state?.migrated) return null;

  const busy = phase !== 'idle';
  return (
    <form className="swap" id="trade" onSubmit={(e) => (e.preventDefault(), trade())}>
      <div className="swap-tabs" role="tablist" aria-label="Trade">
        {(['buy', 'sell'] as const).map((s) => (
          <button key={s} type="button" role="tab" aria-selected={side === s} className={side === s ? 'on' : ''} onClick={() => (setSide(s), setAmount(''), setResult(null))}>
            {s === 'buy' ? 'Buy' : 'Sell'}
          </button>
        ))}
      </div>

      <div className="field">
        <div className="wz-row">
          <label htmlFor="swap-amount">{side === 'buy' ? 'You pay' : 'You sell'}</label>
          {balanceIn !== null && (
            <button type="button" className="wz-link" onClick={() => setAmount(String(units(balanceIn, decIn)))}>
              Balance {show(units(balanceIn, decIn))} {unitIn}
            </button>
          )}
        </div>
        <div className="wz-amount">
          <input id="swap-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(',', '.'))} placeholder="0.00" aria-invalid={over || !isAmount(amount)} autoComplete="off" />
          <span className="num">{unitIn}</span>
        </div>
        <div className="wz-chips">
          {side === 'buy'
            ? BUY_PRESETS.map((v) => <button type="button" key={v} className={amount === v ? 'on' : ''} onClick={() => setAmount(v)}>{v} HYPE</button>)
            : SELL_PRESETS.map((p) => (
                <button type="button" key={p} disabled={!balances || balances.coin === 0n} onClick={() => balances && setAmount(String(units((balances.coin * BigInt(p)) / 100n, decIn)))}>
                  {p}%
                </button>
              ))}
        </div>
      </div>

      <dl className="lp-rows swap-rows">
        <div><dt>You get</dt><dd className="num">{quote ? `≈ ${show(units(quote.amountOut, decOut))} ${unitOut}` : '—'}</dd></div>
        <div><dt>At least</dt><dd className="num">{quote ? `${show(units(quote.minimumOut, decOut))} ${unitOut}` : '—'}</dd></div>
        <div><dt>Fee</dt><dd className="num">{quote ? `${show(units(quote.fee, quoteDecimals))} HYPE · ${pct(BASE_FEE)}` : pct(BASE_FEE)}</dd></div>
        {quote && quote.amountLeft > 0n && <div><dt>Returned</dt><dd className="num">{show(units(quote.amountLeft, quoteDecimals))} HYPE · the curve ends first</dd></div>}
      </dl>

      <div className="swap-slip">
        <span className="label">Max slippage</span>
        {SLIPPAGES.map((bps) => <button key={bps} type="button" className={slippage === bps ? 'on' : ''} onClick={() => setSlippage(bps)}>{bps / 100}%</button>)}
      </div>

      <Button type="submit" disabled={busy || (!!publicKey && (!quote || over))}>
        {!publicKey ? 'Connect wallet to trade' : phase === 'sign' ? 'Sign in your wallet…' : phase === 'confirm' ? 'Confirming…' : over ? `Not enough ${unitIn}` : side === 'buy' ? `Buy $${symbol}` : `Sell $${symbol}`}
      </Button>
      {quoteError && <p role="alert" className="num wz-error">{quoteError}</p>}
      {result?.ok === false && <p role="alert" className="num wz-error">{result.message}</p>}
      {result?.ok && <p className="lp-note">Done · <a className="wz-link" href={explorerTx(result.sig)} target="_blank" rel="noopener">{short(result.sig)} ↗</a></p>}
      <p className="lp-note swap-note">Straight to the curve. {pct(CREATOR_FEE)} goes to the creator; QUAD&apos;s {pct(QUAD_REFERRAL_FEE)} comes out of Meteora&apos;s share, not yours.</p>
    </form>
  );
}
