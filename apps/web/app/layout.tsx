import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { type ReactNode } from 'react';
import { AppProviders } from '@gymos/app/provider';
import { NextTamaguiProvider } from '../components/next-tamagui-provider';
import './globals.css';

/** Single clean sans for UI — compact, not elongated like Syne. */
const sans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: 'GymOS Coach',
  description: 'Coaching-first client management: vitals, adaptive goals, AI meal plans.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'GymOS Coach', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // WCAG: allow pinch-zoom (do not lock maximumScale)
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#0f766e' },
    { media: '(prefers-color-scheme: dark)', color: '#070b0a' },
  ],
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" suppressHydrationWarning className={sans.variable}>
    <body style={{ margin: 0, WebkitFontSmoothing: 'antialiased' }}>
      <NextTamaguiProvider>
        <AppProviders>{children}</AppProviders>
      </NextTamaguiProvider>
    </body>
  </html>
);

export default RootLayout;
