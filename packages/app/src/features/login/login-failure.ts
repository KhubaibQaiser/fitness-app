import { ApiError } from '@gymos/contracts';

/** What the login form shows after a failed sign-in. */
export type LoginFailure = {
  message: string;
  /** Wrong email or password: the message belongs on the password field. */
  credentials: boolean;
  /** The request never got an answer: the button reads "Try again". */
  retry: boolean;
};

const failure = (message: string, flags: Partial<Omit<LoginFailure, 'message'>> = {}) => ({
  message,
  credentials: false,
  retry: false,
  ...flags,
});

/**
 * Map a failed `api.login` to what the coach reads, and log it with the operation,
 * status and cause. It only gets the error, so the email and password can't reach the log.
 */
export const describeLoginFailure = (error: unknown): LoginFailure => {
  const status = error instanceof ApiError ? error.status : null;
  console.warn('[auth.login] sign-in failed', { operation: 'auth.login', status, cause: error });

  if (error instanceof ApiError) {
    if (error.status === 401) {
      return failure('Email or password is incorrect.', { credentials: true });
    }
    // The login route has no account lockout; this per-IP limit (10 a minute) is its only one.
    if (error.status === 429) return failure('Too many attempts. Wait a minute and try again.');
    if (error.status >= 500) return failure('GymOS is having trouble. Try again in a minute.');
    return failure(`Sign-in failed (error ${error.status}).`);
  }
  // No response arrived (offline, refused, DNS, timeout). Browsers and React Native's fetch
  // reject with a TypeError; Expo's native fetch rejects with FetchError, "fetch failed: …".
  // Limit: this matches Expo's message text (expo/src/winter/fetch/FetchErrors.ts). Drop it once
  // the API client wraps transport failures in its own error type.
  if (
    error instanceof TypeError ||
    (error instanceof Error && error.message.startsWith('fetch failed: '))
  ) {
    return failure("Can't reach GymOS. Check your connection.", { retry: true });
  }
  return failure('Sign-in failed unexpectedly. Try again.');
};
