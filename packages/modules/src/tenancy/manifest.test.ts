import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { tenantManifestSchema, weeklyDeltaKgFromManifest } from './manifest';

const pilotPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../../../../infra/tenants/pilot.json',
);

describe('tenant manifest nutrition pace', () => {
  it('parses pilot.json with Lose/Gain weekly kg overrides', () => {
    const manifest = tenantManifestSchema.parse(JSON.parse(readFileSync(pilotPath, 'utf8')));
    expect(weeklyDeltaKgFromManifest(manifest, 'LOSE', 'CONSERVATIVE')).toBe(-0.5);
    expect(weeklyDeltaKgFromManifest(manifest, 'LOSE', 'STANDARD')).toBe(-1);
    expect(weeklyDeltaKgFromManifest(manifest, 'LOSE', 'AGGRESSIVE')).toBe(-2);
    expect(weeklyDeltaKgFromManifest(manifest, 'GAIN', 'CONSERVATIVE')).toBe(0.25);
    expect(weeklyDeltaKgFromManifest(manifest, 'GAIN', 'STANDARD')).toBe(0.5);
    expect(weeklyDeltaKgFromManifest(manifest, 'GAIN', 'AGGRESSIVE')).toBe(1);
    expect(weeklyDeltaKgFromManifest(manifest, 'RECOMP', 'STANDARD')).toBeUndefined();
  });
});
