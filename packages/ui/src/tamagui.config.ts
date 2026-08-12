/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access --
   @tamagui/config/v4's deep theme types don't resolve under eslint's project service;
   tsc verifies the resulting token types at every component use site. */
import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import manifest from '../../../infra/tenants/pilot.json';
import { bodyFont, headingFont, monoFont } from './fonts';

const brand = manifest.branding.colors;
const radius = manifest.branding.radius;

const radiusScale =
  radius === 'soft' ? { card: 16, control: 8, pill: 999 } : { card: 16, control: 8, pill: 999 };

export const config = createTamagui({
  ...defaultConfig,
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: monoFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      primary: '#00A872',
      primaryHover: '#00D68F',
      primaryFg: '#ffffff',
      accent: '#2E7DA8',
      accentFg: '#ffffff',
      screenBg: '#FFFFFF',
      cardBg: '#F3F5F9',
      elevatedBg: '#E8EBF0',
      sidebar: '#F3F5F9',
      borderColor: '#E0E0E0',
      borderColorHover: '#CCCCCC',
      color: '#111111',
      textMuted: '#666666',
      placeholderColor: '#999999',
      danger: '#E00020',
      dangerFg: '#ffffff',
      dangerMuted: '#FFE5E9',
      success: '#0EA600',
      successFg: '#ffffff',
      successMuted: '#E6F9E5',
      warning: '#D4A800',
      warningFg: '#111111',
      warningMuted: '#FFF8DB',
      info: '#5A8BA3',
      infoMuted: '#E5F0F6',
      focusRing: '#00A872',
      radiusCard: radiusScale.card,
      radiusControl: radiusScale.control,
    },
    dark: {
      ...defaultConfig.themes.dark,
      primary: brand.primary,
      primaryHover: '#00F19F',
      primaryFg: '#000000',
      accent: brand.accent,
      accentFg: '#ffffff',
      screenBg: '#0A0A0A',
      cardBg: '#111111',
      elevatedBg: '#1A1A1A',
      sidebar: '#0A0A0A',
      borderColor: '#222222',
      borderColorHover: '#444444',
      color: '#FFFFFF',
      textMuted: '#808080',
      placeholderColor: '#555555',
      danger: '#FF0026',
      dangerFg: '#ffffff',
      dangerMuted: '#2A0008',
      success: '#16EC06',
      successFg: '#000000',
      successMuted: '#0A2A08',
      warning: '#FFDE00',
      warningFg: '#000000',
      warningMuted: '#2A2500',
      info: '#7BA1BB',
      infoMuted: '#0F1E26',
      focusRing: '#00D68F',
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
