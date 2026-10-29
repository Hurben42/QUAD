'use client';
import { useState } from 'react';

/** A mint address in mono with a copy button. */
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
    <div className="gh-mint">
      <span className="label">{label}</span>
      <code className="num">{address}</code>
      <button type="button" onClick={copy} aria-label={`Copy ${label}`}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}
