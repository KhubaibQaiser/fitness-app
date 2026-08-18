'use client';

import { FormField, type FocusChainBind } from '@gymos/ui';

type OtpCodeFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  onSubmitEditing?: () => void;
  field?: FocusChainBind;
};

export const OtpCodeField = ({
  value,
  onChangeText,
  error = null,
  onSubmitEditing,
  field,
}: OtpCodeFieldProps) => (
  <FormField
    label="Verification code"
    value={value}
    onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 6))}
    placeholder="6-digit code"
    autoCapitalize="none"
    autoCorrect={false}
    inputMode="numeric"
    autoComplete="one-time-code"
    maxLength={6}
    required
    error={error}
    {...(onSubmitEditing !== undefined ? { onSubmitEditing } : {})}
    {...(field ?? {})}
  />
);
