'use client';

import { FormField, Muted, PrimaryButton, useFocusChain, YStack } from '@gymos/ui';
import { OtpCodeField } from '../auth/otp-code-field';

type ForgotResetFormProps = {
  code: string;
  onChangeCode: (code: string) => void;
  newPassword: string;
  onChangePassword: (password: string) => void;
  busy: boolean;
  error: string | null;
  info: string | null;
  onSubmit: () => void;
};

export const ForgotResetForm = ({
  code,
  onChangeCode,
  newPassword,
  onChangePassword,
  busy,
  error,
  info,
  onSubmit,
}: ForgotResetFormProps) => {
  const submit = () => {
    if (busy || code.length !== 6 || newPassword.length < 8) return;
    onSubmit();
  };

  const chain = useFocusChain(['code', 'password'], { onSubmit: submit, submitKey: 'go' });

  return (
    <YStack gap="$4">
      {chain.toolbar}
      {info !== null ? (
        <Muted fontSize={13} textAlign="center">
          {info}
        </Muted>
      ) : null}
      <OtpCodeField value={code} onChangeText={onChangeCode} field={chain.bind('code')} />
      <FormField
        label="New password"
        value={newPassword}
        onChangeText={onChangePassword}
        placeholder="At least 8 characters"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        autoComplete="new-password"
        required
        error={error}
        {...chain.bind('password')}
      />
      <PrimaryButton
        disabled={busy || code.length !== 6 || newPassword.length < 8}
        onPress={submit}
        width="100%"
      >
        {busy ? 'Updating…' : 'Update password'}
      </PrimaryButton>
    </YStack>
  );
};
