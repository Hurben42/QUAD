/** Solana Explorer links, on the cluster the app is configured for. */
const CLUSTER = process.env.NEXT_PUBLIC_CLUSTER ?? 'mainnet-beta';
const suffix = CLUSTER === 'mainnet-beta' ? '' : `?cluster=${CLUSTER}`;

export const explorerAddress = (address: string) => `https://explorer.solana.com/address/${address}${suffix}`;
export const explorerTx = (signature: string) => `https://explorer.solana.com/tx/${signature}${suffix}`;
