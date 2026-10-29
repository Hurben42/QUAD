'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WalletReadyState, type WalletName } from '@solana/wallet-adapter-base';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletModalContext } from '@solana/wallet-adapter-react-ui';
import { Stripes } from './Stripes';

const GET_WALLET = 'https://phantom.com/download';

/**
 * QUAD's wallet picker, in place of wallet-adapter's default modal. It serves the same
 * WalletModalContext, so useWalletModal().setVisible(true) opens it anywhere.
 * Header: poster A's era stripes, fading into the dark dialog surface.
 */
export function QuadWalletModalProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  return (
    <WalletModalContext.Provider value={{ visible, setVisible }}>
      {children}
      {visible && <WalletModal onClose={() => setVisible(false)} />}
    </WalletModalContext.Provider>
  );
}

function WalletModal({ onClose }: { onClose: () => void }) {
  const { wallets, wallet, select, connect } = useWallet();
  const dialog = useRef<HTMLDivElement>(null);

  // Detected wallets first; the rest are offered as installs.
  const [detected, others] = useMemo(() => {
    const ready = (s: WalletReadyState) => s === WalletReadyState.Installed || s === WalletReadyState.Loadable;
    return [wallets.filter((w) => ready(w.readyState)), wallets.filter((w) => w.readyState === WalletReadyState.NotDetected)];
  }, [wallets]);

  const choose = useCallback(
    (name: WalletName) => {
      // the provider auto-connects on a new selection; re-picking the current wallet needs an explicit connect
      if (wallet?.adapter.name === name) connect().catch(() => {});
      else select(name);
      onClose();
    },
    [wallet, select, connect, onClose],
  );

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    (dialog.current?.querySelector<HTMLElement>('.wm-item') ?? dialog.current?.querySelector<HTMLElement>('.wm-close'))?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !dialog.current) return;
      // keep focus inside the dialog
      const items = [...dialog.current.querySelectorAll<HTMLElement>('button, a[href]')];
      const [first, last] = [items[0], items[items.length - 1]];
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="wm-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={dialog} className="wm" role="dialog" aria-modal="true" aria-labelledby="wm-title">
        <header className="wm-head">
          <Stripes />
          <div className="wm-fade" aria-hidden="true" />
          <div className="wm-tags">
            <span className="label on-art">Wallet · Solana</span>
            <button type="button" className="wm-close" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true"><path d="M2 2l10 10M12 2L2 12" /></svg>
            </button>
          </div>
          <div className="wm-title">
            <h2 id="wm-title">Connect a wallet.</h2>
            <p>Launch, trade and claim with the wallet you choose. QUAD never holds your keys.</p>
          </div>
        </header>

        <div className="wm-body">
          {detected.length > 0 ? (
            <ul className="wm-list">
              {detected.map((w) => (
                <li key={w.adapter.name}>
                  <button type="button" className="wm-item" onClick={() => choose(w.adapter.name)}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={w.adapter.icon} alt="" width={28} height={28} />
                    <span className="wm-name">{w.adapter.name}</span>
                    <span className="label">Detected</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="wm-empty">No Solana wallet found in this browser.</p>
          )}
          {others.length > 0 && (
            <ul className="wm-list">
              {others.map((w) => (
                <li key={w.adapter.name}>
                  <a className="wm-item" href={w.adapter.url} target="_blank" rel="noopener">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={w.adapter.icon} alt="" width={28} height={28} />
                    <span className="wm-name">{w.adapter.name}</span>
                    <span className="label">Install ↗</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
          {detected.length === 0 && (
            <a className="q-btn q-btn--primary" href={GET_WALLET} target="_blank" rel="noopener">Get a wallet <span className="num">↗</span></a>
          )}
        </div>
      </div>
    </div>
  );
}
