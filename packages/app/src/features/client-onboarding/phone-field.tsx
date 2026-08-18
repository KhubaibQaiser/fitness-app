'use client';

import { FormField, YStack, type FocusChainBind } from '@gymos/ui';
import { formatPhoneAsYouType, isCountryCode, type CountryCode } from '../../lib/phone';

export const PhoneField = ({
  label,
  value,
  onChangeText,
  defaultCountry,
  error = null,
  hint = null,
  required = false,
  field,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  defaultCountry: string;
  error?: string | null;
  hint?: string | null;
  required?: boolean;
  field?: FocusChainBind;
}) => {
  const country: CountryCode = isCountryCode(defaultCountry) ? defaultCountry : 'PK';

  return (
    <YStack width="100%">
      <FormField
        label={label}
        value={value}
        onChangeText={(raw) => onChangeText(formatPhoneAsYouType(raw, country))}
        placeholder={country === 'PK' ? '0300 1234567' : '+1 …'}
        inputMode="tel"
        required={required}
        error={error}
        hint={hint}
        {...(field ?? {})}
      />
    </YStack>
  );
};
