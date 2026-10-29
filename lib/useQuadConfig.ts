'use client';
import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { DBC_CONFIG, QUOTE_MINT, makeClient } from './dbc';
import { readQuoteMint } from './hype';

export type QuadConfigView = {
  quoteDecimals: number;
  /** HYPE lamports to graduate */
  threshold: bigint;
  /** SOL lamports charged per launch by the config (0 = none) */
  poolCreationFee: bigint;
};

/** What a launch depends on, read from chain: quote decimals and the config's threshold and launch fee. */
export function useQuadConfig() {
  const { connection } = useConnection();
  const [config, setConfig] = useState<QuadConfigView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    Promise.all([readQuoteMint(connection, QUOTE_MINT), makeClient(connection).state.getPoolConfig(DBC_CONFIG)])
      .then(([quote, cfg]) => {
        if (!cfg) throw new Error(`QUAD config ${DBC_CONFIG.toBase58()} not found on this cluster`);
        if (live)
          setConfig({
            quoteDecimals: quote.decimals,
            threshold: BigInt(cfg.migrationQuoteThreshold.toString()),
            poolCreationFee: BigInt(cfg.poolCreationFee.toString()),
          });
      })
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [connection]);
  return { config, error };
}
