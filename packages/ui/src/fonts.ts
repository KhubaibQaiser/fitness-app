import { defaultConfig } from '@tamagui/config/v4';
import { createFont, isWeb } from 'tamagui';

/**
 * Cross-platform font faces.
 * Web: CSS vars from next/font (DM Sans) — see apps/web/app/layout.tsx.
 * Native (P3): load the same family via expo-font / useFonts using `face` names.
 *
 * One simple geometric sans for heading + body — readable, not elongated.
 */
const dmSansFace = {
  400: { normal: 'DMSans' },
  500: { normal: 'DMSans-Medium' },
  600: { normal: 'DMSans-SemiBold' },
  700: { normal: 'DMSans-Bold' },
  800: { normal: 'DMSans-Bold' },
  bold: { normal: 'DMSans-Bold' },
} as const;

const familyWeb = 'var(--font-sans), "DM Sans", ui-sans-serif, system-ui, sans-serif';
const familyNative = 'DMSans';

export const headingFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: defaultConfig.fonts.heading.size,
  lineHeight: defaultConfig.fonts.heading.lineHeight,
  weight: defaultConfig.fonts.heading.weight,
  letterSpacing: defaultConfig.fonts.heading.letterSpacing,
  face: dmSansFace,
});

export const bodyFont = createFont({
  family: isWeb ? familyWeb : familyNative,
  size: defaultConfig.fonts.body.size,
  lineHeight: defaultConfig.fonts.body.lineHeight,
  weight: defaultConfig.fonts.body.weight,
  letterSpacing: defaultConfig.fonts.body.letterSpacing,
  face: dmSansFace,
});
