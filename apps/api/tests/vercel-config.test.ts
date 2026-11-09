import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { functionConfig, outputConfig } from '../scripts/vercel-output.mjs';

const root = path.resolve(import.meta.dirname, '..');

describe('Vercel Build Output config (ADR-0016)', () => {
  it('routes every path to the single function', () => {
    expect(outputConfig().routes).toContainEqual({ src: '/(.*)', dest: '/api' });
  });

  it('has exactly one daily nightly cron (Hobby allows once a day)', () => {
    expect(outputConfig().crons).toEqual([
      { path: '/internal/cron/nightly', schedule: '5 21 * * *' },
    ]);
  });

  it('gives the function enough time to run all four nightly jobs in one invocation', () => {
    expect(functionConfig().maxDuration).toBe(60);
  });

  it('is built by the Vercel project from the bundling script and finds the manifest source', () => {
    const tf = readFileSync(path.resolve(root, '../../infra/paas/vercel.tf'), 'utf8');
    expect(tf).toMatch(/build_command\s*=\s*"node scripts\/build-vercel\.mjs"/);
    expect(readFileSync(path.resolve(root, '../../infra/tenants/pilot.json'), 'utf8')).toContain(
      '{',
    );
  });
});
