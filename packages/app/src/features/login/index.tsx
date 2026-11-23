'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { AccessibilityInfo } from 'react-native';
import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import { api } from '@gymos/contracts';
import {
  AppErrorBoundary,
  Body,
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
import { AuthFormCard } from '../auth/auth-form-card';
import { setSessionPresence } from '../shell/session-presence';
import { describeLoginFailure, type LoginFailure } from './login-failure';

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
  const [failure, setFailure] = useState<LoginFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  const submit = async () => {
    if (email.trim().length < 3 || password.length < 8 || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      const result = await api.login(email.trim(), password);
      setSessionPresence(true);
      queryClient.setQueryData(qk.me, result.me);
      startTransition(() => {
        router.replace('/');
      });
    } catch (e) {
      setSessionPresence(false);
      const next = describeLoginFailure(e);
      setFailure(next);
      // role="alert" announces on web; native screen readers need the explicit call.
      AccessibilityInfo.announceForAccessibility(next.message);
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
          <AuthFormCard>
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
            {/* Same gap as the field's own error, so a non-credential failure sits where it always did. */}
            <YStack gap="$1.5">
              <FormField
                label="Password"
                value={password}
                onChangeText={setPassword}
                placeholder="Your password"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                required
                error={failure?.credentials === true ? failure.message : null}
                {...chain.bind('password')}
              />
              {failure !== null && !failure.credentials ? (
                <Body color="$danger" fontSize={12} fontWeight="600" lineHeight={16} role="alert">
                  {failure.message}
                </Body>
              ) : null}
            </YStack>
            <PrimaryButton
              disabled={busy || email.trim().length < 3 || password.length < 8}
              onPress={() => void submit()}
              width="100%"
            >
              {busy ? 'Signing in…' : failure?.retry === true ? 'Try again' : 'Sign in'}
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
          </AuthFormCard>
          <Muted fontSize={11} textAlign="center">
            Pilot build · Pakistan region
          </Muted>
        </YStack>
      </Screen>
    </FormKeyboardRoot>
  );
};
