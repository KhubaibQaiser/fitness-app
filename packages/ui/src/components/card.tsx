import { styled, YStack } from 'tamagui';

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBg',
  borderRadius: 16,
  padding: '$4',
  gap: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  shadowColor: 'rgba(0,0,0,0.06)',
  shadowOffset: { width: 0, height: 1 },
  shadowRadius: 3,
  shadowOpacity: 1,

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        pressStyle: { backgroundColor: '$elevatedBg', opacity: 1, scale: 1 },
        focusVisibleStyle: {
          outlineWidth: 2,
          outlineColor: '$focusRing',
          outlineStyle: 'solid',
        },
      },
    },
    elevated: {
      true: {
        shadowRadius: 8,
        shadowOpacity: 0.18,
        shadowOffset: { width: 0, height: 8 },
      },
    },
    tone: {
      default: {},
      danger: {
        backgroundColor: '$dangerMuted',
        borderColor: '$danger',
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
