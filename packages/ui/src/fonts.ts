import { defaultConfig } from '@tamagui/config/v4';
import { createFont, isWeb } from 'tamagui';

/**
 * Cross-platform font faces.
 * Web: CSS vars from @gymos/ui/fonts.css (Fontsource Inter + Roboto Mono).
 * Native: load via expo-font / useFonts using `face` names.
 */
const interFace = {
  400: { normal: 'Inter' },
  500: { normal: 'Inter-Medium' },
  600: { normal: 'Inter-SemiBold' },
  700: { normal: 'Inter-Bold' },
  800: { normal: 'Inter-ExtraBold' },
  bold: { normal: 'Inter-Bold' },
} as const;

const monoFace = {
  400: { normal: 'RobotoMono' },
  500: { normal: 'RobotoMono-Medium' },
  600: { normal: 'RobotoMono-SemiBold' },
  700: { normal: 'RobotoMono-Bold' },
  bold: { normal: 'RobotoMono-Bold' },
} as const;

const familyWeb = 'var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif';
const familyNative = 'Inter';
const monoWeb = 'var(--font-mono), "Roboto Mono", ui-monospace, monospace';
const monoNative = 'RobotoMono';

const uiSizes = {
  ...defaultConfig.fonts.body.size,
  displayLarge: 30,
  title: 20,
  headline: 16,
  bodyDefault: 14,
  bodyMedium: 14,
  captionDefault: 12,
  captionMedium: 12,
} as const;

const uiLineHeights = {
  ...defaultConfig.fonts.body.lineHeight,
  displayLarge: 36,
  title: 26,
  headline: 22,
  bodyDefault: 22,
  bodyMedium: 20,
  captionDefault: 16,
  captionMedium: 16,
} as const;

const uiWeights = {
  ...defaultConfig.fonts.body.weight,
  displayLarge: '700',
  title: '700',
  headline: '600',
  bodyDefault: '400',
  bodyMedium: '500',
  captionDefault: '400',
  captionMedium: '500',
} as const;

const monoSizes = {
  ...defaultConfig.fonts.body.size,
  caption: 12,
  body: 14,
  statMd: 18,
  statLg: 24,
  display: 36,
} as const;

const monoLineHeights = {
  ...defaultConfig.fonts.body.lineHeight,
  caption: 16,
  body: 20,
  statMd: 24,
  statLg: 28,
  display: 40,
} as const;

const monoWeights = {
  ...defaultConfig.fonts.body.weight,
  caption: '400',
  body: '500',
  statMd: '600',
  statLg: '600',
  display: '700',
} as const;

export const headingFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: uiSizes,
  lineHeight: uiLineHeights,
  weight: uiWeights,
  letterSpacing: defaultConfig.fonts.heading.letterSpacing,
  face: interFace,
});

export const bodyFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: uiSizes,
  lineHeight: uiLineHeights,
  weight: uiWeights,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: interFace,
});

export const monoFont = createFont({
  family: isWeb ? monoWeb : monoNative,
  size: monoSizes,
  lineHeight: monoLineHeights,
  weight: monoWeights,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: monoFace,
});
