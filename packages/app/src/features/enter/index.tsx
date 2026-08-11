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
import { AUTH_HINT_KEY } from '../shell/gate-guard';

/** Email + password login — replaces the pilot access-key gate. */
export const EnterScreen = () => (
  <AppErrorBoundary>
    <LoginForm />
  </AppErrorBoundary>
);

const LoginForm = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const submit = async () => {
    if (email.trim().length < 3 || password.length < 8 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.login(email.trim(), password);
      storage.setItem(AUTH_HINT_KEY, '1');
      queryClient.setQueryData(qk.me, result.me);
      startTransition(() => {
        router.replace('/');
      });
    } catch (e) {
      storage.removeItem(AUTH_HINT_KEY);
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Too many attempts — wait a minute and try again.'
          : 'Email or password is incorrect.',
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
            Sign in to your coaching workstation
          </Muted>
        </YStack>
        <Card gap="$4" padding="$5">
          <FormField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="coach@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            required
          />
          <FormField
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="Your password"
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            required
            error={error}
            onSubmitEditing={() => void submit()}
          />
          <PrimaryButton
            disabled={busy || email.trim().length < 3 || password.length < 8}
            onPress={() => void submit()}
            width="100%"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </PrimaryButton>
        </Card>
        <Muted fontSize={11} textAlign="center">
          Pilot build · Pakistan region
        </Muted>
      </YStack>
    </Screen>
  );
};
