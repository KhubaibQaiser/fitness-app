import { defaultConfig } from '@tamagui/config/v4';
import { createFont, isWeb } from 'tamagui';

/**
 * Cross-platform font faces.
 * Web: CSS vars from @gymos/ui/fonts.css (Fontsource Inter + JetBrains Mono).
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
  400: { normal: 'JetBrainsMono' },
  500: { normal: 'JetBrainsMono-Medium' },
  600: { normal: 'JetBrainsMono-Medium' },
  700: { normal: 'JetBrainsMono-Bold' },
  bold: { normal: 'JetBrainsMono-Bold' },
} as const;

const familyWeb = 'var(--font-sans), Inter, ui-sans-serif, system-ui, sans-serif';
const familyNative = 'Inter';
const monoWeb = 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace';
const monoNative = 'JetBrainsMono';

export const headingFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: defaultConfig.fonts.heading.size,
  lineHeight: defaultConfig.fonts.heading.lineHeight,
  weight: defaultConfig.fonts.heading.weight,
  letterSpacing: defaultConfig.fonts.heading.letterSpacing,
  face: interFace,
});

export const bodyFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  weight: defaultConfig.fonts.body.weight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: interFace,
});

export const monoFont = createFont({
  family: isWeb ? monoWeb : monoNative,
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  weight: defaultConfig.fonts.body.weight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: monoFace,
});
