import { randomBytes } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { nowIso, schema as s, type Db, type DbOrTx } from '@gymos/db';
import { upsertTenantConfig, type TenantManifest } from '../tenancy';
import { type EmailSender } from './mail';
import { createChallenge, findActiveChallenge, verifyAndConsume, type OtpDeps } from './otp';
import { hashPassword } from './password';
import { normalizePhone } from './phone';
import { createSession, type CreatedSession, type SessionMeta } from './sessions';

export type CoachSignupStartInput = {
  name: string;
  email: string;
  phone: string;
  password: string;
  joinCode?: string | undefined;
  timezone?: string | undefined;
};

export type CoachSignupStartFailure =
  | { reason: 'EMAIL_TAKEN' }
  | { reason: 'PHONE_TAKEN' }
  | { reason: 'INVALID_PHONE' }
  | { reason: 'INVALID_JOIN_CODE' };

export type CoachSignupConfirmFailure =
  | { reason: 'OTP_INVALID' }
  | { reason: 'OTP_EXPIRED' }
  | { reason: 'OTP_LOCKED' }
  | { reason: 'OTP_NOT_FOUND' }
  | { reason: 'EMAIL_TAKEN' }
  | { reason: 'PHONE_TAKEN' }
  | { reason: 'INVALID_JOIN_CODE' }
  | { reason: 'INVALID_PAYLOAD' };

export type CoachSignupSuccess = {
  userId: string;
  session: CreatedSession;
};

type SignupPayload = {
  name: string;
  passwordHash: string;
  joinCode?: string | undefined;
  timezone?: string | undefined;
};

const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const generateJoinCode = (length = 8): string => {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    const idx = bytes[i];
    if (idx === undefined) throw new Error('join code entropy failed');
    out += JOIN_CODE_ALPHABET[idx % JOIN_CODE_ALPHABET.length] ?? 'A';
  }
  return out;
};

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

export const assertEmailPhoneFree = async (
  db: DbOrTx,
  email: string,
  phone: string,
): Promise<{ ok: true } | { ok: false; error: CoachSignupStartFailure }> => {
  const [byEmail] = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(and(eq(s.users.email, email), isNull(s.users.deletedAt)))
    .limit(1);
  if (byEmail) return { ok: false, error: { reason: 'EMAIL_TAKEN' } };

  const [byPhone] = await db
    .select({ id: s.users.id })
    .from(s.users)
    .where(and(eq(s.users.phone, phone), isNull(s.users.deletedAt)))
    .limit(1);
  if (byPhone) return { ok: false, error: { reason: 'PHONE_TAKEN' } };

  return { ok: true };
};

const resolveJoinOrg = async (
  db: DbOrTx,
  joinCode: string,
): Promise<{ orgId: string; outletId: string } | null> => {
  const code = joinCode.trim().toUpperCase();
  const [org] = await db
    .select({ id: s.organizations.id })
    .from(s.organizations)
    .where(and(eq(s.organizations.joinCode, code), isNull(s.organizations.deletedAt)))
    .limit(1);
  if (!org) return null;

  const [outlet] = await db
    .select({ id: s.outlets.id })
    .from(s.outlets)
    .where(and(eq(s.outlets.orgId, org.id), isNull(s.outlets.deletedAt)))
    .limit(1);
  if (!outlet) return null;
  return { orgId: org.id, outletId: outlet.id };
};

const defaultCoachManifest = (slug: string, name: string): TenantManifest => ({
  version: 1,
  slug,
  name,
  branding: {
    appName: 'GymOS Coach',
    colors: { primary: '#00D68F', accent: '#479AC2' },
    radius: 'soft',
  },
  terminology: {},
  locales: { default: 'en', enabled: ['en', 'ur'] },
  currency: 'PKR',
  units: 'metric',
  defaultCountry: 'PK',
  unitPrefs: { weight: 'kg', height: 'ft_in', length: 'in' },
  aiConfig: {
    cuisineContext: 'pakistani',
    mealCount: 3,
    kcalTolerancePct: 5,
    macroTolerancePct: 10,
    budgetTier: 2,
    prepTimeCeilingMin: 45,
    verbosity: 'standard',
    monthlyGenerationQuota: 500,
    promptPackId: 'pakistani',
  },
  nutrition: {
    weeklyDeltaKg: {
      LOSE: { CONSERVATIVE: -0.5, STANDARD: -1, AGGRESSIVE: -2 },
      GAIN: { CONSERVATIVE: 0.25, STANDARD: 0.5, AGGRESSIVE: 1 },
    },
  },
});

export type CoachSignupDeps = OtpDeps & {
  mail: EmailSender;
};

export const startCoachSignup = async (
  db: Db,
  deps: CoachSignupDeps,
  input: CoachSignupStartInput,
): Promise<{ ok: true } | { ok: false; error: CoachSignupStartFailure }> => {
  const email = normalizeEmail(input.email);
  const phoneResult = normalizePhone(input.phone);
  if (!phoneResult.ok) return { ok: false, error: { reason: 'INVALID_PHONE' } };

  const free = await assertEmailPhoneFree(db, email, phoneResult.e164);
  if (!free.ok) return free;

  if (input.joinCode !== undefined && input.joinCode.trim().length > 0) {
    const joined = await resolveJoinOrg(db, input.joinCode);
    if (joined === null) return { ok: false, error: { reason: 'INVALID_JOIN_CODE' } };
  }

  const passwordHash = await hashPassword(input.password);
  const payload: SignupPayload = {
    name: input.name.trim(),
    passwordHash,
    ...(input.joinCode !== undefined && input.joinCode.trim().length > 0
      ? { joinCode: input.joinCode.trim().toUpperCase() }
      : {}),
    ...(input.timezone !== undefined && input.timezone.trim().length > 0
      ? { timezone: input.timezone.trim() }
      : {}),
  };

  const challenge = await createChallenge(db, deps, {
    purpose: 'signup_coach',
    email,
    phone: phoneResult.e164,
    payload,
  });

  await deps.mail.sendOtp({
    to: email,
    code: challenge.code,
    purpose: 'signup_coach',
  });

  return { ok: true };
};

