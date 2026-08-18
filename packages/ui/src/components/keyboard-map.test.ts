import { describe, expect, it } from 'vitest';
import {
  isPadKeyboard,
  keyboardTypeForInputMode,
  textContentTypeForAutoComplete,
} from './keyboard-map';

describe('keyboardTypeForInputMode', () => {
  it('maps numeric modes onto native pads that otherwise have no return key', () => {
    expect(keyboardTypeForInputMode('decimal')).toBe('decimal-pad');
    expect(keyboardTypeForInputMode('numeric')).toBe('number-pad');
    expect(keyboardTypeForInputMode('tel')).toBe('phone-pad');
    expect(isPadKeyboard('decimal-pad')).toBe(true);
    expect(isPadKeyboard('email-address')).toBe(false);
  });

  it('maps email/url onto keyboards that still have a return key', () => {
    expect(keyboardTypeForInputMode('email')).toBe('email-address');
    expect(keyboardTypeForInputMode('url')).toBe('url');
  });

  it('maps autocomplete onto iOS textContentType', () => {
    expect(textContentTypeForAutoComplete('one-time-code')).toBe('oneTimeCode');
    expect(textContentTypeForAutoComplete('new-password')).toBe('newPassword');
  });
});
