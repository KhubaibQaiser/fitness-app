'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { useRouter } from 'solito/navigation';
import { api, ApiError } from '@gymos/contracts';
import { storage } from '@gymos/platform';
import {
  AppErrorBoundary,
  Card,
  FormField,
  Muted,
  PrimaryButton,
  Screen,
  Text,
  XStack,
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
      <YStack gap="$5" maxWidth={400} width="100%" alignSelf="center" paddingHorizontal="$5">
        <YStack gap="$3" alignItems="center">
          <XStack alignItems="center" gap="$3">
            <YStack
              width={44}
              height={44}
              borderRadius="$radiusControl"
              backgroundColor="$primary"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontFamily="$heading" fontWeight="800" fontSize={18} color="$primaryFg">
                G
              </Text>
            </YStack>
            <YStack>
              <Muted fontSize={11} fontWeight="600" textTransform="uppercase" letterSpacing={1.2}>
                GymOS
              </Muted>
              <Text fontFamily="$heading" fontWeight="700" fontSize={22} color="$color">
                Coach
              </Text>
            </YStack>
          </XStack>
          <Muted textAlign="center" fontSize={13}>
            Coaching workstation · Pilot access
          </Muted>
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
            {busy ? 'Checking…' : 'Enter workstation'}
          </PrimaryButton>
        </Card>
        <Muted fontSize={11} textAlign="center">
          Pilot build · Pakistan region
        </Muted>
      </YStack>
    </Screen>
  );
};
