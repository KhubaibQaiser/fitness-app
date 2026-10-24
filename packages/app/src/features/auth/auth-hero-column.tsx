import { Image, YStack } from '@gymos/ui';

const HERO_ALT = 'Illustrated mat, dumbbells, bottle, and progress phone';

export const AuthHeroColumn = () => (
  <YStack display="none" flex={1} position="relative" overflow="hidden" $md={{ display: 'flex' }}>
    <Image
      source={{ uri: '/auth/hero.jpg' }}
      accessibilityLabel={HERO_ALT}
      resizeMode="cover"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
      }}
    />
  </YStack>
);
