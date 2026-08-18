'use client';

import { forwardRef, useId, useImperativeHandle, useRef, type ReactNode } from 'react';
import {
  Input,
  Label,
  Text,
  TextArea,
  XStack,
  YStack,
  type ColorTokens,
  type TamaguiElement,
} from 'tamagui';
import type { FormFieldHandle } from './form-field-handle';
import {
  defaultAutoComplete,
  enterKeyHintForReturnKey,
  isPadKeyboard,
  keyboardTypeForInputMode,
  textContentTypeForAutoComplete,
  type AutoCompleteValue,
  type EnterKeyHint,
  type InputMode,
  type ReturnKeyType,
} from './keyboard-map';
import { Body, Muted } from './typography';

export type { FormFieldHandle } from './form-field-handle';

type HostFocusable = TamaguiElement;

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
  inputMode?: InputMode;
  autoComplete?: AutoCompleteValue;
  multiline?: boolean;
  numberOfLines?: number;
  onSubmitEditing?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  unit?: string;
  returnKeyType?: ReturnKeyType;
  enterKeyHint?: EnterKeyHint;
  blurOnSubmit?: boolean;
  inputAccessoryViewID?: string;
  autoFocus?: boolean;
  maxLength?: number;
};

export const FormField = forwardRef<FormFieldHandle, FormFieldProps>(function FormField(
  {
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
    autoComplete: autoCompleteProp,
    multiline = false,
    numberOfLines = 3,
    onSubmitEditing,
    onFocus,
    disabled = false,
    unit,
    returnKeyType,
    enterKeyHint: enterKeyHintProp,
    blurOnSubmit,
    inputAccessoryViewID,
    autoFocus,
    maxLength,
  },
  ref,
) {
  const id = useId();
  const inputRef = useRef<HostFocusable | null>(null);
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;
  const describedBy = [error ? errorId : null, hint && !error ? hintId : null]
    .filter(Boolean)
    .join(' ');

  useImperativeHandle(ref, () => ({
    focus: () => {
      const node = inputRef.current;
      if (node && 'focus' in node && typeof node.focus === 'function') {
        node.focus();
      }
    },
  }));

  const borderColor = (error ? '$danger' : '$borderColor') as ColorTokens;
  const focusBorder = (error ? '$danger' : '$focusRing') as ColorTokens;
  const keyboardType = keyboardTypeForInputMode(inputMode);
  const autoComplete = defaultAutoComplete({
    inputMode,
    secureTextEntry,
    autoComplete: autoCompleteProp,
  });
  const textContentType = textContentTypeForAutoComplete(autoComplete);
  const enterKeyHint =
    enterKeyHintProp ??
    (returnKeyType !== undefined ? enterKeyHintForReturnKey(returnKeyType) : undefined);
  const accessoryId =
    !multiline && isPadKeyboard(keyboardType) && inputAccessoryViewID !== undefined
      ? inputAccessoryViewID
      : undefined;

  const a11y = {
    id,
    nativeID: id.replace(/[^a-zA-Z0-9_-]/g, ''),
    accessibilityLabel: label,
    accessibilityState: { disabled },
    'aria-invalid': Boolean(error),
    'aria-required': required,
    ...(error ? { accessibilityHint: error } : hint ? { accessibilityHint: hint } : {}),
    ...(describedBy !== '' ? { 'aria-describedby': describedBy } : {}),
  };

  const keyboardProps = {
    keyboardType,
    ...(autoComplete !== undefined ? { autoComplete } : {}),
    ...(textContentType !== undefined ? { textContentType } : {}),
    ...(returnKeyType !== undefined ? { returnKeyType } : {}),
    ...(enterKeyHint !== undefined ? { enterKeyHint } : {}),
    ...(blurOnSubmit !== undefined ? { blurOnSubmit } : {}),
    ...(accessoryId !== undefined ? { inputAccessoryViewID: accessoryId } : {}),
    ...(autoFocus !== undefined ? { autoFocus } : {}),
    ...(maxLength !== undefined ? { maxLength } : {}),
    ...(autoCapitalize !== undefined ? { autoCapitalize } : {}),
    ...(autoCorrect !== undefined ? { autoCorrect } : {}),
    ...(inputMode !== undefined ? { inputMode } : {}),
    ...(onSubmitEditing !== undefined ? { onSubmitEditing } : {}),
    ...(onFocus !== undefined ? { onFocus } : {}),
  };

  const focusStyle = {
    borderColor: focusBorder,
    outlineWidth: 2,
    outlineColor: '$focusRing',
    outlineStyle: 'solid' as const,
  };

  return (
    <YStack gap="$1.5" width="100%">
      <Label
        htmlFor={id}
        fontFamily="$heading"
        fontWeight="500"
        fontSize={12}
        color="$textMuted"
        lineHeight={16}
      >
        {label}
        {required ? ' *' : ''}
      </Label>
      {multiline ? (
        <TextArea
          ref={inputRef}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          disabled={disabled}
          size="$4"
          borderWidth={1}
          borderColor={borderColor}
          backgroundColor="$surface"
          color="$color"
          placeholderTextColor="$placeholderColor"
          borderRadius={12}
          paddingHorizontal="$3"
          fontFamily="$body"
          numberOfLines={numberOfLines}
          {...a11y}
          {...keyboardProps}
          focusStyle={focusStyle}
        />
      ) : (
        <XStack position="relative" alignItems="center" width="100%">
          <Input
            ref={inputRef}
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
            backgroundColor="$surface"
            color="$color"
            placeholderTextColor="$placeholderColor"
            borderRadius={12}
            paddingHorizontal="$3"
            paddingRight={unit ? 44 : undefined}
            fontFamily="$body"
            fontSize={15}
            secureTextEntry={secureTextEntry}
            {...(secureTextEntry
              ? { type: 'password' as const }
              : inputMode === 'email'
                ? { type: 'email' as const }
                : {})}
            {...a11y}
            {...keyboardProps}
            focusStyle={focusStyle}
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
});

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
