'use client';
import { useState } from 'react';

/** The HYPE contract address as a tag: CA chip, the full address (ellipsis when narrow), a copy button. */
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
      <span className="num gh-ca-addr">{copied ? 'Copied to clipboard' : address}</span>
      <span className="gh-ca-copy" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
          {copied ? <path d="M2.5 7.5l3 3 6-7" /> : <><rect x="4.5" y="4.5" width="7" height="7" rx="1.5" /><path d="M9.5 2.5h-6a1 1 0 0 0-1 1v6" /></>}
        </svg>
      </span>
    </button>
  );
}
