'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useState, useTransition } from 'react';
import { Link } from 'solito/link';
import { useRouter } from 'solito/navigation';
import { api, ApiError } from '@gymos/contracts';
import { AppErrorBoundary, Card, Muted, Screen, Text, YStack } from '@gymos/ui';
import { qk } from '../../api';
import { setSessionPresence } from '../shell/session-presence';
import {
  SignupDetailsForm,
  type SignupDetailsError,
  type SignupDetailsValues,
} from './signup-details-form';
import { SignupOtpStep } from './signup-otp-step';

export const SignupScreen = () => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [, startTransition] = useTransition();
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<SignupDetailsError>(null);
  const [busy, setBusy] = useState(false);
  const [resendBusy, setResendBusy] = useState(false);

  const mapStartError = (e: unknown): NonNullable<SignupDetailsError> => {
    if (!(e instanceof ApiError)) return { message: 'Could not start signup. Try again.' };
    if (e.status === 429) {
      return { message: 'Too many attempts — wait a few minutes and try again.' };
    }
    if (e.code === 'EMAIL_TAKEN') {
      return { field: 'email', message: 'An account with this email already exists.' };
    }
    if (e.code === 'PHONE_TAKEN') {
      return { field: 'phone', message: 'An account with this phone already exists.' };
    }
    if (e.code === 'INVALID_PHONE') {
      return { field: 'phone', message: 'Enter a valid phone number (E.164 or local PK).' };
    }
    if (e.code === 'INVALID_JOIN_CODE') {
      return { field: 'joinCode', message: 'That join code is invalid.' };
    }
    return { message: e.message };
  };

  const start = async (values: SignupDetailsValues) => {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await api.signupCoachStart({
        name: values.name,
        email: values.email,
        phone: values.phone,
        password: values.password,
        ...(values.joinCode.length > 0 ? { joinCode: values.joinCode } : {}),
      });
      setEmail(values.email);
      setStep('otp');
    } catch (e) {
      setError(mapStartError(e));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (busy || code.length !== 6) return;
    setBusy(true);
    setError(null);
    try {
      const result = await api.signupCoachConfirm(email, code);
      setSessionPresence(true);
      queryClient.setQueryData(qk.me, result.me);
      startTransition(() => {
        router.replace('/');
      });
    } catch (e) {
      setError({
        message:
          e instanceof ApiError && e.status === 429
            ? 'Too many attempts — wait and try again.'
            : e instanceof ApiError
              ? 'Invalid or expired code. Try again or resend.'
              : 'Could not verify. Try again.',
      });
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (resendBusy) return;
    setResendBusy(true);
    setError(null);
    try {
      await api.signupCoachResend(email);
    } catch (e) {
      setError({
        message:
          e instanceof ApiError && e.status === 429
            ? 'Too many attempts — wait and try again.'
            : 'Could not resend code. Start signup again.',
      });
    } finally {
      setResendBusy(false);
    }
  };

  return (
    <AppErrorBoundary>
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
              Coach signup
            </Muted>
            <Muted textAlign="center" fontSize={13} marginTop="$2">
              {step === 'details'
                ? 'Create your coaching workspace'
                : `Enter the code sent to ${email}`}
            </Muted>
          </YStack>
          <Card padding="$6" gap="$4">
            {step === 'details' ? (
              <SignupDetailsForm busy={busy} error={error} onSubmit={(v) => void start(v)} />
            ) : (
              <SignupOtpStep
                code={code}
                onChangeCode={setCode}
                busy={busy}
                error={error?.message ?? null}
                onConfirm={() => void confirm()}
                onResend={() => void resend()}
                resendBusy={resendBusy}
              />
            )}
          </Card>
          <Link href="/login">
            <Muted fontSize={13} textAlign="center" color="$accent">
              Already have an account? Sign in
            </Muted>
          </Link>
        </YStack>
      </Screen>
    </AppErrorBoundary>
  );
};
