import { defaultConfig } from '@tamagui/config/v4';
import { createFont, isWeb } from 'tamagui';

/**
 * Cross-platform font faces.
 * Web: CSS vars from next/font (Roboto + Roboto Mono) — see apps/web/app/layout.tsx.
 * Native (P3): load the same families via expo-font / useFonts using `face` names.
 *
 * Roboto matches the TradeBlock MD3 typeface; Roboto Mono for stats / data.
 */
const robotoFace = {
  400: { normal: 'Roboto' },
  500: { normal: 'Roboto-Medium' },
  600: { normal: 'Roboto-Medium' },
  700: { normal: 'Roboto-Bold' },
  800: { normal: 'Roboto-Bold' },
  bold: { normal: 'Roboto-Bold' },
} as const;

const monoFace = {
  400: { normal: 'RobotoMono' },
  500: { normal: 'RobotoMono-Medium' },
  600: { normal: 'RobotoMono-Medium' },
  700: { normal: 'RobotoMono-Medium' },
  bold: { normal: 'RobotoMono-Medium' },
} as const;

const familyWeb = 'var(--font-sans), Roboto, ui-sans-serif, system-ui, sans-serif';
const familyNative = 'Roboto';
const monoWeb = 'var(--font-mono), "Roboto Mono", ui-monospace, monospace';
const monoNative = 'RobotoMono';

export const headingFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: defaultConfig.fonts.heading.size,
  lineHeight: defaultConfig.fonts.heading.lineHeight,
  weight: defaultConfig.fonts.heading.weight,
  letterSpacing: defaultConfig.fonts.heading.letterSpacing,
  face: robotoFace,
});

export const bodyFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  weight: defaultConfig.fonts.body.weight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: robotoFace,
});

export const monoFont = createFont({
  family: isWeb ? monoWeb : monoNative,
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  weight: defaultConfig.fonts.body.weight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: monoFace,
});
