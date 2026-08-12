import { styled, YStack } from 'tamagui';

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBg',
  borderRadius: '$radiusCard',
  padding: '$4',
  gap: '$2',
  borderWidth: 0,

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        pressStyle: { opacity: 0.9, scale: 0.97 },
        focusVisibleStyle: {
          outlineWidth: 2,
          outlineColor: '$focusRing',
          outlineStyle: 'solid',
        },
      },
    },
    elevated: {
      true: {
        borderWidth: 1,
        borderColor: '$borderColor',
      },
    },
    tone: {
      default: {},
      danger: {
        backgroundColor: '$dangerMuted',
      },
      accent: {
        backgroundColor: '$elevatedBg',
      },
    },
  } as const,

  defaultVariants: {
    tone: 'default',
  },
});
