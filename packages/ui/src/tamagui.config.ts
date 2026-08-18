/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access --
   @tamagui/config/v4's deep theme types don't resolve under eslint's project service;
   tsc verifies the resulting token types at every component use site. */
import { defaultConfig } from '@tamagui/config/v4';
import { createTamagui } from 'tamagui';
import manifest from '../../../infra/tenants/pilot.json';
import { DESKTOP_MIN_WIDTH_PX } from './breakpoints';
import { bodyFont, headingFont, monoFont } from './fonts';

const brand = manifest.branding.colors;

const primitiveColors = {
  zinc50: '#FAFAFA',
  zinc100: '#F4F4F5',
  zinc200: '#E4E4E7',
  zinc300: '#D4D4D8',
  zinc400: '#A1A1AA',
  zinc500: '#71717A',
  zinc600: '#52525B',
  zinc800: '#27272A',
  zinc900: '#18181B',
  zinc950: '#09090B',
  blue50: '#EFF6FF',
  blue300: '#93C5FD',
  blue400: '#60A5FA',
  blue600: '#2563EB',
  blue700: '#1D4ED8',
  blue950: '#172554',
  sky400: '#38BDF8',
  sky500: '#0EA5E9',
  rose50: '#FFF1F2',
  rose300: '#FDA4AF',
  rose400: '#FB7185',
  rose500: '#F43F5E',
  rose600: '#E11D48',
  rose700: '#BE123C',
  rose950: '#4C0519',
  orange300: '#FDBA74',
  orange400: '#FB923C',
  amber50: '#FFFBEB',
  amber200: '#FDE68A',
  amber300: '#FCD34D',
  amber400: '#FBBF24',
  amber500: '#F59E0B',
  amber700: '#B45309',
  amber950: '#451A03',
  red50: '#FEF2F2',
  red300: '#FCA5A5',
  red400: '#F87171',
  red500: '#EF4444',
  red700: '#B91C1C',
  red950: '#450A0A',
  white: '#FFFFFF',
  coachCanvasTintLight: '#F5F8FF',
  coachCanvasTintDark: '#0B1220',
  clientCanvasTintLight: '#FFF8F5',
  clientCanvasTintDark: '#150F14',
} as const;

const lightSemantics = {
  canvas: primitiveColors.zinc50,
  surface: primitiveColors.white,
  border: primitiveColors.zinc200,
  textPrimary: primitiveColors.zinc900,
  textSecondary: primitiveColors.zinc500,
  textFaint: primitiveColors.zinc400,
  surfaceHover: primitiveColors.zinc100,
  chipText: primitiveColors.zinc600,
  track: primitiveColors.zinc200,
  alertText: primitiveColors.red500,
  alertWash: primitiveColors.red50,
  alertWashText: primitiveColors.red700,
  milestoneFill: primitiveColors.amber500,
  milestoneText: primitiveColors.amber700,
  milestoneWash: primitiveColors.amber50,
  milestoneStroke1: primitiveColors.amber400,
  milestoneStroke2: primitiveColors.amber500,
} as const;

const darkSemantics = {
  canvas: primitiveColors.zinc950,
  surface: primitiveColors.zinc900,
  border: primitiveColors.zinc800,
  textPrimary: primitiveColors.zinc50,
  textSecondary: primitiveColors.zinc400,
  textFaint: primitiveColors.zinc600,
  surfaceHover: primitiveColors.zinc800,
  chipText: primitiveColors.zinc300,
  track: primitiveColors.zinc800,
  alertText: primitiveColors.red400,
  alertWash: primitiveColors.red950,
  alertWashText: primitiveColors.red300,
  milestoneFill: primitiveColors.amber500,
  milestoneText: primitiveColors.amber300,
  milestoneWash: primitiveColors.amber950,
  milestoneStroke1: primitiveColors.amber200,
  milestoneStroke2: primitiveColors.amber400,
} as const;

const coachLightRole = {
  accentBg: brand.primary,
  accentText: primitiveColors.blue700,
  accentWash: primitiveColors.blue50,
  accentWashText: primitiveColors.blue700,
  weaveStroke1: primitiveColors.sky500,
  weaveStroke2: primitiveColors.blue600,
  gradientStart: primitiveColors.sky500,
  gradientEnd: primitiveColors.blue600,
  canvasTint: primitiveColors.coachCanvasTintLight,
} as const;

const coachDarkRole = {
  accentBg: brand.primary,
  accentText: primitiveColors.blue400,
  accentWash: primitiveColors.blue950,
  accentWashText: primitiveColors.blue300,
  weaveStroke1: primitiveColors.sky400,
  weaveStroke2: primitiveColors.blue400,
  gradientStart: primitiveColors.sky400,
  gradientEnd: primitiveColors.blue400,
  canvasTint: primitiveColors.coachCanvasTintDark,
} as const;

const clientLightRole = {
  accentBg: primitiveColors.rose600,
  accentText: primitiveColors.rose600,
  accentWash: primitiveColors.rose50,
  accentWashText: primitiveColors.rose700,
  weaveStroke1: primitiveColors.orange400,
  weaveStroke2: primitiveColors.rose500,
  gradientStart: primitiveColors.orange400,
  gradientEnd: primitiveColors.rose500,
  canvasTint: primitiveColors.clientCanvasTintLight,
} as const;

