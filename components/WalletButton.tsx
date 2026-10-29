'use client';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Button } from './Button';

const short = (s: string) => `${s.slice(0, 4)}…${s.slice(-4)}`;

/** Connect / connected state: primary by default, secondary next to another primary button (the header's Launch). */
export function WalletButton({ style, variant = 'primary' }: { style?: React.CSSProperties; variant?: 'primary' | 'secondary' }) {
  const { publicKey, disconnect, connecting } = useWallet();
  const { setVisible } = useWalletModal();
  if (publicKey)
    return (
      <Button variant="secondary" style={style} onClick={() => disconnect()} title="Disconnect">
        <span className="num">{short(publicKey.toBase58())}</span>
      </Button>
    );
  return <Button variant={variant} style={style} onClick={() => setVisible(true)} disabled={connecting}>{connecting ? 'Connecting…' : 'Connect wallet'}</Button>;
}
