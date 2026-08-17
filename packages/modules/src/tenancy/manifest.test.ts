import { describe, expect, it } from 'vitest';
import { tenantManifestSchema, weeklyDeltaKgFromManifest } from './manifest';

describe('tenant manifest nutrition pace', () => {
  it('treats weeklyDeltaKg as optional — new defaults use GOAL_DELTA', () => {
    const manifest = tenantManifestSchema.parse({
      version: 1,
      slug: 'pilot',
      name: 'GymOS Pilot',
      branding: {
        appName: 'GymOS Coach',
        colors: { primary: '#1D4ED8', accent: '#2563EB' },
        radius: 'soft',
      },
      terminology: {},
      locales: { default: 'en', enabled: ['en', 'ur'] },
      currency: 'PKR',
      units: 'metric',
      defaultCountry: 'PK',
      unitPrefs: { weight: 'kg', height: 'ft_in', length: 'in' },
      aiConfig: { cuisineContext: 'pakistani' },
    });
    expect(weeklyDeltaKgFromManifest(manifest, 'LOSE', 'AGGRESSIVE')).toBeUndefined();
    expect(weeklyDeltaKgFromManifest(manifest, 'GAIN', 'STANDARD')).toBeUndefined();
  });

  it('still accepts a desired kg/week table as intent-only config', () => {
    const manifest = tenantManifestSchema.parse({
      version: 1,
      slug: 'legacy',
      name: 'Legacy',
      branding: {
        appName: 'GymOS Coach',
        colors: { primary: '#1D4ED8', accent: '#2563EB' },
        radius: 'soft',
      },
      terminology: {},
      locales: { default: 'en', enabled: ['en'] },
      currency: 'PKR',
      units: 'metric',
      defaultCountry: 'PK',
      aiConfig: { cuisineContext: 'pakistani' },
      nutrition: {
        weeklyDeltaKg: {
          LOSE: { CONSERVATIVE: -0.5, STANDARD: -1, AGGRESSIVE: -2 },
          GAIN: { CONSERVATIVE: 0.25, STANDARD: 0.5, AGGRESSIVE: 1 },
        },
      },
    });
    expect(weeklyDeltaKgFromManifest(manifest, 'LOSE', 'AGGRESSIVE')).toBe(-2);
    expect(weeklyDeltaKgFromManifest(manifest, 'RECOMP', 'STANDARD')).toBeUndefined();
  });
});
