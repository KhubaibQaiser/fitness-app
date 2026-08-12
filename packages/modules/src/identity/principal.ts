import { and, eq, isNull } from 'drizzle-orm';
import { type Actor } from '@gymos/core/rbac';
import { type UnitPrefs } from '@gymos/core/units';
import { schema as s, type Db } from '@gymos/db';
import { type CurrencyCode, type LocaleCode } from '../tenancy/manifest';

export type Principal = {
  readonly actor: Actor;
  readonly userId: string;
  /** Null for non-coach actors (e.g. CLIENT in Phase 4). */
  readonly coachId: string | null;
  readonly orgId: string;
  readonly outletId: string;
  readonly name: string;
  readonly email: string | null;
  readonly unitPref: 'metric' | 'imperial' | null;
  readonly unitPrefs: UnitPrefs | null;
  readonly defaultCountry: string | null;
  readonly locale: LocaleCode;
  readonly currencyPref: CurrencyCode | null;
};

/**
 * Resolve a principal for a specific user — per-request, no process-global cache.
 * Callers must pass a verified userId from a JWT (or equivalent).
 */
export const resolvePrincipal = async (db: Db, userId: string): Promise<Principal> => {
  const [user] = await db
    .select({
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      unitPref: s.users.unitPref,
      unitPrefs: s.users.unitPrefs,
      defaultCountry: s.users.defaultCountry,
      locale: s.users.locale,
      currencyPref: s.users.currencyPref,
    })
    .from(s.users)
    .where(and(eq(s.users.id, userId), isNull(s.users.deletedAt)))
    .limit(1);
  if (!user) throw new Error(`user not found: ${userId}`);

  const membershipRows = await db
    .select({
      role: s.memberships.role,
      orgId: s.memberships.orgId,
      outletId: s.memberships.outletId,
    })
    .from(s.memberships)
    .where(and(eq(s.memberships.userId, user.userId), isNull(s.memberships.revokedAt)));
  const first = membershipRows[0];
  if (!first) throw new Error(`memberships missing for user ${userId}`);

  const [coach] = await db
    .select({ coachId: s.coaches.id })
    .from(s.coaches)
    .where(and(eq(s.coaches.userId, user.userId), isNull(s.coaches.deletedAt)))
    .limit(1);

  const assignments =
    coach === undefined
      ? []
      : await db
          .select({ clientId: s.coachAssignments.clientId, outletId: s.coachAssignments.outletId })
          .from(s.coachAssignments)
          .where(
            and(
              eq(s.coachAssignments.coachId, coach.coachId),
              isNull(s.coachAssignments.unassignedAt),
            ),
          );

  const outletIds = [
    ...new Set(
      membershipRows
        .flatMap((m) => (m.outletId === null ? [] : [m.outletId]))
        .concat(assignments.map((a) => a.outletId)),
    ),
  ];

  // Prefer an explicit outlet membership; fall back to first assignment outlet;
  // last resort: any outlet in the org (org-wide admins without outlet membership).
  let outletId = outletIds[0];
  if (outletId === undefined) {
    const [fallback] = await db
      .select({ id: s.outlets.id })
      .from(s.outlets)
      .where(and(eq(s.outlets.orgId, first.orgId), isNull(s.outlets.deletedAt)))
      .limit(1);
    if (!fallback) throw new Error(`no outlet for org ${first.orgId}`);
    outletId = fallback.id;
  }

  return {
    userId: user.userId,
    coachId: coach?.coachId ?? null,
    orgId: first.orgId,
    outletId,
    name: user.name,
    email: user.email,
    unitPref: user.unitPref,
    unitPrefs: user.unitPrefs,
    defaultCountry: user.defaultCountry,
    locale: user.locale as LocaleCode,
    currencyPref: user.currencyPref,
    actor: {
      userId: user.userId,
      roles: membershipRows.map((m) => m.role),
      scope: {
        userId: user.userId,
        orgWide: membershipRows.some((m) => m.role === 'ORG_ADMIN' && m.outletId === null),
        outletIds: outletIds.length > 0 ? outletIds : [outletId],
        assignedClientIds: assignments.map((a) => a.clientId),
      },
    },
  };
};

/**
 * Resolve the seeded pilot coach for system jobs (worker) that have no JWT.
 * Request paths must use `resolvePrincipal(db, userId)` after token verification.
 */
export const resolvePilotCoachPrincipal = async (db: Db): Promise<Principal> => {
  const [coach] = await db
    .select({ userId: s.coaches.userId })
    .from(s.coaches)
    .innerJoin(s.users, eq(s.users.id, s.coaches.userId))
    .limit(1);
  if (!coach) throw new Error('pilot coach not seeded — run db:seed');
  return resolvePrincipal(db, coach.userId);
};

/** No-op retained so existing test imports keep compiling; cache no longer exists. */
export const resetPrincipalCache = (): void => {
  // intentionally empty — principal resolution is per-request
};

export type UpdateUserPrefsInput = {
  locale?: LocaleCode;
  currencyPref?: CurrencyCode;
  unitPrefs?: UnitPrefs;
  defaultCountry?: string;
};

/** Persist user prefs on `users`. */
export const updateUserPrefs = async (
  db: Db,
  userId: string,
  prefs: UpdateUserPrefsInput,
): Promise<void> => {
  const patch: {
    locale?: LocaleCode;
    currencyPref?: CurrencyCode;
    unitPrefs?: UnitPrefs;
    defaultCountry?: string;
    unitPref?: 'metric' | 'imperial';
  } = {};
  if (prefs.locale !== undefined) patch.locale = prefs.locale;
  if (prefs.currencyPref !== undefined) patch.currencyPref = prefs.currencyPref;
  if (prefs.unitPrefs !== undefined) {
    patch.unitPrefs = prefs.unitPrefs;
    patch.unitPref = prefs.unitPrefs.weight === 'lb' ? 'imperial' : 'metric';
  }
  if (prefs.defaultCountry !== undefined) patch.defaultCountry = prefs.defaultCountry;

  await db.update(s.users).set(patch).where(eq(s.users.id, userId));
};
