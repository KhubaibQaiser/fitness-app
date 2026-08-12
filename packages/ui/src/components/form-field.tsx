'use client';

import { useId, type ReactNode } from 'react';
import { Input, Label, Text, TextArea, XStack, YStack, type ColorTokens } from 'tamagui';
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
  unit?: string;
};

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
  unit,
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
      <Label
        htmlFor={id}
        fontFamily="$heading"
        fontWeight="500"
        fontSize={12}
        color="$textMuted"
        textTransform="uppercase"
        letterSpacing={0.8}
      >
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
          borderWidth={1}
          borderColor={borderColor}
          backgroundColor="$cardBg"
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
        <XStack position="relative" alignItems="center" width="100%">
          <Input
            id={id}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            disabled={disabled}
            size="$4"
            minHeight={48}
            height={48}
            flex={1}
            width="100%"
            borderWidth={1}
            borderColor={borderColor}
            backgroundColor="$cardBg"
            color="$color"
            placeholderTextColor="$placeholderColor"
            borderRadius="$radiusControl"
            paddingHorizontal="$3"
            paddingRight={unit ? 44 : undefined}
            fontFamily="$body"
            fontSize={15}
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
          {unit ? (
            <Text
              position="absolute"
              right={12}
              fontFamily="$mono"
              fontSize={14}
              color="$textMuted"
              pointerEvents="none"
            >
              {unit}
            </Text>
          ) : null}
        </XStack>
      )}
      {error ? (
        <Body id={errorId} color="$danger" fontSize={12} fontWeight="600" role="alert">
          {error}
        </Body>
      ) : hint ? (
        <Muted id={hintId} fontSize={12}>
          {hint}
        </Muted>
      ) : null}
    </YStack>
  );
};

export const FormSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <YStack gap="$3" width="100%" aria-label={title}>
    <Text
      fontFamily="$heading"
      fontWeight="600"
      fontSize={11}
      textTransform="uppercase"
      letterSpacing={1.4}
      color="$textMuted"
    >
      {title}
    </Text>
    {children}
  </YStack>
);