const clientDarkRole = {
  accentBg: primitiveColors.rose600,
  accentText: primitiveColors.rose400,
  accentWash: primitiveColors.rose950,
  accentWashText: primitiveColors.rose300,
  weaveStroke1: primitiveColors.orange300,
  weaveStroke2: primitiveColors.rose400,
  gradientStart: primitiveColors.orange300,
  gradientEnd: primitiveColors.rose400,
  canvasTint: primitiveColors.clientCanvasTintDark,
} as const;

type SemanticColors = { [Key in keyof typeof lightSemantics]: string };
type RoleColors = { [Key in keyof typeof coachLightRole]: string };

const clientRoleAliases = (role: RoleColors) => ({
  clientAccentBg: role.accentBg,
  clientAccentText: role.accentText,
  clientAccentWash: role.accentWash,
  clientAccentWashText: role.accentWashText,
  clientWeaveStroke1: role.weaveStroke1,
  clientWeaveStroke2: role.weaveStroke2,
  clientGradientStart: role.gradientStart,
  clientGradientEnd: role.gradientEnd,
  clientCanvasTint: role.canvasTint,
});

const legacyAliases = (semantics: SemanticColors, role: RoleColors, mode: 'light' | 'dark') => ({
  primary: role.accentBg,
  primaryHover: mode === 'light' ? primitiveColors.blue600 : primitiveColors.blue400,
  primaryFg: primitiveColors.white,
  primaryMuted: role.accentWash,
  accent: role.accentText,
  accentFg: primitiveColors.white,
  screenBg: role.canvasTint,
  cardBg: semantics.surface,
  elevatedBg: semantics.surfaceHover,
  sidebar: semantics.surface,
  borderColor: semantics.border,
  borderColorHover: mode === 'light' ? primitiveColors.zinc300 : primitiveColors.zinc600,
  color: semantics.textPrimary,
  textMuted: semantics.textSecondary,
  placeholderColor: semantics.textFaint,
  danger: semantics.alertText,
  dangerFg: primitiveColors.white,
  dangerMuted: semantics.alertWash,
  success: mode === 'light' ? '#0EA600' : '#16EC06',
  successFg: mode === 'light' ? primitiveColors.white : primitiveColors.zinc950,
  successMuted: mode === 'light' ? '#E6F9E5' : '#0A2A08',
  warning: semantics.milestoneFill,
  warningFg: mode === 'light' ? primitiveColors.zinc900 : primitiveColors.zinc950,
  warningMuted: semantics.milestoneWash,
  milestoneMuted: semantics.milestoneWash,
  info: role.accentText,
  infoMuted: role.accentWash,
  focusRing: role.accentText,
  coachAccentWash: role.accentWash,
  coachAccentText: role.accentText,
  coachCanvas: role.canvasTint,
  radiusCard: 16,
  radiusControl: 8,
});

export const elevationTokens = {
  card: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
  overlay: '0 8px 24px -4px rgba(0, 0, 0, 0.18)',
} as const;

export const config = createTamagui({
  ...defaultConfig,
  media: {
    ...defaultConfig.media,
    md: { minWidth: DESKTOP_MIN_WIDTH_PX },
    maxMd: { maxWidth: DESKTOP_MIN_WIDTH_PX },
  },
  tokens: {
    ...defaultConfig.tokens,
    color: primitiveColors,
    space: {
      ...defaultConfig.tokens.space,
      '2xs': 2,
      xs: 4,
      sm: 6,
      md: 8,
      lg: 10,
      xl: 12,
      '2xl': 14,
      '3xl': 16,
      '4xl': 20,
      '5xl': 24,
      '6xl': 32,
      '7xl': 40,
      '8xl': 48,
      '9xl': 64,
    },
    radius: {
      ...defaultConfig.tokens.radius,
      md: 8,
      lg: 12,
      xl: 16,
      '2xl': 24,
      full: 999,
      card: 16,
      control: 8,
      pill: 999,
    },
  },
  fonts: {
    heading: headingFont,
    body: bodyFont,
    mono: monoFont,
  },
  themes: {
    ...defaultConfig.themes,
    light: {
      ...defaultConfig.themes.light,
      ...lightSemantics,
      ...coachLightRole,
      ...legacyAliases(lightSemantics, coachLightRole, 'light'),
      ...clientRoleAliases(clientLightRole),
    },
    dark: {
      ...defaultConfig.themes.dark,
      ...darkSemantics,
      ...coachDarkRole,
      ...legacyAliases(darkSemantics, coachDarkRole, 'dark'),
      ...clientRoleAliases(clientDarkRole),
    },
    light_coach: {
      ...coachLightRole,
      ...legacyAliases(lightSemantics, coachLightRole, 'light'),
    },
    dark_coach: {
      ...coachDarkRole,
      ...legacyAliases(darkSemantics, coachDarkRole, 'dark'),
    },
    light_client: {
      ...clientLightRole,
      ...legacyAliases(lightSemantics, clientLightRole, 'light'),
    },
    dark_client: {
      ...clientDarkRole,
      ...legacyAliases(darkSemantics, clientDarkRole, 'dark'),
    },
  },
  settings: {
    ...defaultConfig.settings,
    onlyAllowShorthands: false,
  },
});

export type AppConfig = typeof config;

export default config;
