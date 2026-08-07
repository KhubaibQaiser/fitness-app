import { styled, YStack } from 'tamagui';

/** Flat bordered card (kit) — no heavy elevation shadow. */
export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBg',
  borderRadius: '$radiusCard',
  padding: '$4',
  gap: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        hoverStyle: {
          borderColor: '$primary',
        },
        pressStyle: { opacity: 0.92, scale: 0.995 },
        focusVisibleStyle: {
          outlineWidth: 2,
          outlineColor: '$focusRing',
          outlineStyle: 'solid',
        },
      },
    },
    tone: {
      default: {},
      danger: {
        borderColor: '$danger',
        borderWidth: 1,
      },
      accent: {
        borderColor: '$accent',
        borderWidth: 1,
      },
    },
  } as const,

  defaultVariants: {
    tone: 'default',
  },
});
