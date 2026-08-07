'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { useRouter } from 'solito/navigation';
import { api, ApiError } from '@gymos/contracts';
import { storage } from '@gymos/platform';
import {
  AppErrorBoundary,
  Card,
  Dumbbell,
  FormField,
  Muted,
  PrimaryButton,
  Screen,
  Title,
  YStack,
} from '@gymos/ui';
import { qk } from '../../api';
import { GATE_HINT_KEY } from '../shell/gate-guard';

/** Access-gate entry — one key, once per device. No accounts in the pilot. */
export const EnterScreen = () => (
  <AppErrorBoundary>
    <EnterForm />
  </AppErrorBoundary>
);

const EnterForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [key, setKey] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const submit = async () => {
    if (key.trim().length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.enter(key.trim());
      storage.setItem(GATE_HINT_KEY, '1');
      await queryClient.prefetchQuery({ queryKey: qk.me, queryFn: api.me.get });
      startTransition(() => {
        router.replace('/');
      });
    } catch (e) {
      storage.removeItem(GATE_HINT_KEY);
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Too many attempts — wait a minute and try again.'
          : 'That access key is not valid.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen chrome="bare" justifyContent="center" minHeight="100%" backgroundColor="$screenBg">
      <YStack gap="$5" maxWidth={440} width="100%" alignSelf="center">
        <YStack gap="$2" alignItems="center">
          <YStack
            width={64}
            height={64}
            borderRadius={18}
            backgroundColor="$primary"
            alignItems="center"
            justifyContent="center"
            marginBottom="$2"
          >
            <Dumbbell size={32} color="$primaryFg" />
          </YStack>
          <Title textAlign="center">GymOS Coach</Title>
          <Muted textAlign="center">Enter your access key to open the app on this device</Muted>
        </YStack>
        <Card gap="$4" padding="$5">
          <FormField
            label="Access key"
            value={key}
            onChangeText={setKey}
            placeholder="Paste your key"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            required
            error={error}
            onSubmitEditing={() => void submit()}
          />
          <PrimaryButton
            disabled={busy || key.trim().length < 8}
            onPress={() => void submit()}
            width="100%"
          >
            {busy ? 'Checking…' : 'Open the app'}
          </PrimaryButton>
          <Muted fontSize={12} textAlign="center">
            You only do this once per device. Ask the platform operator if you lost your key.
          </Muted>
        </Card>
      </YStack>
    </Screen>
  );
};
