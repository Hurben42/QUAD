'use client';
import { useEffect, useRef, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from './Button';

const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;
/** A stable angle per address, so each wallet's avatar turns the era wheel its own way. */
const angle = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);

/**
 * Connect, or once connected a pill: era-wheel avatar with a live dot, the address in mono,
 * and a menu (copy, your coins, disconnect). Primary by default, secondary next to the header's Launch.
 */
export function WalletButton({ style, variant = 'primary' }: { style?: React.CSSProperties; variant?: 'primary' | 'secondary' }) {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!publicKey)
    return <Button variant={variant} style={style} onClick={() => setVisible(true)} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect wallet'}</Button>;

  const address = publicKey.toBase58();
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="wb" ref={root} style={style ? { width: style.width } : undefined}>
      <button type="button" className="wb-pill" style={style} onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}>
        <span className="wb-avatar" style={{ ['--a' as string]: `${angle(address)}deg` }}><i /></span>
        <span className="num wb-addr">{short(address)}</span>
        <svg className="wb-chev" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M3 4.5l3 3 3-3" /></svg>
      </button>
      {open && (
        <div className="wb-menu" role="menu">
          <div className="wb-menu-head"><span className="label">Connected</span><span className="num">{short(address)}</span></div>
          <button type="button" role="menuitem" onClick={copy}>{copied ? 'Copied' : 'Copy address'}</button>
          <a role="menuitem" href="/creators#claim" onClick={() => setOpen(false)}>Your coins &amp; fees</a>
          <button type="button" role="menuitem" className="wb-danger" onClick={() => (setOpen(false), disconnect())}>Disconnect</button>
        </div>
      )}
    </div>
  );
}
