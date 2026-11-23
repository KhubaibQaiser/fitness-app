import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Db } from '@gymos/db';
import { tenantManifestSchema } from '@gymos/modules/tenancy';
import { buildApp } from '../src/app';
import { resolveRequestId } from '../src/request-id';

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

// A malformed login body is rejected (422) before the database is touched.
const app = buildApp({
  db: {} as Db,
  manifest,
  env: {
    JWT_ACCESS_SECRET: 'a-test-jwt-access-secret-that-is-long-enough',
    AI_MODE: 'fallback',
  },
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const badLogin = async (requestId: string) => {
  const res = await app.request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-request-id': requestId },
    body: JSON.stringify({ email: 'not-an-email' }),
  });
  const body = (await res.json()) as { requestId?: string };
  return { header: res.headers.get('x-request-id'), body };
};

describe('incoming x-request-id (ruling O15)', () => {
  it.each([
    ['longer than 128 characters', 'a'.repeat(129)],
    ['with a disallowed character', '<script>alert(1)</script>'],
    ['with a space', 'two words'],
  ])('ignores one %s and generates a fresh id', async (_label, incoming) => {
    const { header, body } = await badLogin(incoming);
    expect(header).not.toBe(incoming);
    expect(header).toMatch(UUID);
    expect(body.requestId).toBe(header);
  });

  it.each([
    ['a UUID', '3f1c2a9e-7b4d-4e8a-9c2f-1a2b3c4d5e6f'],
    ['letters, digits, "-", "_" and "."', 'edge.proxy_01-AbC'],
    ['exactly 128 characters', 'a'.repeat(128)],
  ])('reuses %s', async (_label, incoming) => {
    const { header, body } = await badLogin(incoming);
    expect(header).toBe(incoming);
    expect(body.requestId).toBe(incoming);
  });
});

// Header values with control characters can't be built into a Request, so the rule is
// also checked on the helper directly.
describe('resolveRequestId', () => {
  it.each([
    ['a newline', 'abc\ndef'],
    ['a carriage return', 'abc\rdef'],
    ['an empty value', ''],
    ['a missing header', undefined],
  ])('generates a fresh id for %s', (_label, incoming) => {
    expect(resolveRequestId(incoming)).toMatch(UUID);
  });

  it('keeps a valid id', () => {
    expect(resolveRequestId('req-42.a_b')).toBe('req-42.a_b');
  });
});
