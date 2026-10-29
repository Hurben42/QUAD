import { Lockup } from '@/components/Lockup';
import { WalletButton } from '@/components/WalletButton';
import { CreatorDashboard } from '@/components/CreatorDashboard';
import { CREATOR_FEE, pct } from '@/lib/curve';

export const metadata = { title: 'Creator fees — QUAD' };

export default function CreatorPage() {
  return (
    <main>
      <header className="container" style={{ padding: '24px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
        <Lockup size="sm" />
        <WalletButton style={{ height: 40 }} />
      </header>
      <section className="sec" style={{ paddingTop: 48, display: 'flex', flexDirection: 'column', gap: 32 }}>
        <div className="sec-head" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="label">Creators</span>
          <h1 className="sec-title">Your coins pay you in HYPE.</h1>
          <p style={{ margin: 0, font: '500 16px/24px var(--font-sans)', color: 'var(--text-muted)', maxWidth: 520 }}>
            {pct(CREATOR_FEE)} of every trade accrues to the wallet that launched the coin. Claim it whenever you like. Once the curve completes, the HYPE raised above the threshold can be withdrawn once.
          </p>
        </div>
        <CreatorDashboard />
      </section>
    </main>
  );
}
