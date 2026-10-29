import { Lockup } from './Lockup';
import { LinkButton } from './Button';
import { WalletButton } from './WalletButton';

/** Paths start at "/" so they work from every page; on the landing they scroll in place. */
export const NAV = [['/launch', 'Launch'], ['/#curve', 'On the curve'], ['/#rules', 'The four rules'], ['/#creators', 'Creators'], ['/#docs', 'Docs']] as const;
export const GET_HYPE = 'https://jup.ag';

/** The site header from the landing mockup: nav + Get HYPE + wallet; on mobile, Launch + menu. */
export function SiteHeader({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <header className={`hero-head container ${className}`} style={style}>
      <Lockup size="sm" />
      <nav className="hero-nav hide-m" style={{ display: 'flex', gap: 4 }} aria-label="Primary">
        {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <div className="hide-m" style={{ display: 'flex', gap: 12 }}>
        <LinkButton variant="secondary" href={GET_HYPE} target="_blank" rel="noopener" style={{ height: 40 }}>Get HYPE</LinkButton>
        <WalletButton style={{ height: 40 }} />
      </div>
      <div className="show-m" style={{ gap: 8, alignItems: 'center' }}>
        <LinkButton href="/launch" style={{ height: 40, padding: '0 16px', fontSize: 14 }}>Launch</LinkButton>
        <details className="menu-m">
          <summary className="q-btn q-btn--secondary" aria-label="Open menu" style={{ width: 44, height: 44, padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" /></svg>
          </summary>
          <nav aria-label="Primary">
            {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
            <a href="/creator">Creator fees</a>
            <a href={GET_HYPE} target="_blank" rel="noopener">Get HYPE</a>
            <WalletButton style={{ marginTop: 8 }} />
          </nav>
        </details>
      </div>
    </header>
  );
}
