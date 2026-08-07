import { defaultConfig } from '@tamagui/config/v4';
import { createFont, isWeb } from 'tamagui';

/**
 * Cross-platform font faces.
 * Web: CSS vars from next/font (Roboto) — see apps/web/app/layout.tsx.
 * Native (P3): load the same family via expo-font / useFonts using `face` names.
 *
 * Roboto matches the TradeBlock MD3 typeface (regular + medium weights).
 */
const robotoFace = {
  400: { normal: 'Roboto' },
  500: { normal: 'Roboto-Medium' },
  600: { normal: 'Roboto-Medium' },
  700: { normal: 'Roboto-Bold' },
  800: { normal: 'Roboto-Bold' },
  bold: { normal: 'Roboto-Bold' },
} as const;

const familyWeb = 'var(--font-sans), Roboto, ui-sans-serif, system-ui, sans-serif';
const familyNative = 'Roboto';

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
