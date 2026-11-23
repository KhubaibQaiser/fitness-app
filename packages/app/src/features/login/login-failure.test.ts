import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@gymos/contracts';
import { afterFieldEdit, describeLoginFailure, loginView } from './login-failure';

const WRONG_CREDENTIALS = 'Email or password is incorrect.';

describe('describeLoginFailure (B3: login says what actually failed)', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    warn.mockRestore();
  });

  it('401: wrong email or password, shown on the password field', () => {
    const failure = describeLoginFailure(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect'),
    );
    expect(failure).toEqual({ message: WRONG_CREDENTIALS, credentials: true, retry: false });
  });

  // The login route has no account lockout: its only throttle is the per-IP limiter
  // (429 RATE_LIMITED, 10 attempts a minute), so this row also covers "account locked".
  it('429: the wait message, which says when to try again', () => {
    const failure = describeLoginFailure(
      new ApiError(429, 'RATE_LIMITED', 'Too many attempts. Wait a minute'),
    );
    expect(failure).toEqual({
      message: 'Too many attempts. Wait a minute and try again.',
      credentials: false,
      retry: false,
    });
  });

  it.each([
    ['web offline or refused', new TypeError('Failed to fetch')],
    ['React Native fetch, refused', new TypeError('Network request failed')],
    ['React Native fetch, timeout', new TypeError('Network request timed out')],
    // Expo's fetch, the native global on this SDK, rejects with FetchError: a plain Error.
    [
      'Expo fetch, refused (seen on the iOS simulator)',
      new Error(
        'fetch failed: UnexpectedException: Could not connect to the server. (at ExpoModulesCore/Promise.swift:56)',
      ),
    ],
    ['Expo fetch, timeout', new Error('fetch failed: The request timed out.')],
  ])('network error or timeout (%s): cannot reach GymOS, with Try again', (_label, error) => {
    expect(describeLoginFailure(error)).toEqual({
      message: "Can't reach GymOS. Check your connection.",
      credentials: false,
      retry: true,
    });
  });

  it.each([500, 502, 503, 504])('%i: GymOS is having trouble, not wrong credentials', (status) => {
    expect(describeLoginFailure(new ApiError(status, 'UNKNOWN', 'Server error'))).toEqual({
      message: 'GymOS is having trouble. Try again in a minute.',
      credentials: false,
      retry: false,
    });
  });

  it('5xx with a request reference in the problem body: the message quotes it', () => {
    const error = new ApiError(500, 'INTERNAL', 'Something went wrong', undefined, 'req-7f3a');
    expect(describeLoginFailure(error)).toEqual({
      message: 'GymOS is having trouble. Try again in a minute. Reference: req-7f3a',
      credentials: false,
      retry: false,
    });
  });

  it.each([400, 403, 404, 422])(
    '%i: an error with the status, never wrong credentials',
    (status) => {
      const failure = describeLoginFailure(new ApiError(status, 'SOMETHING', 'Something'));
      expect(failure.credentials).toBe(false);
      expect(failure.message).not.toBe(WRONG_CREDENTIALS);
      expect(failure.message).toContain(String(status));
    },
  );

  it('an unexpected client error is not shown as wrong credentials or a network problem', () => {
    const failure = describeLoginFailure(new SyntaxError('Unexpected token < in JSON'));
    expect(failure).toEqual({
      message: 'Sign-in failed unexpectedly. Try again.',
      credentials: false,
      retry: false,
    });
  });

  it('logs the operation, status and cause of every failure', () => {
    const apiError = new ApiError(503, 'UNKNOWN', 'Service Unavailable');
    describeLoginFailure(apiError);
    const networkError = new TypeError('Failed to fetch');
    describeLoginFailure(networkError);

    expect(warn).toHaveBeenNthCalledWith(1, '[auth.login] sign-in failed', {
      operation: 'auth.login',
      status: 503,
      cause: apiError,
    });
    expect(warn).toHaveBeenNthCalledWith(2, '[auth.login] sign-in failed', {
      operation: 'auth.login',
      status: null,
      cause: networkError,
    });
  });
});

describe('loginView: what the screen renders for each failure', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const wrongPassword = () =>
    describeLoginFailure(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect'),
    );
  const offline = () => describeLoginFailure(new TypeError('Failed to fetch'));
  const serverDown = () => describeLoginFailure(new ApiError(500, 'INTERNAL', 'Server error'));

  it('no failure: nothing shown, nothing announced', () => {
    expect(loginView(null, false)).toEqual({
      fieldError: null,
      alert: null,
      buttonLabel: 'Sign in',
      announcement: null,
    });
  });

  it('401: the message marks the password field, with no separate alert', () => {
    expect(loginView(wrongPassword(), false)).toEqual({
      fieldError: WRONG_CREDENTIALS,
      alert: null,
      buttonLabel: 'Sign in',
      announcement: WRONG_CREDENTIALS,
    });
  });

  it('network failure: an alert under the field, the field left valid, and Try again', () => {
    expect(loginView(offline(), false)).toEqual({
      fieldError: null,
      alert: "Can't reach GymOS. Check your connection.",
      buttonLabel: 'Try again',
      announcement: "Can't reach GymOS. Check your connection.",
    });
  });

  it('5xx: an alert, the field left valid, and the normal button', () => {
    expect(loginView(serverDown(), false)).toEqual({
      fieldError: null,
      alert: 'GymOS is having trouble. Try again in a minute.',
      buttonLabel: 'Sign in',
      announcement: 'GymOS is having trouble. Try again in a minute.',
    });
  });

  it('while signing in the button says so, even after a network failure', () => {
    expect(loginView(offline(), true).buttonLabel).toBe('Signing in…');
  });

  it('editing a field after a network failure turns Try again back into Sign in', () => {
    const edited = afterFieldEdit(offline());
    expect(loginView(edited, false)).toMatchObject({
      alert: "Can't reach GymOS. Check your connection.",
      buttonLabel: 'Sign in',
    });
  });

  it('editing leaves other failures, and no failure, as they were', () => {
    const failure = wrongPassword();
    expect(afterFieldEdit(failure)).toBe(failure);
    expect(afterFieldEdit(null)).toBeNull();
  });
});
