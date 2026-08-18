import type { Metadata, Viewport } from 'next';
import { cookies } from 'next/headers';
import { type ReactNode } from 'react';
import { AppProviders } from '@gymos/app/provider';
import { parseThemeMode, THEME_MODE_KEY, themeBootstrapScript } from '@gymos/platform';
import { NextTamaguiProvider } from '../components/next-tamagui-provider';
import './globals.css';

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

const RootLayout = async ({ children }: { children: ReactNode }) => {
  const jar = await cookies();
  const initialTheme = parseThemeMode(jar.get(THEME_MODE_KEY)?.value);

  return (
    <html
      lang="en"
      suppressHydrationWarning
      {...(initialTheme !== null ? { 'data-theme': initialTheme } : {})}
      style={initialTheme !== null ? { colorScheme: initialTheme } : undefined}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript() }} />
      </head>
      <body style={{ margin: 0, WebkitFontSmoothing: 'antialiased' }}>
        <NextTamaguiProvider {...(initialTheme !== null ? { initialTheme } : {})}>
          <AppProviders>{children}</AppProviders>
        </NextTamaguiProvider>
      </body>
    </html>
  );
};

export default RootLayout;
