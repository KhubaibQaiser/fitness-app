import type { ReactNode } from 'react';
import { Spinner, YStack } from 'tamagui';
import { GhostButton } from './buttons';
import { Card } from './card';
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
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) => (
  <Card alignItems="center" paddingVertical="$8" gap="$3">
    <Title fontSize={20} textAlign="center">
      {title}
    </Title>
    {hint ? (
      <Muted textAlign="center" maxWidth={320}>
        {hint}
      </Muted>
    ) : null}
    {action}
  </Card>
);

export const ErrorState = ({ message, retry }: { message: string; retry?: () => void }) => (
  <Card tone="danger" alignItems="center" paddingVertical="$6" gap="$3" role="alert">
    <Body color="$danger" textAlign="center" fontWeight="700">
      {message}
    </Body>
    {retry ? (
      <GhostButton onPress={retry} aria-label="Retry">
        Try again
      </GhostButton>
    ) : null}
  </Card>
);
