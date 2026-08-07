'use client';

import { useId, type ReactNode } from 'react';
import { Input, Label, TextArea, YStack, type ColorTokens } from 'tamagui';
import { Body, Muted } from './typography';

type FormFieldProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: string | null;
  hint?: string | null;
  placeholder?: string;
  required?: boolean;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search';
  multiline?: boolean;
  numberOfLines?: number;
  onSubmitEditing?: () => void;
  disabled?: boolean;
};

/**
 * Accessible field: label + control + hint/error. Errors use aria-invalid /
 * aria-describedby so screen readers announce them with the input.
 */
export const FormField = ({
  label,
  value,
  onChangeText,
  error = null,
  hint = null,
  placeholder,
  required = false,
  secureTextEntry = false,
  autoCapitalize,
  autoCorrect,
  inputMode,
  multiline = false,
  numberOfLines = 3,
  onSubmitEditing,
  disabled = false,
}: FormFieldProps) => {
  const id = useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  const borderColor = (error ? '$danger' : '$borderColor') as ColorTokens;
  const focusBorder = (error ? '$danger' : '$focusRing') as ColorTokens;

  return (
    <YStack gap="$1.5" width="100%">
      <Label htmlFor={id} fontFamily="$heading" fontWeight="700" fontSize={13} color="$color">
        {label}
        {required ? ' *' : ''}
      </Label>
      {multiline ? (
        <TextArea
          id={id}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          disabled={disabled}
          size="$4"
          borderWidth={1.5}
          borderColor={borderColor}
          backgroundColor="$elevatedBg"
          color="$color"
          placeholderTextColor="$placeholderColor"
          borderRadius="$radiusControl"
          paddingHorizontal="$3"
          fontFamily="$body"
          numberOfLines={numberOfLines}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={describedBy || undefined}
          focusStyle={{
            borderColor: focusBorder,
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
          }}
        />
      ) : (
        <Input
          id={id}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          disabled={disabled}
          size="$4"
          minHeight={48}
          borderWidth={1.5}
          borderColor={borderColor}
          backgroundColor="$elevatedBg"
          color="$color"
          placeholderTextColor="$placeholderColor"
          borderRadius="$radiusControl"
          paddingHorizontal="$3"
          fontFamily="$body"
          secureTextEntry={secureTextEntry}
          {...(autoCapitalize !== undefined ? { autoCapitalize } : {})}
          {...(autoCorrect !== undefined ? { autoCorrect } : {})}
          {...(inputMode !== undefined ? { inputMode } : {})}
          {...(onSubmitEditing !== undefined ? { onSubmitEditing } : {})}
          aria-invalid={Boolean(error)}
          aria-required={required}
          aria-describedby={describedBy || undefined}
          focusStyle={{
            borderColor: focusBorder,
            outlineWidth: 2,
            outlineColor: '$focusRing',
            outlineStyle: 'solid',
          }}
        />
      )}
      {error ? (
        <Body id={errorId} color="$danger" fontSize={13} fontWeight="600" role="alert">
          {error}
        </Body>
      ) : hint ? (
        <Muted id={hintId}>{hint}</Muted>
      ) : null}
    </YStack>
  );
};

export const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <YStack gap="$3" width="100%" aria-label={title}>
    <Body fontFamily="$heading" fontWeight="800" fontSize={16}>
      {title}
    </Body>
    {children}
  </YStack>
);
