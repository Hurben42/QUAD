import { Lockup } from './Lockup';
import { LinkButton } from './Button';
import { WalletButton } from './WalletButton';
import { MobileMenu } from './MobileMenu';
import { JupiterMark } from './JupiterMark';

/** Paths start at "/" so they work from every page; on the landing they scroll in place. */
export const NAV = [['/launch', 'Launch'], ['/#rules', 'The four rules'], ['/#creators', 'Creators'], ['/docs', 'Docs']] as const;
export const GET_HYPE = 'https://jup.ag';
/** Extra entries in the mobile menu. */
const MORE = [['/creator', 'Creator fees']] as const;

/** The site header from the landing mockup: nav + Get HYPE + wallet; on mobile, Launch + menu. */
export function SiteHeader({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <header className={`hero-head container ${className}`} style={style}>
      <Lockup size="sm" />
      <nav className="hero-nav hide-m" style={{ display: 'flex', gap: 4 }} aria-label="Primary">
        {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
      </nav>
      <div className="hide-m" style={{ display: 'flex', gap: 12 }}>
        <LinkButton variant="secondary" href={GET_HYPE} target="_blank" rel="noopener" title="Swap for HYPE on Jupiter" style={{ height: 40, paddingLeft: 16 }}><JupiterMark />Get HYPE</LinkButton>
        <WalletButton style={{ height: 40 }} />
      </div>
      <div className="show-m" style={{ gap: 8, alignItems: 'center' }}>
        <LinkButton href="/launch" style={{ height: 40, padding: '0 16px', fontSize: 14 }}>Launch</LinkButton>
        <MobileMenu links={[...NAV, ...MORE]} getHype={GET_HYPE} />
      </div>
    </header>
  );
}
