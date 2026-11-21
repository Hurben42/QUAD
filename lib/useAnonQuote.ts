'use client';
import { useEffect, useState } from 'react';
import type { AnonQuote } from './anon';

let read: Promise<AnonQuote> | null = null;

/** The anonymous desk's quote (rate, launch cost, first-buy cap, delay), read once per page. */
export function useAnonQuote(enabled: boolean) {
  const [quote, setQuote] = useState<AnonQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    read ??= fetch('/api/anon/quote', { cache: 'no-store' })
      .then(async (r) => {
        const b = await r.json();
        if (!r.ok) throw new Error(b.error ?? r.statusText);
        return b as AnonQuote;
      })
      .catch((e) => {
        read = null;
        throw e;
      });
    read.then((q) => live && setQuote(q)).catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [enabled]);
  return { quote, error };
}
