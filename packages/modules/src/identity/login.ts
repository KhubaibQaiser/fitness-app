import { and, eq, isNull } from 'drizzle-orm';
import { schema as s, type Db } from '@gymos/db';
import { hashPassword, verifyPassword } from './password';
import { createSession, type CreatedSession, type SessionMeta } from './sessions';

export type LoginSuccess = {
  userId: string;
  session: CreatedSession;
};

export type LoginFailure = { reason: 'INVALID_CREDENTIALS' | 'NO_PASSWORD' };

export type LoginResult = { ok: true; value: LoginSuccess } | { ok: false; error: LoginFailure };

/**
 * Precomputed scrypt hash of a constant — used only so missing-user paths still
 * spend roughly the same time in verifyPassword (mitigates email-enumeration timing).
 * Generated once at module load; never used as a real credential.
 */
const DUMMY_HASH_PROMISE = hashPassword('__gymos_timing_dummy__');

/**
 * Authenticate by email + password and open a refresh session.
 * Does not issue JWTs — that stays in the API layer (jose + env secret).
 */
export const loginWithPassword = async (
  db: Db,
  email: string,
  password: string,
  meta: SessionMeta = {},
): Promise<LoginResult> => {
  const normalized = email.trim().toLowerCase();
  const [user] = await db
    .select({
      id: s.users.id,
      passwordHash: s.users.passwordHash,
    })
    .from(s.users)
    .where(and(eq(s.users.email, normalized), isNull(s.users.deletedAt)))
    .limit(1);

  const dummyHash = await DUMMY_HASH_PROMISE;
  const hashToCheck = user?.passwordHash ?? dummyHash;
  const valid = await verifyPassword(password, hashToCheck);

  if (user?.passwordHash == null) {
    return {
      ok: false,
      error: { reason: user?.passwordHash === null ? 'NO_PASSWORD' : 'INVALID_CREDENTIALS' },
    };
  }
  if (!valid) return { ok: false, error: { reason: 'INVALID_CREDENTIALS' } };

  const session = await createSession(db, user.id, meta);
  return { ok: true, value: { userId: user.id, session } };
};

/** Set or replace a user's password hash (seed, reset, admin). */
export const setUserPassword = async (db: Db, userId: string, password: string): Promise<void> => {
  const passwordHash = await hashPassword(password);
  await db.update(s.users).set({ passwordHash }).where(eq(s.users.id, userId));
};
