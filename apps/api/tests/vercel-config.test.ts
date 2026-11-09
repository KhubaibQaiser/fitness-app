import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const config = JSON.parse(readFileSync(path.join(root, 'vercel.json'), 'utf8')) as {
  rewrites: { source: string; destination: string }[];
  functions: Record<string, { includeFiles: string; maxDuration?: number }>;
  crons: { path: string; schedule: string }[];
};

describe('vercel.json (ADR-0016)', () => {
  it('routes every path to the single function', () => {
    expect(config.rewrites).toContainEqual({ source: '/(.*)', destination: '/api' });
    expect(existsSync(path.join(root, 'api/index.ts'))).toBe(true);
  });

  it('bundles the tenants/ copy that the Vercel build makes from infra/tenants (placement is only proven by a deploy)', () => {
    expect(config.functions['api/index.ts']?.includeFiles).toBe('tenants/**');
    expect(existsSync(path.resolve(root, '../../infra/tenants/pilot.json'))).toBe(true);
    const tf = readFileSync(path.resolve(root, '../../infra/paas/vercel.tf'), 'utf8');
    expect(tf).toMatch(
      /build_command\s*=\s*"[^"]*cp \.\.\/\.\.\/infra\/tenants\/\*\.json tenants\/"/,
    );
  });

  it('has exactly one daily nightly cron (Hobby allows once a day)', () => {
    expect(config.crons).toEqual([{ path: '/internal/cron/nightly', schedule: '5 21 * * *' }]);
  });

  it('gives the function enough time to run all four nightly jobs in one invocation', () => {
    expect(config.functions['api/index.ts']?.maxDuration).toBe(60);
  });
});
