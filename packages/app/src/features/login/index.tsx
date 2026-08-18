'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import { api, ApiError } from '@gymos/contracts';
import {
  AppErrorBoundary,
  Card,
  FormField,
  FormKeyboardRoot,
  Muted,
  PrimaryButton,
  Screen,
  Text,
  useFocusChain,
  YStack,
} from '@gymos/ui';
import { qk } from '../../api';
import { setSessionPresence } from '../shell/session-presence';

export const LoginScreen = () => (
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
      setSessionPresence(true);
      queryClient.setQueryData(qk.me, result.me);
      startTransition(() => {
        router.replace('/');
      });
    } catch (e) {
      setSessionPresence(false);
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Too many attempts — wait a minute and try again.'
          : 'Email or password is incorrect.',
      );
    } finally {
      setBusy(false);
    }
  };

  const chain = useFocusChain(['email', 'password'], {
    onSubmit: () => {
      void submit();
    },
    submitKey: 'go',
  });

  return (
    <FormKeyboardRoot asForm fill avoidKeyboard>
      <Screen chrome="bare" justifyContent="center" minHeight="100%" backgroundColor="$screenBg">
        {chain.toolbar}
        <YStack gap="$6" maxWidth={400} width="100%" alignSelf="center" paddingHorizontal="$4">
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
            <Muted textAlign="center" fontSize={13} marginTop="$2">
              Sign in to your coaching workstation
            </Muted>
          </YStack>
          <Card padding="$6" gap="$4">
            <FormField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="coach@example.com"
              autoCapitalize="none"
              autoCorrect={false}
              inputMode="email"
              required
              {...chain.bind('email')}
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
              {...chain.bind('password')}
            />
            <PrimaryButton
              disabled={busy || email.trim().length < 3 || password.length < 8}
              onPress={() => void submit()}
              width="100%"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </PrimaryButton>
            <YStack gap="$2" alignItems="center" marginTop="$2">
              <Link href="/signup">
                <Muted fontSize={13} color="$accent">
                  Create coach account
                </Muted>
              </Link>
              <Link href="/forgot-password">
                <Muted fontSize={13} color="$accent">
                  Forgot password?
                </Muted>
              </Link>
            </YStack>
          </Card>
          <Muted fontSize={11} textAlign="center">
            Pilot build · Pakistan region
          </Muted>
        </YStack>
      </Screen>
    </FormKeyboardRoot>
  );
};
