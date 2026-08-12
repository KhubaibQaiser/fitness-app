import type { ReactNode } from 'react';
import { Spinner, YStack } from 'tamagui';
import { GhostButton } from './buttons';
import { Body, Muted, Title } from './typography';

export const LoadingState = ({ label = 'Loading…' }: { label?: string }) => (
  <YStack
    flex={1}
    alignItems="center"
    justifyContent="center"
    gap="$3"
    paddingVertical="$10"
    role="status"
    aria-live="polite"
    aria-busy
  >
    <Spinner size="large" color="$primary" />
    <Muted>{label}</Muted>
  </YStack>
);

export const EmptyState = ({
  title,
  hint,
  action,
  icon,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) => (
  <YStack alignItems="center" paddingVertical="$8" gap="$3">
    {icon}
    <Title fontSize={16} textAlign="center" fontWeight="600">
      {title}
    </Title>
    {hint ? (
      <Muted textAlign="center" maxWidth={320} fontSize={12}>
        {hint}
      </Muted>
    ) : null}
    {action}
  </YStack>
);

export const ErrorState = ({ message, retry }: { message: string; retry?: () => void }) => (
  <YStack
    backgroundColor="$dangerMuted"
    borderRadius="$radiusCard"
    alignItems="center"
    paddingVertical="$6"
    paddingHorizontal="$4"
    gap="$3"
    role="alert"
  >
    <Body color="$danger" textAlign="center" fontWeight="700">
      {message}
    </Body>
    {retry ? (
      <GhostButton onPress={retry} aria-label="Retry">
        Try again
      </GhostButton>
    ) : null}
  </YStack>
);
