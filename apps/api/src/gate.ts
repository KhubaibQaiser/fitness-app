import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Pilot access gate — no user accounts, but the API is never open.
 * Cookie value: `v1.<expiresEpochMs>.<hmacSha256(expires, secret)>`.
 * P0 replaces this middleware with real sessions; downstream is untouched.
 */
const COOKIE_VERSION = 'v1';
export const GATE_COOKIE_NAME = 'gymos_gate';
export const GATE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days, rolling

const hmac = (payload: string, secret: string): string =>
  createHmac('sha256', secret).update(payload).digest('base64url');

export const issueGateCookie = (secret: string, now = Date.now()): string => {
  const expires = String(now + GATE_TTL_MS);
  return `${COOKIE_VERSION}.${expires}.${hmac(expires, secret)}`;
};

export const verifyGateCookie = (
  value: string | undefined,
  secret: string,
  now = Date.now(),
): boolean => {
  if (value === undefined) return false;
  const [version, expires, signature] = value.split('.');
  if (version !== COOKIE_VERSION || expires === undefined || signature === undefined) return false;
  const expected = hmac(expires, secret);
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return false;
  return Number(expires) > now;
};

/** Constant-time access-key comparison over fixed-length digests. */
export const verifyAccessKey = (candidate: string, actual: string): boolean => {
  const a = createHash('sha256').update(candidate).digest();
  const b = createHash('sha256').update(actual).digest();
  return timingSafeEqual(a, b);
};

/** In-process fixed-window rate limiter (single-instance pilot). */
export const createRateLimiter = (limit: number, windowMs: number) => {
  const hits = new Map<string, { count: number; windowStart: number }>();
  return (key: string, now = Date.now()): boolean => {
    const entry = hits.get(key);
    if (!entry || now - entry.windowStart >= windowMs) {
      hits.set(key, { count: 1, windowStart: now });
      return true;
    }
    entry.count += 1;
    return entry.count <= limit;
  };
};
