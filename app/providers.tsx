'use client';
import { useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { QuadWalletModalProvider } from '@/components/WalletModal';

export function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL ?? 'https://api.mainnet-beta.solana.com';
  const wallets = useMemo(() => [], []); // wallet-standard wallets (Phantom, Backpack…) register themselves
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <QuadWalletModalProvider>{children}</QuadWalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
