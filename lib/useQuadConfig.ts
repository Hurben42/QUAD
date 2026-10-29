'use client';
import { useEffect, useState } from 'react';
import type { Connection } from '@solana/web3.js';
import { useConnection } from '@solana/wallet-adapter-react';
import { DBC_CONFIG, QUOTE_MINT, makeClient } from './dbc';
import { readQuoteMint } from './hype';

export type QuadConfigView = {
  quoteDecimals: number;
  /** 0 = SPL Token, 1 = Token-2022, read on-chain */
  quoteTokenType: 0 | 1;
  /** HYPE lamports to graduate */
  threshold: bigint;
  /** SOL lamports charged per launch by the config (0 = none) */
  poolCreationFee: bigint;
};

// One read per RPC endpoint, shared by every component on the page (the public RPC rate-limits hard).
const reads = new Map<string, Promise<QuadConfigView>>();
function readConfig(connection: Connection): Promise<QuadConfigView> {
  let p = reads.get(connection.rpcEndpoint);
  if (!p) {
    p = Promise.all([readQuoteMint(connection, QUOTE_MINT), makeClient(connection).state.getPoolConfig(DBC_CONFIG)]).then(([quote, cfg]) => {
      if (!cfg) throw new Error(`QUAD config ${DBC_CONFIG.toBase58()} not found on this cluster`);
      return {
        quoteDecimals: quote.decimals,
        quoteTokenType: quote.tokenType,
        threshold: BigInt(cfg.migrationQuoteThreshold.toString()),
        poolCreationFee: BigInt(cfg.poolCreationFee.toString()),
      };
    });
    p.catch(() => reads.delete(connection.rpcEndpoint)); // retry on the next mount after a failure
    reads.set(connection.rpcEndpoint, p);
  }
  return p;
}

/** What a launch depends on, read from chain: quote decimals and the config's threshold and launch fee. */
export function useQuadConfig() {
  const { connection } = useConnection();
  const [config, setConfig] = useState<QuadConfigView | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    readConfig(connection)
      .then((c) => live && setConfig(c))
      .catch((e) => live && setError(String(e)));
    return () => {
      live = false;
    };
  }, [connection]);
  return { config, error };
}
