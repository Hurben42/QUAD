import type { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';

/** A wallet's balance of one mint, in base units; 0 when it has no account for it. */
export async function tokenBalance(connection: Connection, mint: PublicKey, owner: PublicKey): Promise<bigint> {
  const info = await connection.getAccountInfo(mint);
  if (!info) return 0n;
  const ata = getAssociatedTokenAddressSync(mint, owner, false, info.owner);
  return connection.getTokenAccountBalance(ata).then((b) => BigInt(b.value.amount), () => 0n);
}
