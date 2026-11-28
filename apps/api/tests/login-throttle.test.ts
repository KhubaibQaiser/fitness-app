import { readFileSync } from 'node:fs';
import path from 'node:path';
import { inspect } from 'node:util';
import { PGlite } from '@electric-sql/pglite';
import { DrizzleQueryError, type SQL } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { Hono } from 'hono';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { schema as s, seed, type Db } from '@gymos/db';
import { createMemoryEmailSender, hashPassword, setUserPassword } from '@gymos/modules/identity';
import {
  resetManifestCache,
  resetRegistryCache,
  tenantManifestSchema,
} from '@gymos/modules/tenancy';
import { buildApp, type App } from '../src/app';
import { createClientIpResolver, rateLimitKey } from '../src/client-ip';
import { type GymosVars } from '../src/http';
import { createAccountLimiter, createDbRateLimiter } from '../src/rate-limit';

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
let coachUserId = '';
const mail = createMemoryEmailSender();
/** VERCEL=1: the client IP is `x-real-ip`. */
let onVercel: App;
/** RENDER=true: no client IP, so the per-account limit and the route-wide cap apply. */
let onRender: App;
/** No host and no Node socket (app.request): no client IP either. */
let noClientIp: App;

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
  ({ coachUserId } = await seed(db, {
    coachPasswordHash: await hashPassword(PASSWORD),
    tenantManifest: manifest as unknown as Record<string, unknown>,
    tenantSlug: manifest.slug,
  }));
  const env = { JWT_ACCESS_SECRET: JWT_SECRET, AI_MODE: 'fallback' as const };
  onVercel = buildApp({ db, manifest, env: { ...env, VERCEL: '1' }, mail });
  onRender = buildApp({ db, manifest, env: { ...env, RENDER: 'true' } });
  noClientIp = buildApp({ db, manifest, env });
});

/** Logs in `count` times as different unknown emails, so only the IP limits can trip. */
const manyCallers = async (
  app: App,
  count: number,
  headers: (k: number) => Record<string, string>,
) => {
  const statuses: number[] = [];
  for (let k = 0; k < count; k += 1) {
    statuses.push(
      (await login(app, `caller${k}@example.com`, 'wrong-password-1', headers(k))).status,
    );
  }
  return statuses;
};
const all401 = (n: number) => Array.from({ length: n }, () => 401);

beforeEach(async () => {
  await db.delete(s.rateLimits);
  // A frozen clock keeps every attempt in one fixed-window minute.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-26T08:00:05Z'));
});

afterEach(() => {
  vi.useRealTimers();
});

