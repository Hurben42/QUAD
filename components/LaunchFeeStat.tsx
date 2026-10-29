'use client';
import { useQuadConfig } from '@/lib/useQuadConfig';

/** The config's launch fee in SOL, read on-chain (creators section stat). */
export function LaunchFeeStat() {
  const { config } = useQuadConfig();
  const sol = config ? Number(config.poolCreationFee) / 1e9 : null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span className="num" style={{ fontSize: 28, lineHeight: '32px' }}>{sol === null ? '—' : sol}</span>
      <span className="label">SOL launch fee</span>
    </div>
  );
}
