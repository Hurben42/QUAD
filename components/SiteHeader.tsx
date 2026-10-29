'use client';
import { useEffect, useRef, useState } from 'react';
import { Lockup } from './Lockup';
import { LinkButton } from './Button';
import { WalletButton } from './WalletButton';
import { MobileMenu } from './MobileMenu';

/** Paths start at "/" so they work from every page. Launch is a button, not a nav entry. */
export const NAV = [['/rules', 'The four rules'], ['/creators', 'Creators'], ['/docs', 'Docs']] as const;
export const GET_HYPE = 'https://jup.ag';
/** Past this many pixels of scroll the header detaches into a fixed glass bar. */
const STICK_AFTER = 24;

/**
 * The site header: nav, Launch and the wallet; on mobile, Launch and the menu. Once the page
 * scrolls it becomes a fixed glass bar 10px from the edges; a spacer keeps the layout in place.
 */
export function SiteHeader({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  const ref = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > STICK_AFTER;
      if (next && ref.current && !ref.current.classList.contains('is-stuck')) setHeight(ref.current.offsetHeight);
      setStuck(next);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {stuck && <div className="site-head-spacer" style={{ height }} aria-hidden="true" />}
      {/* once fixed it turns to frosted white, so its tokens switch to the light theme to stay readable */}
      <header ref={ref} className={`hero-head container site-head ${stuck ? 'is-stuck' : ''} ${className}`} style={style} data-theme={stuck ? 'light' : undefined}>
        <Lockup size="sm" />
        <nav className="hero-nav hide-m" style={{ display: 'flex', gap: 4 }} aria-label="Primary">
          {NAV.map(([href, label]) => <a key={href} href={href}>{label}</a>)}
        </nav>
        <div className="hide-m" style={{ display: 'flex', gap: 12 }}>
          <LinkButton href="/launch" style={{ height: 40 }}>Launch <span className="num">→</span></LinkButton>
          <WalletButton variant="secondary" style={{ height: 40 }} />
        </div>
        <div className="show-m" style={{ gap: 8, alignItems: 'center' }}>
          <LinkButton href="/launch" style={{ height: 40, padding: '0 16px', fontSize: 14 }}>Launch</LinkButton>
          <MobileMenu links={NAV} />
        </div>
      </header>
    </>
  );
}
