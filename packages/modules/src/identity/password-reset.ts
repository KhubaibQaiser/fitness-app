import { and, eq, isNull } from 'drizzle-orm';
import { schema as s, type Db } from '@gymos/db';
import { setUserPassword } from './login';
import { type EmailSender } from './mail';
import { createChallenge, verifyAndConsume, type OtpDeps } from './otp';
import { revokeAllSessionsForUser } from './sessions';

export type PasswordResetDeps = OtpDeps & {
  mail: EmailSender;
};

/**
 * Always succeeds from the caller's perspective (anti-enumeration).
 * Sends an OTP only when a user with a password exists for the email.
 */
export const requestPasswordReset = async (
  db: Db,
  deps: PasswordResetDeps,
  emailRaw: string,
): Promise<void> => {
  const email = emailRaw.trim().toLowerCase();
  const [user] = await db
    .select({ id: s.users.id, passwordHash: s.users.passwordHash })
    .from(s.users)
    .where(and(eq(s.users.email, email), isNull(s.users.deletedAt)))
    .limit(1);

  if (user?.passwordHash == null) {
    return;
  }

  const challenge = await createChallenge(db, deps, {
    purpose: 'password_reset',
    email,
    payload: { userId: user.id },
  });

  await deps.mail.sendOtp({
    to: email,
    code: challenge.code,
    purpose: 'password_reset',
  });
};

export type ResetPasswordFailure =
  | { reason: 'OTP_INVALID' }
  | { reason: 'OTP_EXPIRED' }
  | { reason: 'OTP_LOCKED' }
  | { reason: 'OTP_NOT_FOUND' }
  | { reason: 'USER_NOT_FOUND' };

export const resetPasswordWithOtp = async (
  db: Db,
  deps: OtpDeps,
  input: { email: string; code: string; newPassword: string },
): Promise<{ ok: true } | { ok: false; error: ResetPasswordFailure }> => {
  const verified = await verifyAndConsume(db, deps, {
    purpose: 'password_reset',
    email: input.email,
    code: input.code,
  });
  if (!verified.ok) return { ok: false, error: verified.error };

  const payload = verified.value.payload;
  const userId =
    payload !== null && typeof payload.userId === 'string' ? payload.userId : undefined;

  const email = verified.value.email;
  const [user] = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(and(eq(s.users.email, email), isNull(s.users.deletedAt)))
    .limit(1);

  const targetId = userId ?? user?.id;
  if (targetId === undefined) {
    return { ok: false, error: { reason: 'USER_NOT_FOUND' } };
  }

  await setUserPassword(db, targetId, input.newPassword);
  await revokeAllSessionsForUser(db, targetId);
  return { ok: true };
};