export const resendCoachSignupOtp = async (
  db: Db,
  deps: CoachSignupDeps,
  emailRaw: string,
): Promise<{ ok: true } | { ok: false; error: { reason: 'OTP_NOT_FOUND' } }> => {
  const email = normalizeEmail(emailRaw);
  const existing = await findActiveChallenge(db, 'signup_coach', email);
  if (existing?.payload == null) {
    return { ok: false, error: { reason: 'OTP_NOT_FOUND' } };
  }

  const challenge = await createChallenge(db, deps, {
    purpose: 'signup_coach',
    email,
    phone: existing.phone ?? undefined,
    payload: existing.payload,
  });

  await deps.mail.sendOtp({
    to: email,
    code: challenge.code,
    purpose: 'signup_coach',
  });

  return { ok: true };
};

const parseSignupPayload = (raw: Record<string, unknown> | null): SignupPayload | null => {
  if (raw === null) return null;
  const name = raw.name;
  const passwordHash = raw.passwordHash;
  if (typeof name !== 'string' || name.trim().length === 0) return null;
  if (typeof passwordHash !== 'string' || passwordHash.length === 0) return null;
  return {
    name: name.trim(),
    passwordHash,
    ...(typeof raw.joinCode === 'string' && raw.joinCode.length > 0
      ? { joinCode: raw.joinCode.toUpperCase() }
      : {}),
    ...(typeof raw.timezone === 'string' && raw.timezone.length > 0
      ? { timezone: raw.timezone }
      : {}),
  };
};

class CoachSignupAbort extends Error {
  constructor(readonly failure: CoachSignupConfirmFailure) {
    super(failure.reason);
  }
}

export const confirmCoachSignup = async (
  db: Db,
  deps: OtpDeps,
  input: { email: string; code: string },
  meta: SessionMeta = {},
): Promise<
  { ok: true; value: CoachSignupSuccess } | { ok: false; error: CoachSignupConfirmFailure }
> => {
  const verified = await verifyAndConsume(db, deps, {
    purpose: 'signup_coach',
    email: input.email,
    code: input.code,
  });
  if (!verified.ok) return { ok: false, error: verified.error };

  const payload = parseSignupPayload(verified.value.payload);
  if (payload === null || verified.value.phone === null) {
    return { ok: false, error: { reason: 'INVALID_PAYLOAD' } };
  }

  const email = verified.value.email;
  const phone = verified.value.phone;

  try {
    const result = await db.transaction(async (tx) => {
      const free = await assertEmailPhoneFree(tx, email, phone);
      if (!free.ok) {
        if (free.error.reason === 'EMAIL_TAKEN' || free.error.reason === 'PHONE_TAKEN') {
          throw new CoachSignupAbort(free.error);
        }
        throw new CoachSignupAbort({ reason: 'INVALID_PAYLOAD' });
      }

      const [user] = await tx
        .insert(s.users)
        .values({
          email,
          phone,
          name: payload.name,
          passwordHash: payload.passwordHash,
          emailVerifiedAt: nowIso(),
          locale: 'en',
        })
        .returning({ id: s.users.id });
      if (!user) throw new Error('user insert failed');

      if (payload.joinCode !== undefined) {
        const joined = await resolveJoinOrg(tx, payload.joinCode);
        if (joined === null) {
          throw new CoachSignupAbort({ reason: 'INVALID_JOIN_CODE' });
        }

        await tx.insert(s.memberships).values({
          userId: user.id,
          role: 'COACH',
          orgId: joined.orgId,
          outletId: joined.outletId,
        });
        await tx.insert(s.coaches).values({ userId: user.id });
      } else {
        let joinCode = generateJoinCode();
        for (let attempt = 0; attempt < 5; attempt++) {
          const [clash] = await tx
            .select({ id: s.organizations.id })
            .from(s.organizations)
            .where(eq(s.organizations.joinCode, joinCode))
            .limit(1);
          if (!clash) break;
          joinCode = generateJoinCode();
        }

        const orgName = `${payload.name}'s Coaching`;
        const [org] = await tx
          .insert(s.organizations)
          .values({ name: orgName, joinCode })
          .returning({ id: s.organizations.id });
        if (!org) throw new Error('org insert failed');

        const timezone = payload.timezone ?? 'Asia/Karachi';
        const [outlet] = await tx
          .insert(s.outlets)
          .values({ orgId: org.id, name: 'Main', timezone })
          .returning({ id: s.outlets.id });
        if (!outlet) throw new Error('outlet insert failed');

        const slug = `coach-${org.id.replaceAll('-', '').slice(0, 12)}`;
        await upsertTenantConfig(tx, {
          orgId: org.id,
          slug,
          manifest: defaultCoachManifest(slug, orgName),
        });

        await tx.insert(s.memberships).values([
          { userId: user.id, role: 'COACH', orgId: org.id, outletId: outlet.id },
          { userId: user.id, role: 'ORG_ADMIN', orgId: org.id },
        ]);
        await tx.insert(s.coaches).values({ userId: user.id });
      }

      const session = await createSession(tx, user.id, meta);
      return { userId: user.id, session };
    });

    return { ok: true, value: result };
  } catch (error) {
    if (error instanceof CoachSignupAbort) {
      return { ok: false, error: error.failure };
    }
    throw error;
  }
};
