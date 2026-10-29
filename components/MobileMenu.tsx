'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { usePathname } from 'next/navigation';
import { Lockup } from './Lockup';
import { LinkButton } from './Button';
import { Stripes } from './Stripes';
import { WalletButton } from './WalletButton';

type Link = readonly [href: string, label: string];

/**
 * Full-screen menu for ≤900px. Rendered in a portal on <body> so no page stacking context
 * (the hero, the /launch layers) can cover it. Era stripes on top, big numbered links.
 */
export function MobileMenu({ links, getHype }: { links: readonly Link[]; getHype: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const path = usePathname();

  useEffect(() => setMounted(true), []);
  useEffect(() => setOpen(false), [path]);

  useEffect(() => {
    if (!open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('.mm-close')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key !== 'Tab' || !panel.current) return;
      const items = [...panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')];
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      trigger.current?.focus();
    };
  }, [open]);

  // "/#curve" is the landing's section; the current page is the one whose path matches
  const isCurrent = (href: string) => !href.includes('#') && href === path;

  return (
    <>
      <button ref={trigger} type="button" className="q-btn q-btn--secondary mm-trigger" aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)}>
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M3 6h14M3 14h14" /></svg>
      </button>
      {mounted && open &&
        createPortal(
          <div ref={panel} className="mm" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="mm-sky" aria-hidden="true"><Stripes /><div className="mm-fade" /></div>
            <div className="mm-top">
              <Lockup size="sm" />
              <button type="button" className="mm-close" aria-label="Close menu" onClick={() => setOpen(false)}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" /></svg>
              </button>
            </div>
            <nav className="mm-nav" aria-label="Primary">
              {links.map(([href, label], i) => (
                <a key={href} href={href} className="mm-link" aria-current={isCurrent(href) ? 'page' : undefined} style={{ ['--d' as string]: i }} onClick={() => setOpen(false)}>
                  <span className="label">{String(i + 1).padStart(2, '0')}</span>
                  <span className="mm-word">{label}</span>
                  <span className="num mm-arrow" aria-hidden="true">→</span>
                </a>
              ))}
            </nav>
            <div className="mm-foot">
              <WalletButton style={{ width: '100%', height: 52 }} />
              <LinkButton variant="secondary" href={getHype} target="_blank" rel="noopener" style={{ width: '100%', height: 52 }}>Get HYPE <span className="num">↗</span></LinkButton>
              <span className="label mm-note">Paired to HYPE · not affiliated with Hyperliquid</span>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
