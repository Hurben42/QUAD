'use client';
import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import { QUOTE_MINT } from './dbc';
import type { QuadConfigView } from './useQuadConfig';

/** The connected wallet's HYPE balance in quote lamports (0 without a token account); null while unknown. */
export function useQuoteBalance(config: QuadConfigView | null) {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  useEffect(() => {
    if (!publicKey || !config) return setBalance(null);
    let live = true;
    const program = config.quoteTokenType === 1 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
    const ata = getAssociatedTokenAddressSync(QUOTE_MINT, publicKey, false, program);
    connection
      .getTokenAccountBalance(ata)
      .then((b) => live && setBalance(BigInt(b.value.amount)))
      .catch(() => live && setBalance(0n));
    return () => {
      live = false;
    };
  }, [connection, publicKey, config]);
  return balance;
}
