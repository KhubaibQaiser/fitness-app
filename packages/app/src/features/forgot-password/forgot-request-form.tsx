'use client';

import { useState } from 'react';
import { FormField, PrimaryButton, YStack } from '@gymos/ui';

type ForgotRequestFormProps = {
  busy: boolean;
  error: string | null;
  onSubmit: (email: string) => void;
};

export const ForgotRequestForm = ({ busy, error, onSubmit }: ForgotRequestFormProps) => {
  const [email, setEmail] = useState('');
  const canSubmit = email.trim().length > 3 && !busy;

  return (
    <YStack gap="$4">
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
        onSubmitEditing={() => {
          if (canSubmit) onSubmit(email.trim());
        }}
      />
      <PrimaryButton disabled={!canSubmit} onPress={() => onSubmit(email.trim())} width="100%">
        {busy ? 'Sending…' : 'Send code'}
      </PrimaryButton>
    </YStack>
  );
};