describe('login rate limiting', () => {
  it('counts the per-IP limit by the host-provided IP', async () => {
    const statuses = await manyCallers(onVercel, 11, (k) => ({
      ...ip(7),
      'x-forwarded-for': `198.51.100.${k}`,
    }));
    expect(statuses).toEqual([...all401(10), 429]);
  });

  it('counts IPv6 addresses in one /64 as one caller, and another /64 separately', async () => {
    const sameSubnet = ['2001:db8:1:2::a', '2001:DB8:1:2:ffff::b', '2001:db8:0001:0002:0:0:0:c'];
    const statuses = await manyCallers(onVercel, 11, (k) => ({
      'x-real-ip': sameSubnet[k % sameSubnet.length] ?? '',
    }));
    expect(statuses).toEqual([...all401(10), 429]);
    const otherSubnet = await login(onVercel, 'v6-other@example.com', 'wrong-password-1', {
      'x-real-ip': '2001:db8:1:3::a',
    });
    expect(otherSubnet.status).toBe(401);
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
    vi.setSystemTime(new Date('2026-11-26T09:00:00Z'));
    for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);

    vi.setSystemTime(new Date('2026-11-26T09:00:59Z'));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);
    vi.setSystemTime(new Date('2026-11-26T09:01:01Z'));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(200);
  });

  it('gives callers with no client IP their own account limits, not one per-IP bucket', async () => {
    for (let k = 0; k < 11; k += 1) {
      await login(noClientIp, 'caller-a@example.com', 'wrong-password-1', {
        'x-forwarded-for': '127.0.0.1',
      });
    }
    expect((await login(noClientIp, 'caller-a@example.com', 'wrong-password-1')).status).toBe(429);
    expect((await login(noClientIp, COACH, PASSWORD)).status).toBe(200);
  });

  it('caps sign-ins with no client IP at 60 a minute for the route', async () => {
    expect(await manyCallers(noClientIp, 61, () => ({}))).toEqual([...all401(60), 429]);
  });

  it('on Render, uses the route-wide cap whatever the request headers say', async () => {
    const statuses = await manyCallers(onRender, 61, (k) => ({
      'cf-connecting-ip': '198.51.100.3',
      'x-real-ip': `198.51.100.${k % 2}`,
      'x-forwarded-for': `198.51.100.${k}`,
    }));
    expect(statuses).toEqual([...all401(60), 429]);
    expect((await login(onRender, COACH, PASSWORD)).status).toBe(429);
  });

  it('doubles the back-off after each further failure, up to 15 minutes', async () => {
    let at = Date.parse('2026-11-26T09:00:00Z');
    vi.setSystemTime(at);
    for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
    for (const minutes of [1, 2, 4, 8, 15]) {
      vi.setSystemTime(at + minutes * 60_000 - 1_000);
      expect((await login(onVercel, COACH, PASSWORD, ip(9))).status, `${minutes} min`).toBe(429);
      at += minutes * 60_000 + 1_000;
      vi.setSystemTime(at);
      expect((await login(onVercel, COACH, 'nope-nope-1', ip(9))).status, `${minutes} min`).toBe(
        401,
      );
    }
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(200);
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

  it('reads x-real-ip on Vercel; on Render returns null', async () => {
    expect(await resolve({ VERCEL: '1' }, forwardingHeaders)).toBe('198.51.100.2');
    expect(await resolve({ VERCEL: '1' }, { 'x-forwarded-for': '198.51.100.1' })).toBeNull();
    expect(await resolve({ RENDER: 'true' }, forwardingHeaders, '10.0.0.5')).toBeNull();
  });

  it('returns null for an x-real-ip that is not one IP address', async () => {
    expect(await resolve({ VERCEL: '1' }, { 'x-real-ip': '198.51.100.2, 10.0.0.1' })).toBeNull();
    expect(await resolve({ VERCEL: '1' }, { 'x-real-ip': 'local' })).toBeNull();
  });

  it('uses the socket address elsewhere, not the forwarding headers', async () => {
    expect(await resolve({}, forwardingHeaders, '192.0.2.10')).toBe('192.0.2.10');
    expect(await resolve({}, forwardingHeaders)).toBeNull();
  });
});

describe('rateLimitKey', () => {
  it.each([
    ['IPv4 stays per address', '203.0.113.7', '203.0.113.7'],
    ['IPv6 groups by /64', '2001:DB8:0:0:1::1', '2001:db8:0:0::/64'],
    ['full IPv6 form', '2001:0db8:0001:0002:0003:0004:0005:0006', '2001:db8:1:2::/64'],
    ['loopback', '::1', '0:0:0:0::/64'],
    ['IPv4-mapped, dotted', '::ffff:192.0.2.1', '192.0.2.1'],
    ['IPv4-mapped, full form', '0:0:0:0:0:ffff:192.0.2.1', '192.0.2.1'],
    ['IPv4-mapped, hex form', '::ffff:c000:201', '192.0.2.1'],
    ['IPv4-mapped, full hex form', '0:0:0:0:0:FFFF:C000:0201', '192.0.2.1'],
    ['not mapped (ffff in another group)', '::ffff:0:c000:201', '0:0:0:0::/64'],
    ['zone id is dropped', 'fe80::1%eth0', 'fe80:0:0:0::/64'],
  ])('%s', (_label, ip, key) => {
    expect(rateLimitKey(ip)).toBe(key);
  });
});

describe('password reset and the sign-in back-off', () => {
  const NEW_PASSWORD = 'login-throttle-new-password';
  const post = (pathName: string, body: Record<string, string>) =>
    onVercel.request(pathName, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...ip(30) },
      body: JSON.stringify(body),
    });
  /** Asks for a reset code for the coach and returns the code that was emailed. */
  const resetCode = async (): Promise<string> => {
    expect((await post('/v1/auth/password/forgot', { email: COACH })).status).toBe(200);
    const sent = mail.sent.at(-1);
    if (sent?.to !== COACH) throw new Error('no reset email was sent');
    return sent.code;
  };

  afterEach(async () => {
    await setUserPassword(db, coachUserId, PASSWORD);
  });

  it('clears the back-off on a completed reset, so the new password signs in at once', async () => {
    for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);

    const code = await resetCode();
    const reset = await post('/v1/auth/password/reset', {
      email: COACH.toUpperCase(),
      code,
      newPassword: NEW_PASSWORD,
    });
    expect(reset.status).toBe(200);
    expect((await login(onVercel, COACH, NEW_PASSWORD, ip(9))).status).toBe(200);
  });

  it('keeps the back-off after a failed or expired reset', async () => {
    // Into the 15-minute back-off: 5 failures, then one more as each back-off ends.
    let at = Date.parse('2026-11-26T09:00:00Z');
    vi.setSystemTime(at);
    for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
    for (const minutes of [1, 2, 4, 8]) {
      at += minutes * 60_000 + 1_000;
      vi.setSystemTime(at);
      expect((await login(onVercel, COACH, 'nope-nope-1', ip(9))).status).toBe(401);
    }

    const code = await resetCode();
    const wrong = await post('/v1/auth/password/reset', {
      email: COACH,
      code: code === '000000' ? '111111' : '000000',
      newPassword: NEW_PASSWORD,
    });
    expect(wrong.status).toBe(401);
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);

    vi.setSystemTime(at + 11 * 60_000);
    const expired = await post('/v1/auth/password/reset', {
      email: COACH,
      code,
      newPassword: NEW_PASSWORD,
    });
    expect(expired.status).toBe(401);
    expect(((await expired.json()) as { code: string }).code).toBe('OTP_EXPIRED');
    expect((await login(onVercel, COACH, PASSWORD, ip(9))).status).toBe(429);
  });
});

