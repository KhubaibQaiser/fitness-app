import { z } from 'zod';
import { DEFAULT_DEV_EMAIL_FROM, productionEmailFromError } from '@gymos/modules/identity';

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
   * Local default is Resend's testing domain (account-owner inbox only).
   * Production requires a verified custom domain (mailbox need not exist).
   */
  EMAIL_FROM: z.string().min(3).optional(),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  /**
   * Seed-only password for the pilot coach (`coach@pilot.local`).
   * Required at seed time; not used at runtime after the hash is stored.
   */
  PILOT_COACH_PASSWORD: z.string().min(12).optional(),
  /**
   * @deprecated Retained so existing .env files keep parsing during the auth cutover.
   * Gate cookie auth is retired; login uses JWT + refresh sessions.
   */
  PILOT_ACCESS_KEY: z.string().min(16).optional(),
  /**
   * @deprecated Retained for .env compatibility; unused after JWT cutover.
   */
  GATE_COOKIE_SECRET: z.string().min(32).optional(),
  TENANT_MANIFEST_PATH: z.string().min(1),
  AI_MODE: z.enum(['local', 'fallback', 'hosted']).default('fallback'),
  AI_BASE_URL: z.url().optional(),
  AI_MODEL: z.string().optional(),
  AI_API_KEY: z.string().optional(),
  AI_ADAPTER_VERSION: z.string().min(1).optional(),
  PORT: z.coerce.number().int().positive().default(8080),
});

export type Env = z.infer<typeof envSchema>;

export const loadEnv = (source: Record<string, string | undefined>): Env => {
  const parsed = envSchema.parse(source);
  if (parsed.NODE_ENV === 'production') {
    if (parsed.OTP_PEPPER === undefined) {
      throw new Error('OTP_PEPPER is required when NODE_ENV=production');
    }
    if (parsed.RESEND_API_KEY === undefined) {
      throw new Error('RESEND_API_KEY is required when NODE_ENV=production');
    }
    const fromError = productionEmailFromError(parsed.EMAIL_FROM);
    if (fromError !== undefined) {
      throw new Error(fromError);
    }
  }
  return parsed;
};

/**
 * Resolve the Resend From address. Production refuses `resend.dev`; local/test
 * falls back to the testing domain when EMAIL_FROM is unset.
 */
export const resolveEmailFrom = (env: Pick<Env, 'EMAIL_FROM' | 'NODE_ENV'>): string => {
  if (env.NODE_ENV !== 'production') {
    return env.EMAIL_FROM ?? DEFAULT_DEV_EMAIL_FROM;
  }
  const fromError = productionEmailFromError(env.EMAIL_FROM);
  if (fromError !== undefined) {
    throw new Error(fromError);
  }
  if (env.EMAIL_FROM === undefined) {
    throw new Error('EMAIL_FROM is required when NODE_ENV=production');
  }
  return env.EMAIL_FROM;
};

/** Resolve OTP pepper — fixed local fallback so pglite/dev works without .env. */
export const resolveOtpPepper = (env: Pick<Env, 'OTP_PEPPER' | 'NODE_ENV'>): string => {
  if (env.OTP_PEPPER !== undefined) return env.OTP_PEPPER;
  if (env.NODE_ENV === 'production') {
    throw new Error('OTP_PEPPER is required when NODE_ENV=production');
  }
  return 'dev-otp-pepper-not-for-production-use!!';
};
