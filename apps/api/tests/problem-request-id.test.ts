import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { type Db } from '@gymos/db';
import { tenantManifestSchema } from '@gymos/modules/tenancy';
import { buildApp } from '../src/app';

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

const badLogin = (headers: Record<string, string> = {}) =>
  app.request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ email: 'not-an-email' }),
  });

describe('problem responses carry the request reference', () => {
  it('puts the generated requestId in the body and the x-request-id header', async () => {
    const res = await badLogin();
    expect(res.status).toBe(422);
    const body = (await res.json()) as { code: string; requestId?: string };
    expect(body.code).toBe('VALIDATION_FAILED');
    expect(body.requestId).toEqual(expect.any(String));
    expect(res.headers.get('x-request-id')).toBe(body.requestId);
  });

  it('reuses an incoming x-request-id', async () => {
    const res = await badLogin({ 'x-request-id': 'req-from-proxy-42' });
    const body = (await res.json()) as { requestId?: string };
    expect(body.requestId).toBe('req-from-proxy-42');
  });

  it('documents requestId as an optional string on the Problem schema', () => {
    const doc = app.getOpenAPI31Document({
      openapi: '3.1.0',
      info: { title: 'GymOS Pilot API', version: '1.0.0' },
    });
    const problem = doc.components?.schemas?.Problem as
      { properties?: Record<string, { type?: string }>; required?: string[] } | undefined;
    expect(problem?.properties?.requestId?.type).toBe('string');
    expect(problem?.required).not.toContain('requestId');
  });
});
