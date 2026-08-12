import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import { type ReactNode } from 'react';
import { AppProviders } from '@gymos/app/provider';
import { NextTamaguiProvider } from '../components/next-tamagui-provider';
import './globals.css';

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  weight: ['400', '500', '700'],
});

export const metadata: Metadata = {
  title: 'GymOS Coach',
  description:
    'Coaching-first client management: vitals, adaptive goals, coach-reviewed meal plans.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'GymOS Coach', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" suppressHydrationWarning className={`${sans.variable} ${mono.variable}`}>
    <body style={{ margin: 0, WebkitFontSmoothing: 'antialiased' }}>
      <NextTamaguiProvider>
        <AppProviders>{children}</AppProviders>
      </NextTamaguiProvider>
    </body>
  </html>
);

export default RootLayout;
