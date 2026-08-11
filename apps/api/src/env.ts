import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  /**
   * HS256 secret for short-lived access JWTs (≥32 bytes).
   * Generate: `openssl rand -hex 32`
   */
  JWT_ACCESS_SECRET: z.string().min(32, 'use at least 256 bits: openssl rand -hex 32'),
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

export const loadEnv = (source: Record<string, string | undefined>): Env => envSchema.parse(source);
