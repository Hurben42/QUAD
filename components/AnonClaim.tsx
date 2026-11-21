'use client';
import { useCallback, useEffect, useState } from 'react';
import { Keypair, PublicKey, Transaction } from '@solana/web3.js';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { createAssociatedTokenAccountIdempotentInstruction, createTransferCheckedInstruction, getAccount, getAssociatedTokenAddressSync, getMint } from '@solana/spl-token';
import BN from 'bn.js';
import { Button } from './Button';
import { claimKeypair } from '@/lib/anon';
import { listCreatorPools, makeClient, type CreatorPool } from '@/lib/dbc';
import { explorerTx } from '@/lib/explorer';
import { useQuadConfig } from '@/lib/useQuadConfig';

type Row = CreatorPool & { tokens: bigint; decimals: number; tokenProgram: PublicKey };
const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
const units = (x: bigint, d: number) => (Number(x) / 10 ** d).toLocaleString('en-US', { maximumFractionDigits: 4 });

/**
 * Anonymous creators claim here (docs/ANONYMOUS.md): the claim secret is turned into the claim key
 * in this browser, which signs; QUAD's relayer only pays the network fee. Fees and tokens go to any
 * address, which needs no SOL.
 */
export function AnonClaim() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const { config } = useQuadConfig();
  const [secret, setSecret] = useState('');
  const [shown, setShown] = useState(false);
  const [key, setKey] = useState<Keypair | null>(null);
  const [receiver, setReceiver] = useState('');
  const [rows, setRows] = useState<Row[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (publicKey && !receiver) setReceiver(publicKey.toBase58());
  }, [publicKey, receiver]);

  const load = useCallback(
    async (k: Keypair) => {
      const pools = await listCreatorPools(connection, k.publicKey);
      setRows(
        await Promise.all(
          pools.map(async (p) => {
            const mint = new PublicKey(p.baseMint);
            const info = await connection.getAccountInfo(mint);
            const tokenProgram = info!.owner;
            const decimals = (await getMint(connection, mint, 'confirmed', tokenProgram)).decimals;
            const account = await getAccount(connection, getAssociatedTokenAddressSync(mint, k.publicKey, false, tokenProgram), 'confirmed', tokenProgram).catch(() => null);
            return { ...p, tokens: account?.amount ?? 0n, decimals, tokenProgram };
          }),
        ),
      );
    },
    [connection],
  );

  async function open(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const k = claimKeypair(secret);
      setKey(k);
      setRows(null);
      await load(k);
    } catch (err) {
      setKey(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  function to(): PublicKey {
    try {
      return new PublicKey(receiver.trim());
    } catch {
      throw new Error('Receiver: not a Solana address.');
    }
  }

  async function relay(tx: Transaction, k: Keypair) {
    const { relayer } = await (await fetch('/api/anon/relay')).json();
    tx.feePayer = new PublicKey(relayer);
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    tx.partialSign(k);
    const res = await fetch('/api/anon/relay', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ tx: tx.serialize({ requireAllSignatures: false, verifySignatures: false }).toString('base64') }) });
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? res.statusText);
    return body.signature as string;
  }

  async function act(row: Row, what: 'fees' | 'tokens') {
    if (!key) return;
    const id = `${row.pool}:${what}`;
    setBusy(id);
    setError(null);
    try {
      const dest = to();
      const { relayer } = await (await fetch('/api/anon/relay')).json();
      let tx: Transaction;
      if (what === 'fees') {
        tx = await makeClient(connection).creator.claimCreatorTradingFeeToReceiver({
          creator: key.publicKey,
          payer: new PublicKey(relayer),
          pool: new PublicKey(row.pool),
          maxBaseAmount: new BN(0),
          maxQuoteAmount: new BN(row.unclaimedQuoteFee.toString()),
          receiver: dest,
        });
      } else {
        const mint = new PublicKey(row.baseMint);
        const target = getAssociatedTokenAddressSync(mint, dest, true, row.tokenProgram);
        tx = new Transaction().add(
          createAssociatedTokenAccountIdempotentInstruction(new PublicKey(relayer), target, dest, mint, row.tokenProgram),
          createTransferCheckedInstruction(getAssociatedTokenAddressSync(mint, key.publicKey, false, row.tokenProgram), mint, target, key.publicKey, row.tokens, row.decimals, [], row.tokenProgram),
        );
      }
      const sig = await relay(tx, key);
      setDone((d) => ({ ...d, [id]: sig }));
      await load(key);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const qd = config?.quoteDecimals ?? 8;
  return (
    <div className="claim">
      <form className="claim-key" onSubmit={open}>
        <div className="field">
          <div className="wz-row"><label htmlFor="claim-secret">Claim secret</label><button type="button" className="wz-link" onClick={() => setShown((s) => !s)}>{shown ? 'Hide' : 'Show'}</button></div>
          <input id="claim-secret" type={shown ? 'text' : 'password'} value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="quad-claim-…" autoComplete="off" spellCheck={false} />
        </div>
        <Button type="submit" disabled={!secret.trim()}>Open <span className="num">→</span></Button>
        <p className="lp-note">It is turned into the claim key here, in this browser. It is never sent.</p>
      </form>

      {key && (
        <>
          <div className="field">
            <label htmlFor="claim-to">Send to</label>
            <input id="claim-to" value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="Any Solana address" autoComplete="off" spellCheck={false} />
            <span className="hint">Any address, even an empty one: QUAD pays the network fee.</span>
          </div>
          <div className="claim-list">
            <div className="claim-head"><span className="label">Claim key</span><span className="num">{short(key.publicKey.toBase58())}</span></div>
            {rows === null && <p className="lp-note">Reading the curve…</p>}
            {rows?.length === 0 && <p className="lp-note">No QUAD coin has this claim key as its creator.</p>}
            {rows?.map((r) => (
              <div key={r.pool} className="claim-row">
                <div className="claim-coin">
                  <a href={`/token/${r.pool}`} className="claim-name">{r.name || short(r.baseMint)} <span className="num">${r.symbol}</span></a>
                  <span className={`q-era q-era--${r.era}`}>{r.migrated ? 'Graduated' : `Era ${r.era}`}</span>
                </div>
                <div className="claim-actions">
                  <Button type="button" variant="secondary" disabled={r.unclaimedQuoteFee === 0n || busy !== null} onClick={() => act(r, 'fees')}>
                    {busy === `${r.pool}:fees` ? 'Claiming…' : `Claim ${units(r.unclaimedQuoteFee, qd)} HYPE`}
                  </Button>
                  <Button type="button" variant="secondary" disabled={r.tokens === 0n || busy !== null} onClick={() => act(r, 'tokens')}>
                    {busy === `${r.pool}:tokens` ? 'Sending…' : `Send ${units(r.tokens, r.decimals)} $${r.symbol}`}
                  </Button>
                </div>
                {(done[`${r.pool}:fees`] || done[`${r.pool}:tokens`]) && (
                  <p className="lp-note claim-done">
                    Sent · {[done[`${r.pool}:fees`], done[`${r.pool}:tokens`]].filter(Boolean).map((s) => <a key={s} href={explorerTx(s!)} target="_blank" rel="noopener" className="wz-link">{short(s!)} ↗</a>)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
      {error && <p role="alert" className="num wz-error">{error}</p>}
    </div>
  );
}
