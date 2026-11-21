import { NextResponse } from 'next/server';
import { Connection, LAMPORTS_PER_SOL, Transaction } from '@solana/web3.js';
import { deriveDbcPoolAddress } from '@meteora-ag/dynamic-bonding-curve-sdk';
import { checkRelayTx } from '@/lib/anon-relay';
import { relayer } from '@/lib/anon-server';
import { DBC_CONFIG, QUOTE_MINT, makeClient } from '@/lib/dbc';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Most the relayer may spend on one claim: the fee and a couple of token accounts' rent. */
const RELAY_MAX_SPEND_SOL = 0.01;
const WINDOW_MS = 10 * 60 * 1000;
const PER_SIGNER = 10;
const recent = new Map<string, number[]>();

function limited(key: string) {
  const now = Date.now();
  const hits = (recent.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  hits.push(now);
  recent.set(key, hits);
  return hits.length > PER_SIGNER;
}

/** The relayer's address, so the claim page can set it as fee payer. */
export async function GET() {
  return NextResponse.json({ relayer: relayer().publicKey.toBase58() });
}

/** A claim transaction signed by the claim key, co-signed here as fee payer once it passes the relayer rules. */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const r = relayer();
  let tx: Transaction;
  try {
    tx = Transaction.from(Buffer.from(String(body?.tx ?? ''), 'base64'));
  } catch {
    return NextResponse.json({ error: 'not a transaction' }, { status: 400 });
  }
  let req2;
  try {
    req2 = checkRelayTx(tx, r.publicKey);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 400 });
  }
  if (req2.signers.some((s) => limited(s.toBase58()))) return NextResponse.json({ error: 'too many claims, try again in a few minutes' }, { status: 429 });

  const connection = new Connection(process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com', 'confirmed');
  try {
    // only QUAD pools and their tokens
    const client = makeClient(connection);
    for (const pool of req2.pools) {
      const p = await client.state.getPool(pool);
      if (!p || !p.poolState.config.equals(DBC_CONFIG)) return NextResponse.json({ error: 'not a QUAD pool' }, { status: 400 });
    }
    // a QUAD token is HYPE or the base mint of a pool of the QUAD config (its address derives from the mint)
    for (const mint of req2.mints) {
      if (mint.equals(QUOTE_MINT)) continue;
      if (!(await connection.getAccountInfo(deriveDbcPoolAddress(QUOTE_MINT, mint, DBC_CONFIG)))) return NextResponse.json({ error: 'not a QUAD token' }, { status: 400 });
    }

    tx.partialSign(r);
    // what would it cost the relayer?
    const before = await connection.getBalance(r.publicKey);
    const sim = await connection.simulateTransaction(tx, undefined, [r.publicKey]);
    if (sim.value.err) return NextResponse.json({ error: `simulation failed: ${JSON.stringify(sim.value.err)}`, logs: sim.value.logs?.slice(-6) }, { status: 400 });
    const after = sim.value.accounts?.[0]?.lamports ?? 0;
    if (before - after > RELAY_MAX_SPEND_SOL * LAMPORTS_PER_SOL) return NextResponse.json({ error: 'this claim would cost the relayer too much' }, { status: 400 });

    const signature = await connection.sendRawTransaction(tx.serialize());
    const latest = await connection.getLatestBlockhash();
    const conf = await connection.confirmTransaction({ signature, blockhash: tx.recentBlockhash!, lastValidBlockHeight: latest.lastValidBlockHeight }, 'confirmed');
    if (conf.value.err) return NextResponse.json({ error: `failed on-chain: ${JSON.stringify(conf.value.err)}`, signature }, { status: 502 });
    return NextResponse.json({ signature });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}
