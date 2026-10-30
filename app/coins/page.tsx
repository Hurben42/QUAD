import { SiteHeader } from '@/components/SiteHeader';
import { CurveList } from '@/components/CurveList';

export const metadata = { title: 'On the curve — QUAD', description: 'Every coin launched on QUAD, era by era, closest to graduation first.' };

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;

/** The full list of coins on the curve, with the era tabs. */
export default function CoinsPage() {
  return (
    <main className="cr">
      <SiteHeader className="rise" style={d(0)} />
      <section className="cr-sec coins-page" id="curve">
        <div className="cr-head rise" style={d(1)}>
          <span className="label">On the curve</span>
          <h2>Coins on their steps right now.</h2>
          <p>Every coin launched on QUAD, closest to graduation first. Pick an era to see who is on that step.</p>
        </div>
        <div className="rise" style={d(2)}><CurveList /></div>
      </section>
      <footer className="container doc-foot">
        <span className="label">© 2026 QUAD · Four eras · Priced in HYPE</span>
        <a className="label" href="/launch">Launch a coin →</a>
      </footer>
    </main>
  );
}
