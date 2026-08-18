'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import { api, ApiError } from '@gymos/contracts';
import { AppErrorBoundary, Card, FormKeyboardRoot, Muted, Screen, Text, YStack } from '@gymos/ui';
import { qk } from '../../api';
import { setSessionPresence } from '../shell/session-presence';
import { ForgotRequestForm } from './forgot-request-form';
import { ForgotResetForm } from './forgot-reset-form';

export const ForgotPasswordScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<string | null>(null);

  const requestReset = async (nextEmail: string) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await api.forgotPassword(nextEmail);
      setEmail(nextEmail);
      setStep('reset');
      setInfo('If an account exists for that email, we sent a verification code.');
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Too many attempts. Wait and try again.'
          : 'Could not start reset. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (busy || code.length !== 6 || newPassword.length < 8) return;
    setBusy(true);
    setError(null);
    try {
      await api.resetPassword(email, code, newPassword);
      const result = await api.login(email, newPassword);
      setSessionPresence(true);
      queryClient.setQueryData(qk.me, result.me);
      startTransition(() => {
        router.replace('/');
      });
    } catch (e) {
      setError(
        e instanceof ApiError && e.status === 429
          ? 'Too many attempts. Wait and try again.'
          : 'Invalid or expired code. Request a new one.',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppErrorBoundary>
      <FormKeyboardRoot asForm fill avoidKeyboard>
        <Screen chrome="bare" justifyContent="center" minHeight="100%" backgroundColor="$screenBg">
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
                Reset password
              </Muted>
              <Muted textAlign="center" fontSize={13} marginTop="$2">
                {step === 'request'
                  ? 'We will email a verification code if the account exists'
                  : `Enter the code sent to ${email}`}
              </Muted>
            </YStack>
            <Card padding="$6" gap="$4">
              {step === 'request' ? (
                <ForgotRequestForm
                  busy={busy}
                  error={error}
                  onSubmit={(v) => void requestReset(v)}
                />
              ) : (
                <ForgotResetForm
                  code={code}
                  onChangeCode={setCode}
                  newPassword={newPassword}
                  onChangePassword={setNewPassword}
                  busy={busy}
                  error={error}
                  info={info}
                  onSubmit={() => void reset()}
                />
              )}
            </Card>
            <Link href="/login">
              <Muted fontSize={13} textAlign="center" color="$accent">
                Back to sign in
              </Muted>
            </Link>
          </YStack>
        </Screen>
      </FormKeyboardRoot>
    </AppErrorBoundary>
  );
};
