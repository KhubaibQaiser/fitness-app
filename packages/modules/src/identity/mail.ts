/**
 * Transactional email sender for OTP codes.
 * Resend when configured; console fallback for local/dev (never in production).
 *
 * `resend.dev` is Resend's testing domain and can only deliver to the account
 * owner. Any live send must use a verified custom domain (the mailbox itself
 * need not exist).
 */

export type SendOtpEmailInput = {
  to: string;
  code: string;
  purpose: 'signup_coach' | 'password_reset';
};

export type EmailSender = {
  sendOtp: (input: SendOtpEmailInput) => Promise<void>;
};

export type ResendMailConfig = {
  apiKey: string | undefined;
  from: string;
  /** When true, refuse console fallback if apiKey is missing. */
  requireDelivery: boolean;
};

const RESEND_TESTING_DOMAIN = 'resend.dev';

/**
 * True when `from` uses Resend's testing domain (`resend.dev`), which cannot
 * deliver to anyone except the Resend account owner.
 */
export const fromAddressUsesResendTestingDomain = (from: string): boolean => {
  const angled = /<([^>]+)>/.exec(from);
  const address = (angled?.[1] ?? from).trim().toLowerCase();
  const at = address.lastIndexOf('@');
  if (at === -1) return false;
  const domain = address.slice(at + 1);
  return domain === RESEND_TESTING_DOMAIN || domain.endsWith(`.${RESEND_TESTING_DOMAIN}`);
};

/** Error if From is missing or still on Resend's testing domain. */
export const emailFromError = (from: string | undefined): string | undefined => {
  if (from === undefined || from.trim().length === 0) {
    return 'EMAIL_FROM is required when sending mail via Resend; use a verified custom domain (never resend.dev)';
  }
  if (fromAddressUsesResendTestingDomain(from)) {
    return 'EMAIL_FROM must use a verified custom domain; resend.dev can only send to the account owner';
  }
  return undefined;
};

const subjectFor = (purpose: SendOtpEmailInput['purpose']): string =>
  purpose === 'signup_coach' ? 'Your GymOS signup code' : 'Your GymOS password reset code';

const bodyFor = (code: string, purpose: SendOtpEmailInput['purpose']): string => {
  const action = purpose === 'signup_coach' ? 'complete signup' : 'reset your password';
  return `Your GymOS verification code is ${code}.\n\nUse it to ${action}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`;
};

const willCallResend = (config: ResendMailConfig): boolean =>
  config.requireDelivery || (config.apiKey !== undefined && config.apiKey.length > 0);

/**
 * Create an email sender. Without RESEND_API_KEY and when `requireDelivery` is
 * false, logs the OTP to stdout (local only).
 */
export const createEmailSender = (config: ResendMailConfig): EmailSender => {
  if (willCallResend(config)) {
    const fromError = emailFromError(config.from);
    if (fromError !== undefined) {
      throw new Error(fromError);
    }
  }

  return {
    sendOtp: async (input) => {
      const subject = subjectFor(input.purpose);
      const text = bodyFor(input.code, input.purpose);

      if (config.apiKey !== undefined && config.apiKey.length > 0) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: config.from,
            to: [input.to],
            subject,
            text,
          }),
        });
        if (!response.ok) {
          const detail = await response.text().catch(() => '');
          throw new Error(`Resend send failed (${response.status}): ${detail}`);
        }
        return;
      }

      if (config.requireDelivery) {
        throw new Error('RESEND_API_KEY is required in this environment');
      }

      console.info(`[gymos-mail] OTP to=${input.to} purpose=${input.purpose} code=${input.code}`);
    },
  };
};

/** Test seam — captures sends without network. */
export const createMemoryEmailSender = (): EmailSender & {
  sent: SendOtpEmailInput[];
} => {
  const sent: SendOtpEmailInput[] = [];
  return {
    sent,
    sendOtp: (input) => {
      sent.push(input);
      return Promise.resolve();
    },
  };
};
