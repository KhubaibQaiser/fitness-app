import type { Metadata, Viewport } from 'next';
import { type ReactNode } from 'react';
import { AppProviders } from '@gymos/app/provider';
import { NextTamaguiProvider } from '../components/next-tamagui-provider';

export const metadata: Metadata = {
  title: 'GymOS Coach',
  description: 'Coaching-first client management: vitals, adaptive goals, AI meal plans.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'GymOS Coach', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f766e',
};

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" suppressHydrationWarning>
    <body style={{ margin: 0, WebkitFontSmoothing: 'antialiased' }}>
      <NextTamaguiProvider>
        <AppProviders>{children}</AppProviders>
      </NextTamaguiProvider>
    </body>
  </html>
);

export default RootLayout;
