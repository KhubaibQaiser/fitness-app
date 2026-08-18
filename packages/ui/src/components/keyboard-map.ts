export type InputMode = 'text' | 'decimal' | 'numeric' | 'tel' | 'email' | 'url' | 'search';

export type KeyboardType =
  'default' | 'decimal-pad' | 'number-pad' | 'phone-pad' | 'email-address' | 'url';

export type ReturnKeyType = 'default' | 'go' | 'next' | 'search' | 'send' | 'done';

export type EnterKeyHint = 'enter' | 'done' | 'go' | 'next' | 'search' | 'send';

export type AutoCompleteValue =
  | 'email'
  | 'current-password'
  | 'new-password'
  | 'username'
  | 'tel'
  | 'name'
  | 'one-time-code'
  | 'off';

export type TextContentType =
  | 'emailAddress'
  | 'password'
  | 'newPassword'
  | 'username'
  | 'telephoneNumber'
  | 'name'
  | 'oneTimeCode'
  | 'none';

/** Native keyboard. `inputMode` alone is a web hint and does not change iOS/Android pads. */
export const keyboardTypeForInputMode = (inputMode: InputMode | undefined): KeyboardType => {
  switch (inputMode) {
    case 'decimal':
      return 'decimal-pad';
    case 'numeric':
      return 'number-pad';
    case 'tel':
      return 'phone-pad';
    case 'email':
      return 'email-address';
    case 'url':
      return 'url';
    default:
      return 'default';
  }
};

/** iOS number/phone pads have no return key — they need InputAccessoryView. */
export const isPadKeyboard = (keyboardType: KeyboardType): boolean =>
  keyboardType === 'decimal-pad' || keyboardType === 'number-pad' || keyboardType === 'phone-pad';

export const enterKeyHintForReturnKey = (returnKeyType: ReturnKeyType): EnterKeyHint => {
  switch (returnKeyType) {
    case 'go':
      return 'go';
    case 'next':
      return 'next';
    case 'search':
      return 'search';
    case 'send':
      return 'send';
    case 'done':
      return 'done';
    default:
      return 'enter';
  }
};

export const textContentTypeForAutoComplete = (
  autoComplete: AutoCompleteValue | undefined,
): TextContentType | undefined => {
  switch (autoComplete) {
    case 'email':
      return 'emailAddress';
    case 'current-password':
      return 'password';
    case 'new-password':
      return 'newPassword';
    case 'username':
      return 'username';
    case 'tel':
      return 'telephoneNumber';
    case 'name':
      return 'name';
    case 'one-time-code':
      return 'oneTimeCode';
    case 'off':
      return 'none';
    default:
      return undefined;
  }
};

export const defaultAutoComplete = ({
  inputMode,
  secureTextEntry,
  autoComplete,
}: {
  inputMode: InputMode | undefined;
  secureTextEntry: boolean;
  autoComplete: AutoCompleteValue | undefined;
}): AutoCompleteValue | undefined => {
  if (autoComplete !== undefined) return autoComplete;
  if (secureTextEntry) return 'current-password';
  if (inputMode === 'email') return 'email';
  if (inputMode === 'tel') return 'tel';
  return undefined;
};
