'use client';

import { FormField } from '@gymos/ui';

type OtpCodeFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  onSubmitEditing?: () => void;
};

export const OtpCodeField = ({
  value,
  onChangeText,
  error = null,
  onSubmitEditing,
}: OtpCodeFieldProps) => (
  <FormField
    label="Verification code"
    value={value}
    onChangeText={(text) => onChangeText(text.replace(/\D/g, '').slice(0, 6))}
    placeholder="6-digit code"
    autoCapitalize="none"
    autoCorrect={false}
    inputMode="numeric"
    required
    error={error}
    {...(onSubmitEditing !== undefined ? { onSubmitEditing } : {})}
  />
);
