import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
  rewrites: { source: string; destination: string }[];
  functions: Record<string, { includeFiles: string }>;
};

describe('vercel.json (ADR-0016)', () => {
  it('routes every path to the single function', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/api' });
    expect(existsSync(path.join(root, 'api/index.ts'))).toBe(true);
  });

  it('bundles the tenant manifest the API reads at startup', () => {
    const include = config.functions['api/index.ts']?.includeFiles ?? '';
    const dir = path.resolve(root, include.replace(/\/\*\*$/, ''));
    expect(existsSync(path.join(dir, 'pilot.json'))).toBe(true);
  });
});
