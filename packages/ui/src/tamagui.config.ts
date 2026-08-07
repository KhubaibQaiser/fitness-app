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
 * MD3-inspired blue/violet brand (TradeBlock palette mapped to Tamagui roles).
 * Light + dark ship together and persist via ThemeModeProvider.
 */
const brand = manifest.branding.colors;
const radius = manifest.branding.radius; // 'soft' | future variants

const radiusScale =
  radius === 'soft' ? { card: 8, control: 4, pill: 999 } : { card: 8, control: 4, pill: 999 };

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
      primaryHover: '#3376D3',
      primaryFg: '#ffffff',
      accent: brand.accent,
      accentFg: '#ffffff',
      // Surfaces — MD3 background / surface / surfaceContainer
      screenBg: '#FEFBFF',
      cardBg: '#FAF9FD',
      elevatedBg: '#EFEDF1',
      borderColor: '#C4C6D0',
      borderColorHover: '#74777F',
      // Text — onSurface / onSurfaceVariant / outline
      color: '#1B1B1F',
      textMuted: '#44474E',
      placeholderColor: '#74777F',
      // Status
      danger: '#C00011',
      dangerFg: '#ffffff',
      success: '#1AC057',
      successFg: '#ffffff',
      warning: '#E7B008',
      warningFg: '#1B1B1F',
      focusRing: brand.primary,
      // Radius semantic aliases consumed by primitives
      radiusCard: radiusScale.card,
      radiusControl: radiusScale.control,
    },
    dark: {
      ...defaultConfig.themes.dark,
      primary: '#AAC7FF',
      primaryHover: '#7AACFF',
      primaryFg: '#003064',
      accent: '#C2C1FF',
      accentFg: '#20198F',
      screenBg: '#1B1B1F',
      cardBg: '#121316',
      elevatedBg: '#1F1F23',
      borderColor: '#44474E',
      borderColorHover: '#8E9099',
      color: '#E3E2E6',
      textMuted: '#C4C6D0',
      placeholderColor: '#8E9099',
      danger: '#FFB4AB',
      dangerFg: '#690005',
      success: '#3BE362',
      successFg: '#00390F',
      warning: '#ECC306',
      warningFg: '#3B2F00',
      focusRing: '#AAC7FF',
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
