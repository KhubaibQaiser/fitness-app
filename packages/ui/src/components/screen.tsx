import { styled, YStack } from 'tamagui';

/**
 * Page chrome. Kit content inset: $5 mobile / $8 desktop.
 * Strip headers (Home, Client hub) use paddingHorizontal={0} on Screen and
 * apply the same inset on both the strip and the body so edges align.
 */
export const Screen = styled(YStack, {
  name: 'Screen',
  flex: 1,
  backgroundColor: '$screenBg',
  paddingHorizontal: '$5',
  paddingTop: '$5',
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
        paddingHorizontal: '$5',
      },
      desktop: {
        paddingBottom: '$6',
        maxWidth: 1100,
        paddingHorizontal: '$8',
      },
      bare: {
        paddingBottom: '$4',
        maxWidth: 920,
        paddingHorizontal: '$5',
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
