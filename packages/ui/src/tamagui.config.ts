/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access --
   @tamagui/config/v4's deep theme types don't resolve under eslint's project service;
   tsc verifies the resulting token types at every component use site. */
import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import manifest from '../../../infra/tenants/pilot.json';
import { bodyFont, headingFont } from './fonts';

/**
 * Design system config. Brand colors flow from the tenant manifest at build
 * time (config-not-code; P0 moves this to a runtime loader).
 *
 * Athletic tone: high-contrast surfaces, punchy primary/accent, WCAG-minded
 * muted text. Light + dark ship together and persist via ThemeModeProvider.
 */
const brand = manifest.branding.colors;
const radius = manifest.branding.radius; // 'soft' | future variants

const radiusScale =
  radius === 'soft' ? { card: 16, control: 12, pill: 999 } : { card: 8, control: 6, pill: 999 };

export const config = createTamagui({
  ...defaultConfig,
  fonts: {
    heading: headingFont,
    body: bodyFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      // Brand
      primary: brand.primary,
      primaryHover: '#0d9488',
      primaryFg: '#ffffff',
      accent: brand.accent,
      accentFg: '#1c1200',
      // Surfaces — cool athletic gray, not washed cream
      screenBg: '#e8ece9',
      cardBg: '#ffffff',
      elevatedBg: '#f4f6f5',
      borderColor: '#c5d0cd',
      borderColorHover: '#9aaba3',
      // Text — muted tuned for ≥4.5:1 on screenBg/cardBg
      color: '#0b1412',
      textMuted: '#3d4f48',
      placeholderColor: '#5a6e66',
      // Status
      danger: '#b91c1c',
      dangerFg: '#ffffff',
      success: '#15803d',
      successFg: '#ffffff',
      warning: '#b45309',
      warningFg: '#ffffff',
      focusRing: brand.primary,
      // Radius semantic aliases consumed by primitives
      radiusCard: radiusScale.card,
      radiusControl: radiusScale.control,
    },
    dark: {
      ...defaultConfig.themes.dark,
      primary: '#2dd4bf',
      primaryHover: '#5eead4',
      primaryFg: '#042f2e',
      accent: '#fbbf24',
      accentFg: '#1c1200',
      screenBg: '#070b0a',
      cardBg: '#121a18',
      elevatedBg: '#1a2421',
      borderColor: '#2a3834',
      borderColorHover: '#3d524c',
      color: '#f0f7f4',
      textMuted: '#a8bbb4',
      placeholderColor: '#7d9189',
      danger: '#f87171',
      dangerFg: '#1f0505',
      success: '#4ade80',
      successFg: '#052e14',
      warning: '#fbbf24',
      warningFg: '#1c1200',
      focusRing: '#2dd4bf',
      radiusCard: radiusScale.card,
      radiusControl: radiusScale.control,
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
});

export type AppConfig = typeof config;

export default config;
