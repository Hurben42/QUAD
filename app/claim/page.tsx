import { SiteHeader } from '@/components/SiteHeader';
import { AnonClaim } from '@/components/AnonClaim';
import { CREATOR_FEE, pct } from '@/lib/curve';

export const metadata = { title: 'Claim — QUAD', description: 'Anonymous creators claim their HYPE fees and first buy with their claim secret, to any address.' };

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;

export default function ClaimPage() {
  return (
    <main className="cr">
      <SiteHeader className="rise" style={d(0)} />
      <section className="cr-sec coins-page">
        <div className="cr-head rise" style={d(1)}>
          <span className="label">Anonymous creators</span>
          <h2>Claim with your secret.</h2>
          <p>Your coin pays its creator {pct(CREATOR_FEE)} of every trade, in HYPE. Paste the claim secret you saved at launch to send those fees and your first buy to any address. Launched from a wallet? <a href="/creators#claim" className="wz-link">Claim there</a>.</p>
        </div>
        <div className="cr-claim rise" style={d(2)}><AnonClaim /></div>
      </section>
      <footer className="container doc-foot">
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
        <a className="label" href="/docs">Read the docs →</a>
      </footer>
    </main>
  );
}
