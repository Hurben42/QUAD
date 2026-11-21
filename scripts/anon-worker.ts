/**
 * Moves anonymous launch orders along: payments seen, deposits swept, queued launches fired.
 * Calls the app's POST /api/anon/process every few seconds, so the keys stay in the app.
 *
 *   pnpm dev                       # or the deployed app
 *   ANON_WORKER_TOKEN=… pnpm anon:worker
 */
import './env';

const app = process.env.APP_URL ?? 'http://localhost:3000';
const token = process.env.ANON_WORKER_TOKEN;
const every = Number(process.env.ANON_WORKER_EVERY_S ?? 5) * 1000;

async function tick() {
  const res = await fetch(`${app}/api/anon/process`, { method: 'POST', headers: { authorization: `Bearer ${token}` } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) console.error(new Date().toISOString(), res.status, body.error ?? '');
  else if (body.open) console.log(new Date().toISOString(), `${body.open} open order(s)`);
}

async function main() {
  if (!token) throw new Error('set ANON_WORKER_TOKEN (the same value as the app)');
  console.log(`anon worker → ${app} every ${every / 1000}s`);
  for (;;) {
    await tick().catch((e) => console.error(new Date().toISOString(), String(e)));
    await new Promise((r) => setTimeout(r, every));
  }
}

main();
