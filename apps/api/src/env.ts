import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PILOT_ACCESS_KEY: z.string().min(16, 'use at least 128 bits: openssl rand -hex 16'),
  GATE_COOKIE_SECRET: z.string().min(32, 'use at least 256 bits: openssl rand -hex 32'),
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
