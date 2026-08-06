import { styled, YStack } from 'tamagui';

/**
 * Page chrome. Bottom padding clears mobile tab bar; desktop shell zeros it
 * via `chrome="desktop"`. Always wrap loading/error inside Screen.
 */
export const Screen = styled(YStack, {
  name: 'Screen',
  flex: 1,
  backgroundColor: '$screenBg',
  paddingHorizontal: '$4',
  paddingTop: '$4',
  paddingBottom: 96,
  gap: '$4',
  width: '100%',
  alignSelf: 'stretch',
  maxWidth: 920,
  marginHorizontal: 'auto',

  variants: {
    chrome: {
      mobile: {
        paddingBottom: 96,
        maxWidth: 920,
      },
      desktop: {
        paddingBottom: '$6',
        maxWidth: 1100,
      },
      bare: {
        paddingBottom: '$4',
        maxWidth: 920,
      },
    },
    density: {
      comfortable: { gap: '$4' },
      compact: { gap: '$3' },
    },
  } as const,

  defaultVariants: {
    chrome: 'mobile',
    density: 'comfortable',
  },
});
