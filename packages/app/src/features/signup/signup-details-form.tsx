'use client';

import { useState } from 'react';
import { FormField, PrimaryButton, YStack } from '@gymos/ui';

export type SignupDetailsValues = {
  name: string;
  email: string;
  phone: string;
  password: string;
  joinCode: string;
};

type SignupDetailsFormProps = {
  busy: boolean;
  error: string | null;
  onSubmit: (values: SignupDetailsValues) => void;
};

export const SignupDetailsForm = ({ busy, error, onSubmit }: SignupDetailsFormProps) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [joinCode, setJoinCode] = useState('');

  const canSubmit =
    name.trim().length > 0 &&
    email.trim().length > 3 &&
    phone.trim().length >= 7 &&
    password.length >= 8 &&
    !busy;

  return (
    <YStack gap="$4">
      <FormField
        label="Full name"
        value={name}
        onChangeText={setName}
        placeholder="Your name"
        autoCapitalize="words"
        required
      />
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
        label="Phone"
        value={phone}
        onChangeText={setPhone}
        placeholder="+923001234567 or 03001234567"
        autoCapitalize="none"
        autoCorrect={false}
        inputMode="tel"
        required
        hint="Used to prevent duplicate accounts"
      />
      <FormField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        autoCapitalize="none"
        autoCorrect={false}
        secureTextEntry
        required
      />
      <FormField
        label="Gym join code"
        value={joinCode}
        onChangeText={setJoinCode}
        placeholder="Optional"
        autoCapitalize="characters"
        autoCorrect={false}
        hint="Leave blank to create your own coaching workspace"
        error={error}
      />
      <PrimaryButton
        disabled={!canSubmit}
        onPress={() =>
          onSubmit({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            password,
            joinCode: joinCode.trim(),
          })
        }
        width="100%"
      >
        {busy ? 'Sending code…' : 'Continue'}
      </PrimaryButton>
    </YStack>
  );
};
