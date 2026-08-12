import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { beforeAll, describe, expect, it } from 'vitest';
import { schema, seed, type Db } from '@gymos/db';
import {
  createMemoryEmailSender,
  hashPassword,
  resetPrincipalCache,
} from '@gymos/modules/identity';
import {
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';

const JWT_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
const COACH_PASSWORD = 'pilot-coach-test-password';
const pepper = 'test-otp-pepper-at-least-32-characters!!';

let app: App;
let mail: ReturnType<typeof createMemoryEmailSender>;

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

const req = async (
  pathName: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<Response> => {
  const headers = new Headers(init.headers);
  if (init.json !== undefined) headers.set('content-type', 'application/json');
  return await app.request(pathName, {
    ...init,
    ...(init.json !== undefined ? { body: JSON.stringify(init.json) } : {}),
    headers,
  });
};

beforeAll(async () => {
  resetManifestCache();
  resetRegistryCache();
  resetPrincipalCache();
  const pglite = drizzle(new PGlite(), { schema });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
  });
  const db = pglite as unknown as Db;
  await seed(db, {
    coachPasswordHash: await hashPassword(COACH_PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  });
  mail = createMemoryEmailSender();
  app = buildApp({
    db,
    manifest,
    env: {
      JWT_ACCESS_SECRET: JWT_SECRET,
      AI_MODE: 'fallback',
      OTP_PEPPER: pepper,
      NODE_ENV: 'test',
    },
    mail,
  });
});

describe('coach signup + password reset API', () => {
  it('start → confirm → /v1/me for a new coach', async () => {
    const start = await req('/v1/auth/signup/coach/start', {
      method: 'POST',
      json: {
        name: 'API Coach',
        email: 'api-coach@example.com',
        phone: '03001234567',
        password: 'signup-password-99',
      },
    });
    expect(start.status).toBe(200);
    const code = mail.sent.find((m) => m.to === 'api-coach@example.com')?.code;
    expect(code).toMatch(/^\d{6}$/);

    const confirm = await req('/v1/auth/signup/coach/confirm', {
      method: 'POST',
      json: { email: 'api-coach@example.com', code },
    });
    expect(confirm.status).toBe(200);
    const tokens = (await confirm.json()) as { accessToken: string; me: { name: string } };
    expect(tokens.me.name).toBe('API Coach');

    const me = await app.request('/v1/me', {
      headers: { authorization: `Bearer ${tokens.accessToken}` },
    });
    expect(me.status).toBe(200);
  });

  it('forgot → reset → login', async () => {
    const before = mail.sent.length;
    const forgot = await req('/v1/auth/password/forgot', {
      method: 'POST',
      json: { email: 'coach@pilot.local' },
    });
    expect(forgot.status).toBe(200);
    const code = mail.sent.slice(before).find((m) => m.purpose === 'password_reset')?.code;
    expect(code).toMatch(/^\d{6}$/);

    const reset = await req('/v1/auth/password/reset', {
      method: 'POST',
      json: {
        email: 'coach@pilot.local',
        code,
        newPassword: 'reset-password-88',
      },
    });
    expect(reset.status).toBe(200);

    const login = await req('/v1/auth/login', {
      method: 'POST',
      json: { email: 'coach@pilot.local', password: 'reset-password-88' },
    });
    expect(login.status).toBe(200);
  });
});
