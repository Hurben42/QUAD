'use client';
import { useState } from 'react';

const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/** The HYPE contract address as a small tag: shortened, full address in the tooltip, click to copy. */
export function CopyMint({ address, label }: { address: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }
  return (
    <button type="button" className="gh-ca" onClick={copy} title={address} aria-label={`Copy ${label}: ${address}`}>
      <span className="gh-ca-k">CA</span>
      <span className="num">{copied ? 'Copied to clipboard' : short(address)}</span>
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
        {copied ? <path d="M2.5 7.5l3 3 6-7" /> : <><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" /><path d="M9.5 2.5h-6a1 1 0 0 0-1 1v6" /></>}
      </svg>
    </button>
  );
}
