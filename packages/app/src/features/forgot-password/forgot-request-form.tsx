'use client';

import { useState } from 'react';
import { FormField, PrimaryButton, useFocusChain, YStack } from '@gymos/ui';

type ForgotRequestFormProps = {
  busy: boolean;
  error: string | null;
  onSubmit: (email: string) => void;
};

export const ForgotRequestForm = ({ busy, error, onSubmit }: ForgotRequestFormProps) => {
  const [email, setEmail] = useState('');
  const canSubmit = email.trim().length > 3 && !busy;

  const submit = () => {
    if (!canSubmit) return;
    onSubmit(email.trim());
  };

  const chain = useFocusChain(['email'], { onSubmit: submit, submitKey: 'go' });

  return (
    <YStack gap="$4">
      {chain.toolbar}
      <FormField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="coach@example.com"
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="email"
        required
        error={error}
        {...chain.bind('email')}
      />
      <PrimaryButton disabled={!canSubmit} onPress={submit} width="100%">
        {busy ? 'Sending…' : 'Send code'}
      </PrimaryButton>
    </YStack>
  );
};
