import type { Metadata } from 'next';
import { CREATOR_FEE, TOTAL_COINS, coins, pct } from '@/lib/curve';
import { Manrope, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const manrope = Manrope({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-manrope' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['600'], variable: '--font-jetbrains' });

export const metadata: Metadata = {
  title: 'QUAD — Four eras. Priced in HYPE.',
  description: `Launch a coin on Solana: ${coins(TOTAL_COINS)} coins minted once, traded against HYPE on a four-era curve. Creators earn ${pct(CREATOR_FEE)} of every trade, in HYPE.`,
  icons: { icon: '/brand/quad-app-icon.svg' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${manrope.variable} ${mono.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
