/**
 * Transactional email sender for OTP codes.
 * Resend when configured; console fallback for local/dev (never in production).
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

const subjectFor = (purpose: SendOtpEmailInput['purpose']): string =>
  purpose === 'signup_coach' ? 'Your GymOS signup code' : 'Your GymOS password reset code';

const bodyFor = (code: string, purpose: SendOtpEmailInput['purpose']): string => {
  const action = purpose === 'signup_coach' ? 'complete signup' : 'reset your password';
  return `Your GymOS verification code is ${code}.\n\nUse it to ${action}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`;
};

/**
 * Create an email sender. Without RESEND_API_KEY and when `requireDelivery` is
 * false, logs the OTP to stdout (local only).
 */
export const createEmailSender = (config: ResendMailConfig): EmailSender => ({
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
});

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
