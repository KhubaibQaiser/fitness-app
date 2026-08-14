'use client';

import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import {
  AppErrorBoundary,
  FadeIn,
  Muted,
  PrimaryButton,
  Screen,
  Text,
  Title,
  XStack,
  YStack,
} from '@gymos/ui';

const RING = 220;
const MID = 160;
const CORE = 104;

const MissedMark = () => (
  <YStack
    width={RING}
    height={RING}
    alignItems="center"
    justifyContent="center"
    accessibilityLabel="404"
  >
    <YStack
      position="absolute"
      width={RING}
      height={RING}
      borderRadius={999}
      borderWidth={1}
      borderColor="$borderColor"
    />
    <YStack
      position="absolute"
      width={MID}
      height={MID}
      borderRadius={999}
      borderWidth={1}
      borderColor="$primary"
      opacity={0.4}
    />
    <YStack
      position="absolute"
      width={MID}
      height={MID}
      borderRadius={999}
      opacity={0.08}
      backgroundColor="$primary"
    />
    <YStack
      position="absolute"
      width={CORE}
      height={CORE}
      borderRadius={999}
      backgroundColor="$elevatedBg"
    />
    <YStack
      position="absolute"
      top={-4}
      width={8}
      height={8}
      borderRadius={999}
      backgroundColor="$primary"
    />
    <XStack alignItems="baseline" gap={2}>
      <Text
        fontFamily="$mono"
        fontSize={48}
        fontWeight="700"
        color="$color"
        letterSpacing={-1.2}
        lineHeight={52}
      >
        4
      </Text>
      <Text
        fontFamily="$mono"
        fontSize={48}
        fontWeight="700"
        color="$primary"
        letterSpacing={-1.2}
        lineHeight={52}
      >
        0
      </Text>
      <Text
        fontFamily="$mono"
        fontSize={48}
        fontWeight="700"
        color="$color"
        letterSpacing={-1.2}
        lineHeight={52}
      >
        4
      </Text>
    </XStack>
  </YStack>
);

const NotFoundBody = () => {
  const router = useRouter();

  return (
    <Screen chrome="bare" justifyContent="center" minHeight="100%" backgroundColor="$screenBg">
      <YStack gap="$6" maxWidth={400} width="100%" alignSelf="center" paddingHorizontal="$4">
        <FadeIn>
          <YStack gap="$6" alignItems="center" width="100%">
            <YStack gap="$2" alignItems="center">
              <Text
                fontFamily="$heading"
                fontWeight="800"
                fontSize={28}
                color="$color"
                letterSpacing={-0.5}
              >
                GymOS
              </Text>
              <Muted fontSize={11} fontWeight="500" textTransform="uppercase" letterSpacing={1.2}>
                Coach
              </Muted>
            </YStack>

            <MissedMark />

            <YStack gap="$3" alignItems="center" width="100%">
              <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={1.4}>
                Off the floor
              </Muted>
              <Title fontSize={22} textAlign="center" fontWeight="700">
                This screen isn't on the roster
              </Title>
              <Muted textAlign="center" fontSize={13} maxWidth={320}>
                The page you requested doesn't exist or was moved. Head home and pick up from your
                desk.
              </Muted>
            </YStack>

            <YStack gap="$3" width="100%" alignItems="center">
              <PrimaryButton onPress={() => router.replace('/')} width="100%">
                Back to home
              </PrimaryButton>
              <Link href="/clients">
                <Muted fontSize={13} color="$accent">
                  View clients
                </Muted>
              </Link>
            </YStack>
          </YStack>
        </FadeIn>
      </YStack>
    </Screen>
  );
};

export const NotFoundScreen = () => (
  <AppErrorBoundary>
    <NotFoundBody />
  </AppErrorBoundary>
);