describe('limiter log lines', () => {
  const EMAIL = 'someone@example.com';
  /** A store whose every query fails the way drizzle reports it: message and params hold the key. */
  const failingStore = {
    execute: (query: SQL) => {
      const { sql: text, params } = new PgDialect().sqlToQuery(query);
      const cause = Object.assign(new Error(`connection lost while running ${text}`), {
        code: '57P01',
      });
      return Promise.reject(new DrizzleQueryError(text, params, cause));
    },
  } as unknown as Db;

  /** Every console.error argument, inspected in full (hidden properties and causes too). */
  const logged = (spy: { mock: { calls: unknown[][] } }): string =>
    spy.mock.calls.map((args) => inspect(args, { depth: Infinity, showHidden: true })).join('\n');

  it.each([
    [
      'the shared limiter',
      `signup:email:${EMAIL}`,
      () => createDbRateLimiter(failingStore, 3, 60_000)(`signup:email:${EMAIL}`),
      true,
      { limiter: 'signup:email', operation: 'count' },
    ],
    [
      'the account attempt',
      `login:account:${EMAIL}`,
      () => createAccountLimiter(failingStore).attempt(`login:account:${EMAIL}`),
      true,
      { limiter: 'login:account', operation: 'attempt' },
    ],
    [
      'the account clear',
      `login:account:${EMAIL}`,
      () => createAccountLimiter(failingStore).reset(`login:account:${EMAIL}`),
      undefined,
      { limiter: 'login:account', operation: 'clear' },
    ],
  ] as const)(
    '%s logs which limiter and operation failed, never the key or the email',
    async (_label, key, run, result, fields) => {
      const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      try {
        expect(await run()).toBe(result);
        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy.mock.calls[0]?.[1]).toEqual({
          ...fields,
          error: { name: 'DrizzleQueryError' },
          cause: { name: 'Error', code: '57P01' },
        });
        const text = logged(spy);
        expect(text).not.toContain(EMAIL);
        expect(text).not.toContain(key);
      } finally {
        spy.mockRestore();
      }
    },
  );

  it('a failed clear after a completed reset keeps the reset, and logs without the email', async () => {
    const realExecute = db.execute.bind(db);
    const execute = vi.spyOn(db, 'execute').mockImplementation(((query: SQL) => {
      const { sql: text } = new PgDialect().sqlToQuery(query);
      return text.startsWith('delete from rate_limits')
        ? failingStore.execute(query)
        : realExecute(query);
    }) as typeof db.execute);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    try {
      for (let k = 0; k < 5; k += 1) await login(onVercel, COACH, 'nope-nope-1', ip(k));
      const forgot = await onVercel.request('/v1/auth/password/forgot', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...ip(30) },
        body: JSON.stringify({ email: COACH }),
      });
      expect(forgot.status).toBe(200);
      const code = mail.sent.at(-1)?.code ?? '';
      const reset = await onVercel.request('/v1/auth/password/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json', ...ip(30) },
        body: JSON.stringify({ email: COACH, code, newPassword: 'login-throttle-new-password' }),
      });
      expect(reset.status).toBe(200);
      expect(spy.mock.calls.map((args: unknown[]) => args[1])).toContainEqual(
        expect.objectContaining({ limiter: 'login:account', operation: 'clear' }),
      );
      expect(logged(spy)).not.toContain(COACH);
    } finally {
      spy.mockRestore();
      execute.mockRestore();
      await setUserPassword(db, coachUserId, PASSWORD);
    }
  });
});
