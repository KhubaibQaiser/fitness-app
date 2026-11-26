import { readFileSync } from 'node:fs';
import path from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Hono } from 'hono';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { hashPassword } from '@gymos/modules/identity';
import {
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';
import { createClientIpResolver } from '../src/client-ip';
import { type GymosVars } from '../src/http';

const JWT_SECRET = 'a-test-jwt-access-secret-that-is-long-enough';
const PASSWORD = 'login-throttle-test-password';
const COACH = 'coach@pilot.local';
const RATE_LIMITED = {
  type: 'https://gymos.app/problems/rate-limited',
  title: 'Too many attempts. Wait a minute',
  status: 429,
  code: 'RATE_LIMITED',
};

const manifest = tenantManifestSchema.parse(
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../../../infra/tenants/pilot.json'), 'utf8'),
  ),
);

let db: Db;
/** Built with VERCEL=1, so `x-real-ip` is the trusted client IP. */
let onVercel: App;
/** No platform and no Node socket (app.request), so callers have no trusted IP. */
let noTrustedIp: App;

const login = async (
  app: App,
  email: string,
  password: string,
  headers: Record<string, string> = {},
): Promise<Response> =>
  await app.request('/v1/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify({ email, password }),
  });

const ip = (n: number) => ({ 'x-real-ip': `203.0.113.${n}` });

beforeAll(async () => {
  resetManifestCache();
  resetRegistryCache();
  const pglite = drizzle(new PGlite(), { schema: s });
  await migrate(pglite, {
    migrationsFolder: path.resolve(import.meta.dirname, '../../../packages/db/migrations'),
  });
  db = pglite as unknown as Db;
  await seed(db, {
    coachPasswordHash: await hashPassword(PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  });
  const env = { JWT_ACCESS_SECRET: JWT_SECRET, AI_MODE: 'fallback' as const };
  vi.stubEnv('VERCEL', '1');
  onVercel = buildApp({ db, manifest, env });
  vi.unstubAllEnvs();
  vi.stubEnv('VERCEL', '');
  vi.stubEnv('RENDER', '');
  noTrustedIp = buildApp({ db, manifest, env });
  vi.unstubAllEnvs();
});

beforeEach(async () => {
  await db.delete(s.rateLimits);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('login rate limiting', () => {
  it('keys the per-IP limit on the trusted IP, not on x-forwarded-for', async () => {
    const statuses: number[] = [];
    for (let k = 0; k < 11; k += 1) {
      // A different unknown email each time, so only the per-IP limit can trip.
      const res = await login(onVercel, `nobody${k}@example.com`, 'wrong-password-1', {
        ...ip(7),
        'x-forwarded-for': `198.51.100.${k}`,
      });
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 10)).toEqual(Array.from({ length: 10 }, () => 401));
    expect(statuses[10]).toBe(429);
  });

  it('limits failures per account across client IPs, the same for unknown emails', async () => {
    for (const email of [COACH, 'nobody@example.com']) {
      const statuses: number[] = [];
      for (let k = 0; k < 5; k += 1) {
        statuses.push(
          (await login(onVercel, email.toUpperCase(), 'wrong-password-1', ip(k))).status,
        );
      }
      expect(statuses).toEqual([401, 401, 401, 401, 401]);
      // The right password from yet another IP is refused while the account backs off.
      const blocked = await login(onVercel, email, PASSWORD, ip(50));
      expect(blocked.status).toBe(429);
    }
  });

  it('clears the failure count on a successful sign-in', async () => {
    const statuses: number[] = [];
    for (let k = 0; k < 4; k += 1)
      statuses.push((await login(onVercel, COACH, 'nope-nope-1', ip(k))).status);
    statuses.push((await login(onVercel, COACH, PASSWORD, ip(9))).status);
    for (let k = 0; k < 5; k += 1)
      statuses.push((await login(onVercel, COACH, 'nope-nope-1', ip(k))).status);
    statuses.push((await login(onVercel, COACH, PASSWORD, ip(9))).status);
    expect(statuses).toEqual([401, 401, 401, 401, 200, 401, 401, 401, 401, 401, 429]);
  });

  it('accepts the right password again once the back-off has passed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-11-26T09:00:00Z'));
    for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);

    vi.setSystemTime(new Date('2026-11-26T09:00:59Z'));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);
    vi.setSystemTime(new Date('2026-11-26T09:01:01Z'));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(200);
  });

  it('never puts callers without a trusted IP in one shared bucket', async () => {
    // Caller A, with x-forwarded-for values that must be ignored, trips its own account's limit.
    for (let k = 0; k < 11; k += 1) {
      await login(noTrustedIp, 'caller-a@example.com', 'wrong-password-1', {
        'x-forwarded-for': '127.0.0.1',
      });
    }
    expect((await login(noTrustedIp, 'caller-a@example.com', 'wrong-password-1')).status).toBe(429);
    // Caller B still signs in.
    expect((await login(noTrustedIp, COACH, PASSWORD)).status).toBe(200);
  });

  it('keeps the 429 body the login screen maps', async () => {
    for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
    const res = await login(onVercel, COACH, 'nope-nope-1', ip(9));
    expect(res.status).toBe(429);
    expect(res.headers.get('content-type')).toBe('application/problem+json');
    const { requestId, ...body } = (await res.json()) as Record<string, unknown>;
    expect(typeof requestId).toBe('string');
    expect(body).toEqual(RATE_LIMITED);
  });
});

describe('createClientIpResolver', () => {
  const resolve = async (
    platform: { VERCEL?: string; RENDER?: string },
    headers: Record<string, string>,
    socket?: string,
  ): Promise<string | null> => {
    const clientIp = createClientIpResolver(platform);
    const probe = new Hono<{ Variables: GymosVars }>().get('/', (c) => c.json({ ip: clientIp(c) }));
    const bindings =
      socket === undefined ? undefined : { incoming: { socket: { remoteAddress: socket } } };
    const res = await probe.request('/', { headers }, bindings);
    return ((await res.json()) as { ip: string | null }).ip;
  };
  const forwardingHeaders = {
    'x-forwarded-for': '198.51.100.1',
    'x-real-ip': '198.51.100.2',
    'cf-connecting-ip': '198.51.100.3',
  };

  it('reads x-real-ip on Vercel and cf-connecting-ip on Render, nothing else', async () => {
    expect(await resolve({ VERCEL: '1' }, forwardingHeaders)).toBe('198.51.100.2');
    expect(await resolve({ RENDER: 'true' }, forwardingHeaders)).toBe('198.51.100.3');
    expect(await resolve({ VERCEL: '1' }, { 'x-forwarded-for': '198.51.100.1' })).toBeNull();
  });

  it('rejects a header that is not one IP address', async () => {
    expect(await resolve({ VERCEL: '1' }, { 'x-real-ip': '198.51.100.2, 10.0.0.1' })).toBeNull();
    expect(await resolve({ RENDER: 'true' }, { 'cf-connecting-ip': 'local' })).toBeNull();
  });

  it('uses the socket address elsewhere and ignores forwarding headers', async () => {
    expect(await resolve({}, forwardingHeaders, '192.0.2.10')).toBe('192.0.2.10');
    expect(await resolve({}, forwardingHeaders)).toBeNull();
  });
});
