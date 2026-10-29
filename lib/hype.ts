import { Connection, PublicKey } from '@solana/web3.js';
import { getMint, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID } from '@solana/spl-token';

/** HYPE on Solana (Hyperliquid, bridged via Wormhole NTT). */
export const HYPE_MINT = new PublicKey('98sMhvDwXj1RQi5c5Mndm3vPe9cBqPrbLaufMXFNMh5g');

export type QuoteMintInfo = { mint: PublicKey; decimals: number; tokenType: 0 | 1 };

/** Read decimals and token program on-chain. Never hard-code them. */
export async function readQuoteMint(connection: Connection, mint: PublicKey = HYPE_MINT): Promise<QuoteMintInfo> {
  const info = await connection.getAccountInfo(mint);
  if (!info) throw new Error(`quote mint ${mint.toBase58()} not found on this cluster`);
  const is2022 = info.owner.equals(TOKEN_2022_PROGRAM_ID);
  if (!is2022 && !info.owner.equals(TOKEN_PROGRAM_ID)) throw new Error('quote mint is not an SPL token');
  const m = await getMint(connection, mint, 'confirmed', is2022 ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID);
  return { mint, decimals: m.decimals, tokenType: is2022 ? 1 : 0 };
}

export const formatHype = (lamports: bigint, decimals: number, digits = 2) =>
  `${(Number(lamports) / 10 ** decimals).toFixed(digits)} HYPE`;
