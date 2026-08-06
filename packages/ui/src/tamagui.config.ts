/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access --
   @tamagui/config/v4's deep theme types don't resolve under eslint's project service;
   tsc verifies the resulting token types at every component use site. */
import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import manifest from '../../../infra/tenants/pilot.json';

/**
 * Design system config. Brand colors flow from the tenant manifest at build
 * time (config-not-code; P0 moves this to a runtime loader). Light + dark
 * ship together — dark is not an afterthought.
 */
const brand = manifest.branding.colors;

export const config = createTamagui({
  ...defaultConfig,
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      primary: brand.primary,
      primaryFg: '#ffffff',
      accent: brand.accent,
      screenBg: '#f7f8f7',
      cardBg: '#ffffff',
      textMuted: '#5f6b66',
      danger: '#dc2626',
      success: '#16a34a',
      warning: '#d97706',
    },
    dark: {
      ...defaultConfig.themes.dark,
      primary: '#2dd4bf',
      primaryFg: '#04211d',
      accent: brand.accent,
      screenBg: '#0c1211',
      cardBg: '#161d1b',
      textMuted: '#93a29c',
      danger: '#f87171',
      success: '#4ade80',
      warning: '#fbbf24',
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
});

export type AppConfig = typeof config;

export default config;
