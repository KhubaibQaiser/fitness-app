import { readFileSync } from 'node:fs';
import { z } from 'zod';

/**
 * Tenant manifest — config-not-code. The pilot loads one committed file;
 * P0 swaps the loader for the registry-backed config service (same type).
 */
export const tenantManifestSchema = z
  .object({
    version: z.number().int().positive(),
    slug: z.string().regex(/^[a-z0-9-]+$/),
    name: z.string().min(1),
    branding: z.object({
      appName: z.string().min(1),
      colors: z.object({
        primary: z.string().regex(/^#[0-9a-fA-F]{6}$/),
        accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      }),
      radius: z.enum(['sharp', 'soft', 'round']).default('soft'),
    }),
    terminology: z.record(z.string(), z.string()).default({}),
    locales: z.object({
      default: z.enum(['en', 'ur']),
      enabled: z.array(z.enum(['en', 'ur'])).min(1),
    }),
    currency: z.enum(['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR']),
    units: z.enum(['metric', 'imperial']),
    aiConfig: z.object({
      cuisineContext: z.string().default('pakistani'),
      mealCount: z.union([z.literal(3), z.literal(4), z.literal(5)]).default(4),
      kcalTolerancePct: z.number().min(1).max(10).default(5),
      macroTolerancePct: z.number().min(5).max(20).default(10),
      budgetTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
      prepTimeCeilingMin: z.number().int().positive().default(45),
      verbosity: z.enum(['terse', 'standard']).default('standard'),
      monthlyGenerationQuota: z.number().int().positive().default(500),
    }),
  })
  .strict();

export type TenantManifest = z.infer<typeof tenantManifestSchema>;

let cached: TenantManifest | null = null;

export const loadManifest = (path: string): TenantManifest => {
  if (cached !== null) return cached;
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  cached = tenantManifestSchema.parse(raw);
  return cached;
};

/** Test seam. */
export const resetManifestCache = (): void => {
  cached = null;
};
