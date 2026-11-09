import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');

describe('Vercel bundle (ADR-0016)', () => {
  it('builds a self-contained function that loads without missing modules', async () => {
    execFileSync('node', ['scripts/build-vercel.mjs'], { cwd: root, stdio: 'pipe' });
    const fn = path.join(root, '.vercel/output/functions/api.func');
    expect(existsSync(path.join(fn, 'tenants/pilot.json'))).toBe(true);
    // A workspace package left unbundled (TypeScript source) fails here with ERR_MODULE_NOT_FOUND.
    const mod = (await import(pathToFileURL(path.join(fn, 'index.mjs')).href)) as {
      default: unknown;
    };
    expect(mod.default).toBeTypeOf('function');
  }, 60_000);
});
