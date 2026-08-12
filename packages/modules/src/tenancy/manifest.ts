import { readFileSync } from 'node:fs';
import { z } from 'zod';

export const LOCALE_CODES = ['en', 'ur'] as const;
export type LocaleCode = (typeof LOCALE_CODES)[number];

export const CURRENCY_CODES = ['PKR', 'USD', 'EUR', 'GBP', 'AED', 'SAR'] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

/**
 * Tenant manifest — config-not-code. Prefer the DB registry
 * (`getManifestForOrg` in ./registry.ts). `loadManifest(path)` remains for
 * bootstrap / tests that have no DB yet.
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
      default: z.enum(LOCALE_CODES),
      enabled: z.array(z.enum(LOCALE_CODES)).min(1),
    }),
    currency: z.enum(CURRENCY_CODES),
    units: z.enum(['metric', 'imperial']),
    defaultCountry: z
      .string()
      .length(2)
      .regex(/^[A-Z]{2}$/)
      .default('PK'),
    unitPrefs: z
      .object({
        weight: z.enum(['kg', 'lb']),
        height: z.enum(['cm', 'ft_in']),
        length: z.enum(['cm', 'in']),
      })
      .default({ weight: 'kg', height: 'ft_in', length: 'in' }),
    aiConfig: z.object({
      cuisineContext: z.string().default('pakistani'),
      mealCount: z.union([z.literal(3), z.literal(4), z.literal(5)]).default(3),
      kcalTolerancePct: z.number().min(1).max(10).default(5),
      macroTolerancePct: z.number().min(5).max(20).default(10),
      budgetTier: z.union([z.literal(1), z.literal(2), z.literal(3)]).default(2),
      prepTimeCeilingMin: z.number().int().positive().default(45),
      verbosity: z.enum(['terse', 'standard']).default('standard'),
      monthlyGenerationQuota: z.number().int().positive().default(500),
      /** Minority prompt canary — applied with promptCanaryPercent probability. */
      promptVersionCanary: z.string().min(1).optional(),
      promptCanaryPercent: z.number().min(0).max(100).optional(),
      /** Optional cuisine / phrasing pack id (packages/ai prompts/packs). */
      promptPackId: z.string().min(1).optional(),
      featureFlags: z
        .object({
          promptVersion: z.string().min(1).optional(),
          adapterVersion: z.string().min(1).optional(),
          /** Override process AI_MODE for this tenant when set. */
          aiMode: z.enum(['local', 'fallback', 'hosted']).optional(),
        })
        .strict()
        .optional(),
    }),
  })
  .strict();

export type TenantManifest = z.infer<typeof tenantManifestSchema>;

/** Process-local cache for the deprecated file loader only. */
let cached: TenantManifest | null = null;

/**
 * Bootstrap / test loader from a committed JSON file.
 * @deprecated Prefer per-org registry (`getManifestForOrg` / `readManifestFile`).
 */
export const loadManifest = (path: string): TenantManifest => {
  if (cached !== null) return cached;
  const raw: unknown = JSON.parse(readFileSync(path, 'utf8'));
  cached = tenantManifestSchema.parse(raw);
  return cached;
};

/** Test seam for the deprecated file loader. */
export const resetManifestCache = (): void => {
  cached = null;
};
