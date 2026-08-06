import { styled, YStack } from 'tamagui';

export const Card = styled(YStack, {
  name: 'Card',
  backgroundColor: '$cardBg',
  borderRadius: 16,
  padding: '$4',
  gap: '$2',
  borderWidth: 1,
  borderColor: '$borderColor',
  shadowColor: 'rgba(0,0,0,0.12)',
  shadowRadius: 12,
  shadowOffset: { width: 0, height: 4 },
  elevation: 2,

  variants: {
    interactive: {
      true: {
        cursor: 'pointer',
        hoverStyle: {
          borderColor: '$borderColorHover',
          backgroundColor: '$elevatedBg',
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
        borderWidth: 2,
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
