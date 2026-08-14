import { z } from 'zod';
import { emailFromError } from '@gymos/modules/identity';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /**
   * HS256 secret for short-lived access JWTs (≥32 bytes).
   * Generate: `openssl rand -hex 32`
   */
  JWT_ACCESS_SECRET: z.string().min(32, 'use at least 256 bits: openssl rand -hex 32'),
  /**
   * Pepper mixed into OTP code hashes. Generate: `openssl rand -hex 32`
   * Optional locally (dev uses a fixed fallback); required when NODE_ENV=production.
   */
  OTP_PEPPER: z.string().min(32).optional(),
  /** Resend API key — optional locally (OTP logged to stdout); required in production. */
  RESEND_API_KEY: z.string().min(1).optional(),
  /**
   * From address for OTP emails.
   * Required whenever Resend is used. Must be a verified custom domain
   * (the mailbox need not exist). Never `resend.dev`.
   */
  EMAIL_FROM: z.string().min(3).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /**
   * Seed-only password for the pilot coach (`coach@pilot.local`).
   * Required at seed time; not used at runtime after the hash is stored.
   */
  PILOT_COACH_PASSWORD: z.string().min(12).optional(),
  TENANT_MANIFEST_PATH: z.string().min(1),
  AI_MODE: z.enum(['local', 'fallback', 'hosted']).default('fallback'),
  AI_BASE_URL: z.url().optional(),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_ADAPTER_VERSION: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(8080),
});

export type Env = z.infer<typeof envSchema>;

const willSendViaResend = (env: Pick<Env, 'NODE_ENV' | 'RESEND_API_KEY'>): boolean =>
  env.NODE_ENV === 'production' ||
  (env.RESEND_API_KEY !== undefined && env.RESEND_API_KEY.length > 0);

export const loadEnv = (source: Record<string, string | undefined>): Env => {
  const parsed = envSchema.parse(source);
  if (parsed.NODE_ENV === 'production') {
    if (parsed.OTP_PEPPER === undefined) {
      throw new Error('OTP_PEPPER is required when NODE_ENV=production');
    }
    if (parsed.RESEND_API_KEY === undefined) {
      throw new Error('RESEND_API_KEY is required when NODE_ENV=production');
    }
  }
  if (willSendViaResend(parsed)) {
    const fromError = emailFromError(parsed.EMAIL_FROM);
    if (fromError !== undefined) {
      throw new Error(fromError);
    }
  }
  return parsed;
};

/**
 * Resolve the Resend From address. Required (and must not be resend.dev)
 * whenever we actually send via Resend — production, or any env with an API key.
 */
export const resolveEmailFrom = (
  env: Pick<Env, 'EMAIL_FROM' | 'NODE_ENV' | 'RESEND_API_KEY'>,
): string => {
  if (willSendViaResend(env)) {
    const fromError = emailFromError(env.EMAIL_FROM);
    if (fromError !== undefined) {
      throw new Error(fromError);
    }
    if (env.EMAIL_FROM === undefined) {
      throw new Error('EMAIL_FROM is required when sending mail via Resend');
    }
    return env.EMAIL_FROM;
  }
  return env.EMAIL_FROM ?? 'GymOS <dev@localhost>';
};

/** Resolve OTP pepper — fixed local fallback so pglite/dev works without .env. */
export const resolveOtpPepper = (env: Pick<Env, 'OTP_PEPPER' | 'NODE_ENV'>): string => {
  if (env.OTP_PEPPER !== undefined) return env.OTP_PEPPER;
  if (env.NODE_ENV === 'production') {
    throw new Error('OTP_PEPPER is required when NODE_ENV=production');
  }
  return 'dev-otp-pepper-not-for-production-use!!';
};
