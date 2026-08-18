import { styled, YStack } from 'tamagui';

export const Screen = styled(YStack, {
  name: 'Screen',
  flex: 1,
  backgroundColor: '$screenBg',
  paddingHorizontal: '$4',
  paddingTop: '$5',
  paddingBottom: 96,
  gap: '$4',
  width: '100%',
  alignSelf: 'stretch',

  variants: {
    chrome: {
      mobile: {
        paddingBottom: 96,
        paddingHorizontal: '$4',
        $md: {
          paddingBottom: '$6',
          paddingHorizontal: '$8',
        },
      },
      desktop: {
        paddingBottom: '$6',
        paddingHorizontal: '$8',
      },
      bare: {
        paddingBottom: '$4',
        paddingHorizontal: '$4',
        $md: {
          paddingHorizontal: '$8',
        },
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
