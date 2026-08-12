import { createHash, randomInt, timingSafeEqual } from 'node:crypto';
import { and, desc, eq, gt, isNull } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { dbTimestampToMillis, nowIso, schema as s, type Db } from '@gymos/db';

export type OtpPurpose = 'signup_coach' | 'password_reset';

export const OTP_TTL_MINUTES = 10;
export const OTP_MAX_ATTEMPTS = 5;

export type OtpDeps = {
  /** Server-side pepper mixed into the hash (≥32 chars in production). */
  pepper: string;
};

export type CreateChallengeInput = {
  purpose: OtpPurpose;
  email: string;
  phone?: string | undefined;
  payload?: Record<string, unknown> | undefined;
};

export type CreatedChallenge = {
  challengeId: string;
  /** Raw 6-digit code — send once via email; never persist plaintext. */
  code: string;
  expiresAt: string;
};

export type VerifyFailure =
  | { reason: 'OTP_INVALID' }
  | { reason: 'OTP_EXPIRED' }
  | { reason: 'OTP_LOCKED' }
  | { reason: 'OTP_NOT_FOUND' };

export type VerifiedChallenge = {
  challengeId: string;
  email: string;
  phone: string | null;
  payload: Record<string, unknown> | null;
};

const hashOtp = (code: string, pepper: string): string =>
  createHash('sha256').update(`${code}:${pepper}`).digest('base64url');

const codesEqual = (a: string, b: string): boolean => {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
};

const generateCode = (): string => String(randomInt(0, 1_000_000)).padStart(6, '0');

/** Invalidate any unconsumed challenges for the same email+purpose before creating a new one. */
export const createChallenge = async (
  db: Db,
  deps: OtpDeps,
  input: CreateChallengeInput,
): Promise<CreatedChallenge> => {
  const email = input.email.trim().toLowerCase();
  const code = generateCode();
  const expiresAt = DateTime.utc().plus({ minutes: OTP_TTL_MINUTES }).toISO();
  if (typeof expiresAt !== 'string') throw new Error('failed to compute otp expiry');

  await db
    .update(s.otpChallenges)
    .set({ consumedAt: nowIso() })
    .where(
      and(
        eq(s.otpChallenges.email, email),
        eq(s.otpChallenges.purpose, input.purpose),
        isNull(s.otpChallenges.consumedAt),
      ),
    );

  const [row] = await db
    .insert(s.otpChallenges)
    .values({
      purpose: input.purpose,
      email,
      phone: input.phone ?? null,
      codeHash: hashOtp(code, deps.pepper),
      payload: input.payload ?? null,
      attempts: 0,
      maxAttempts: OTP_MAX_ATTEMPTS,
      expiresAt,
    })
    .returning({ id: s.otpChallenges.id });
  if (!row) throw new Error('otp challenge insert failed');

  return { challengeId: row.id, code, expiresAt };
};

/**
 * Verify a code and consume the challenge on success.
 * Wrong codes increment attempts; after maxAttempts the challenge is locked.
 */
export const verifyAndConsume = async (
  db: Db,
  deps: OtpDeps,
  input: { purpose: OtpPurpose; email: string; code: string },
): Promise<{ ok: true; value: VerifiedChallenge } | { ok: false; error: VerifyFailure }> => {
  const email = input.email.trim().toLowerCase();

  const [row] = await db
    .select()
    .from(s.otpChallenges)
    .where(
      and(
        eq(s.otpChallenges.email, email),
        eq(s.otpChallenges.purpose, input.purpose),
        isNull(s.otpChallenges.consumedAt),
      ),
    )
    .orderBy(desc(s.otpChallenges.createdAt))
    .limit(1);

  if (!row) return { ok: false, error: { reason: 'OTP_NOT_FOUND' } };
  if (row.attempts >= row.maxAttempts) {
    return { ok: false, error: { reason: 'OTP_LOCKED' } };
  }
  if (dbTimestampToMillis(row.expiresAt) <= Date.now()) {
    return { ok: false, error: { reason: 'OTP_EXPIRED' } };
  }

  const expected = row.codeHash;
  const actual = hashOtp(input.code.trim(), deps.pepper);
  if (!codesEqual(expected, actual)) {
    await db
      .update(s.otpChallenges)
      .set({ attempts: row.attempts + 1 })
      .where(eq(s.otpChallenges.id, row.id));
    const nextAttempts = row.attempts + 1;
    if (nextAttempts >= row.maxAttempts) {
      return { ok: false, error: { reason: 'OTP_LOCKED' } };
    }
    return { ok: false, error: { reason: 'OTP_INVALID' } };
  }

  await db
    .update(s.otpChallenges)
    .set({ consumedAt: nowIso() })
    .where(and(eq(s.otpChallenges.id, row.id), isNull(s.otpChallenges.consumedAt)));

  return {
    ok: true,
    value: {
      challengeId: row.id,
      email: row.email,
      phone: row.phone,
      payload: row.payload,
    },
  };
};

/** Find the latest unconsumed signup challenge for resend (payload reuse). */
export const findActiveChallenge = async (
  db: Db,
  purpose: OtpPurpose,
  email: string,
): Promise<{
  id: string;
  phone: string | null;
  payload: Record<string, unknown> | null;
  expiresAt: string;
} | null> => {
  const normalized = email.trim().toLowerCase();
  const now = nowIso();
  const [row] = await db
    .select({
      id: s.otpChallenges.id,
      phone: s.otpChallenges.phone,
      payload: s.otpChallenges.payload,
      expiresAt: s.otpChallenges.expiresAt,
    })
    .from(s.otpChallenges)
    .where(
      and(
        eq(s.otpChallenges.email, normalized),
        eq(s.otpChallenges.purpose, purpose),
        isNull(s.otpChallenges.consumedAt),
        gt(s.otpChallenges.expiresAt, now),
      ),
    )
    .orderBy(desc(s.otpChallenges.createdAt))
    .limit(1);
  return row ?? null;
};
