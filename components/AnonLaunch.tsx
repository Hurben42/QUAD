'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button, LinkButton } from './Button';
import { claimKeypair, delayText, newClaimSecret, type AnonOrderView, type AnonQuote } from '@/lib/anon';
import { explorerTx } from '@/lib/explorer';

/** What the wizard hands over: the coin as typed. */
export type AnonDraft = { name: string; ticker: string; description: string; image: string; website: string; twitter: string; telegram: string; firstBuy: string };

const STORE = 'quad:anon-order';
const POLL_MS = 4000;
const sol = (lamports: string | bigint) => (Number(lamports) / 1e9).toLocaleString('en-US', { maximumFractionDigits: 6 });
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** The order id survives a reload of the tab (never the secret). */
export const pendingAnonOrder = () => {
  try {
    return sessionStorage.getItem(STORE);
  } catch {
    return null;
  }
};

function Copy({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  const [done, setDone] = useState(false);
  return (
    <div className="anon-copy">
      <span className="label">{label}</span>
      <span className={mono ? 'num anon-copy-v' : 'anon-copy-v'}>{value}</span>
      <button
        type="button"
        className="wz-link"
        onClick={() =>
          navigator.clipboard.writeText(value).then(
            () => (setDone(true), setTimeout(() => setDone(false), 1500)),
            () => undefined,
          )
        }
      >
        {done ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

function Heading({ kicker, title, sub }: { kicker: string; title: string; sub: string }) {
  return (
    <div className="wz-head">
      <span className="label">{kicker}</span>
      <h2>{title}</h2>
      <p className="lp-note">{sub}</p>
    </div>
  );
}

/**
 * The anonymous launch, after the wizard's review: save the claim secret, pay the one-time
 * address from a private balance, wait for the delayed launch. See docs/ANONYMOUS.md.
 */
export function AnonLaunch({ draft, quote, resume, onBack, onAgain }: { draft: AnonDraft | null; quote: AnonQuote | null; resume?: string | null; onBack: () => void; onAgain: () => void }) {
  const [secret] = useState(() => (resume ? '' : newClaimSecret()));
  const [saved, setSaved] = useState(false);
  const [order, setOrder] = useState<AnonOrderView | null>(null);
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const poll = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/anon/orders/${id}`, { cache: 'no-store' });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setOrder(body as AnonOrderView);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => {
    if (resume) poll(resume);
  }, [resume, poll]);

  const open = order && (order.status === 'awaiting_payment' || order.status === 'paid' || order.status === 'launching');
  useEffect(() => {
    if (!order || !open) return;
    const t = setInterval(() => poll(order.id), POLL_MS);
    const c = setInterval(() => setNow(Date.now()), 1000);
    return () => (clearInterval(t), clearInterval(c));
  }, [order, open, poll]);
  useEffect(() => {
    if (order && !open) {
      try {
        sessionStorage.removeItem(STORE);
      } catch {}
    }
  }, [order, open]);

  async function place() {
    if (!draft) return;
    setPlacing(true);
    setError(null);
    try {
      const res = await fetch('/api/anon/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: draft.name.trim(),
          symbol: draft.ticker,
          description: draft.description.trim() || undefined,
          image: draft.image || undefined,
          website: draft.website.trim() || undefined,
          twitter: draft.twitter.trim() || undefined,
          telegram: draft.telegram.trim() || undefined,
          firstBuy: draft.firstBuy || '0',
          claimKey: claimKeypair(secret).publicKey.toBase58(),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? res.statusText);
      setOrder(body as AnonOrderView);
      try {
        sessionStorage.setItem(STORE, body.id);
      } catch {}
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setPlacing(false);
    }
  }

  function download() {
    const name = draft?.ticker ? `quad-claim-${draft.ticker}.txt` : 'quad-claim.txt';
    const text = `QUAD claim secret for ${draft?.name ?? 'your coin'} ($${draft?.ticker ?? ''})\n\n${secret}\n\nIt controls the coin's creator fees and the first buy. Paste it at /claim. Nobody can recover it.\n`;
    const url = URL.createObjectURL(new Blob([text], { type: 'text/plain' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: name });
    a.click();
    URL.revokeObjectURL(url);
  }

  const delay = quote ? delayText(quote.delayMinS, quote.delayMaxS) : 'a few minutes';
  let body: React.ReactNode;
  let foot: React.ReactNode;

  if (!order) {
    body = (
      <>
        <Heading kicker="Anonymous · 1 of 3" title="Save your claim secret." sub="It is the only key to this coin's creator fees and to your first buy. It never leaves this browser. Lose it and nobody can recover them." />
        <div className="anon-secret num" aria-label="Claim secret">{secret}</div>
        <div className="wz-actions-inline">
          <Button type="button" variant="secondary" onClick={() => navigator.clipboard.writeText(secret).catch(() => undefined)}>Copy</Button>
          <Button type="button" variant="secondary" onClick={download}>Download .txt</Button>
        </div>
        <label className="anon-check">
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          <span>I saved it somewhere only I can reach.</span>
        </label>
        {error && <p role="alert" className="num wz-error">{error}</p>}
      </>
    );
    foot = (
      <>
        <Button type="button" variant="ghost" onClick={onBack} disabled={placing}>← Back to review</Button>
        <Button type="button" onClick={place} disabled={!saved || placing || !draft}>{placing ? 'Preparing…' : <>Get payment details <span className="num">→</span></>}</Button>
      </>
    );
  } else if (order.status === 'awaiting_payment') {
    const paid = BigInt(order.paidLamports);
    body = (
      <>
        <Heading kicker="Anonymous · 2 of 3" title="Pay from a private balance." sub="Send the amount to this one-time address from a withdrawal of Privacy Cash or a Privacy Ring. Paying from your usual wallet links it to this launch on-chain." />
        <Copy label="Amount" value={`${sol(order.amountLamports)} SOL`} />
        <Copy label="To" value={order.depositAddress} />
        <dl className="lp-rows">
          <div><dt>First buy</dt><dd className="num">{order.firstBuyHype > 0 ? `${order.firstBuyHype} HYPE, swapped by QUAD` : 'None'}</dd></div>
          <div><dt>Received</dt><dd className="num">{paid > 0n ? `${sol(paid)} SOL` : 'Nothing yet'}</dd></div>
          <div><dt>Expires in</dt><dd className="num">{clock(order.expiresAt - now)}</dd></div>
        </dl>
        <p className="lp-note">Once paid, the launch fires at a random time within {delay}, so your payment and your coin do not line up. You can close this tab: the order is kept here until it launches.</p>
        {error && <p role="alert" className="num wz-error">{error}</p>}
      </>
    );
    foot = <span className="label" style={{ marginLeft: 'auto' }}>Waiting for the payment…</span>;
  } else if (order.status === 'paid' || order.status === 'launching') {
    const phases: [string, string, 'done' | 'on' | 'off'][] = [
      ['Payment received', `${sol(order.paidLamports)} SOL.`, 'done'],
      ['Queued', order.status === 'paid' && order.launchAt ? `Fires in ${clock(order.launchAt - now)}, at a random time.` : 'Its time has come.', order.status === 'paid' ? 'on' : 'done'],
      ['Launching', 'A one-time key creates the coin and hands the creator role to your secret.', order.status === 'launching' ? 'on' : 'off'],
    ];
    body = (
      <>
        <Heading kicker="Anonymous · 3 of 3" title="Payment received." sub="The launch is queued. Nothing ties it to your payment but the time, and the time is random." />
        <ol className="wz-phases">
          {phases.map(([title, sub, state], i) => (
            <li key={title} className={`wz-phase wz-phase--${state}`} style={{ ['--era' as string]: `var(--era-${i + 2})` }}>
              <span className="wz-dot" aria-hidden="true">{state === 'done' ? '✓' : i + 1}</span>
              <span><span className="wz-phase-title">{title}</span><span className="lp-note">{sub}</span></span>
            </li>
          ))}
        </ol>
        {order.error && <p className="num wz-error">Retrying: {order.error}</p>}
      </>
    );
    foot = <span className="label" style={{ marginLeft: 'auto' }}>You can close this tab</span>;
  } else if (order.status === 'launched' && order.pool && order.baseMint) {
    body = (
      <>
        <Heading kicker="Era 1 · Live · Anonymous" title={`${order.name} is live.`} sub={`$${order.symbol} is on the curve with no creator wallet. Its fees and your first buy belong to your claim secret: claim them any time, to any address.`} />
        <dl className="lp-rows">
          <div><dt>Pool</dt><dd className="num">{short(order.pool)}</dd></div>
          <div><dt>Mint</dt><dd className="num">{short(order.baseMint)}</dd></div>
          <div><dt>Creator</dt><dd className="num">{short(order.claimKey)} · your secret</dd></div>
          {order.signature && <div><dt>Transaction</dt><dd className="num"><a href={explorerTx(order.signature)} target="_blank" rel="noopener" className="wz-link">{short(order.signature)} ↗</a></dd></div>}
        </dl>
        <div className="wz-actions-inline">
          <LinkButton href={`/token/${order.pool}`}>View token <span className="num">→</span></LinkButton>
          <LinkButton variant="secondary" href="/claim">Claim page</LinkButton>
        </div>
      </>
    );
    foot = <Button type="button" variant="secondary" onClick={onAgain} style={{ marginLeft: 'auto' }}>Launch another</Button>;
  } else {
    body = (
      <>
        <Heading kicker="Anonymous" title={order.status === 'expired' ? 'This order expired.' : 'The launch did not go through.'} sub={order.error ?? (order.status === 'expired' ? 'No payment arrived within the hour.' : 'Something failed three times in a row.')} />
        <dl className="lp-rows"><div><dt>Order</dt><dd className="num">{order.id}</dd></div></dl>
        <p className="lp-note">If you paid, quote this order id to QUAD for a refund to an address of your choice.</p>
      </>
    );
    foot = <Button type="button" variant="secondary" onClick={onAgain} style={{ marginLeft: 'auto' }}>Start over</Button>;
  }

  return (
    <>
      <div className="wz-body">{body}</div>
      <div className="wz-foot">{foot}</div>
    </>
  );
}
