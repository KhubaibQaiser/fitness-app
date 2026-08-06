import { and, eq, isNull } from 'drizzle-orm';
import { type Actor } from '@gymos/core/rbac';
import { schema as s, type Db } from '@gymos/db';

export type Principal = {
  readonly actor: Actor;
  readonly userId: string;
  readonly coachId: string;
  readonly orgId: string;
  readonly outletId: string;
  readonly name: string;
  readonly email: string | null;
  readonly unitPref: 'metric' | 'imperial' | null;
  readonly locale: string;
};

type Cached = { principal: Principal; at: number };
let cache: Cached | null = null;
const CACHE_TTL_MS = 30_000;

/** Test seam. */
export const resetPrincipalCache = (): void => {
  cache = null;
};

/**
 * Pilot principal resolution: the access gate authenticates the device; the
 * seeded coach is the single actor. P0 replaces this with session-based
 * resolution — everything downstream (RBAC, scoping) is unchanged.
 */
export const getPilotPrincipal = async (db: Db): Promise<Principal> => {
  if (cache !== null && Date.now() - cache.at < CACHE_TTL_MS) return cache.principal;

  const [coach] = await db
    .select({
      coachId: s.coaches.id,
      userId: s.users.id,
      name: s.users.name,
      email: s.users.email,
      unitPref: s.users.unitPref,
      locale: s.users.locale,
    })
    .from(s.coaches)
    .innerJoin(s.users, eq(s.users.id, s.coaches.userId))
    .limit(1);
  if (!coach) throw new Error('pilot coach not seeded — run db:seed');

  const membershipRows = await db
    .select({
      role: s.memberships.role,
      orgId: s.memberships.orgId,
      outletId: s.memberships.outletId,
    })
    .from(s.memberships)
    .where(and(eq(s.memberships.userId, coach.userId), isNull(s.memberships.revokedAt)));
  const first = membershipRows[0];
  if (!first) throw new Error('pilot memberships missing — run db:seed');

  const assignments = await db
    .select({ clientId: s.coachAssignments.clientId, outletId: s.coachAssignments.outletId })
    .from(s.coachAssignments)
    .where(
      and(eq(s.coachAssignments.coachId, coach.coachId), isNull(s.coachAssignments.unassignedAt)),
    );

  const outletIds = [
    ...new Set(
      membershipRows
        .flatMap((m) => (m.outletId === null ? [] : [m.outletId]))
        .concat(assignments.map((a) => a.outletId)),
    ),
  ];
  const outletId = outletIds[0];
  if (outletId === undefined) throw new Error('pilot outlet missing — run db:seed');

  const principal: Principal = {
    userId: coach.userId,
    coachId: coach.coachId,
    orgId: first.orgId,
    outletId,
    name: coach.name,
    email: coach.email,
    unitPref: coach.unitPref,
    locale: coach.locale,
    actor: {
      userId: coach.userId,
      roles: membershipRows.map((m) => m.role),
      scope: {
        userId: coach.userId,
        orgWide: membershipRows.some((m) => m.role === 'ORG_ADMIN' && m.outletId === null),
        outletIds,
        assignedClientIds: assignments.map((a) => a.clientId),
      },
    },
  };
  cache = { principal, at: Date.now() };
  return principal;
};
