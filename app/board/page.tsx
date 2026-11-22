import { SiteHeader } from '@/components/SiteHeader';
import { LiveBoard } from '@/components/LiveBoard';

export const metadata = { title: 'Live board — QUAD', description: 'Every QUAD token, era by era, live: new launches, coins about to graduate, one-click buys.' };

const d = (n: number) => ({ ['--d' as string]: n }) as React.CSSProperties;

/** The live board: one column per era, refreshed every few seconds. On desktop it fills the screen and only the columns scroll. */
export default function BoardPage() {
  return (
    <main className="cr bd-page">
      <SiteHeader className="rise" style={d(0)} />
      <section className="bd-sec rise" id="board" aria-label="Live board" style={d(1)}>
        <LiveBoard />
      </section>
    </main>
  );
}
