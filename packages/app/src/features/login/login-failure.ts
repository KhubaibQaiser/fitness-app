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
    if (error.status >= 500) {
      const requestId = error.requestId?.trim();
      const reference = requestId ? ` Reference: ${requestId}` : '';
      return failure(`GymOS is having trouble. Try again in a minute.${reference}`);
    }
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

/** What the login form renders for the current failure. The screen only reads these fields. */
export type LoginView = {
  /** The password field's error, which marks it invalid: wrong credentials only. */
  fieldError: string | null;
  /** A role="alert" line under the password field: every other failure. */
  alert: string | null;
  buttonLabel: 'Sign in' | 'Signing in…' | 'Try again';
  /**
   * Spoken once when the failure appears. Native screen readers need the explicit call;
   * react-native-web's announceForAccessibility is an empty function, so on web only
   * role="alert" speaks and nothing is announced twice.
   */
  announcement: string | null;
};

export const loginView = (failure: LoginFailure | null, busy: boolean): LoginView => ({
  fieldError: failure?.credentials === true ? failure.message : null,
  alert: failure !== null && !failure.credentials ? failure.message : null,
  buttonLabel: busy ? 'Signing in…' : failure?.retry === true ? 'Try again' : 'Sign in',
  announcement: failure?.message ?? null,
});

/** Editing a field after a failure turns "Try again" back into "Sign in"; the message stays. */
export const afterFieldEdit = (failure: LoginFailure | null): LoginFailure | null =>
  failure?.retry === true ? { ...failure, retry: false } : failure;
