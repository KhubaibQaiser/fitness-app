import { eq, inArray, sql, type SQL } from 'drizzle-orm';
import { err, ok, type Result } from '@gymos/core';
import { can, type Actor } from '@gymos/core/rbac';
import { schema as s } from '@gymos/db';

/** "My clients" or everything the principal's roles may list (the S02 and S03 switch). */
export type ClientScopeChoice = 'mine' | 'all';

export type ScopedPrincipal = { coachId: string | null; orgId: string; actor: Actor };

export type ClientScope = {
  choice: ClientScopeChoice;
  /**
   * Bounds a read of `clients` to rows that can be in scope, inside the principal's org. It
   * references only the `clients` table, so it fits any query that selects from it.
   */
  where: SQL;
  /** The exact rule per client: apply it to every row the bounded read returns. */
  includes: (client: { id: string; outletId: string; userId: string | null }) => boolean;
};

/**
 * The one client-scope rule (F7.1 Today, F7.2 roster, the coach-scope fix for /v1/clients).
 * `mine` is the clients assigned to the signed-in coach. `all` is every client the principal's
 * roles may list, by `can(actor, 'client.list')`, so a COACH-only principal still gets only
 * their assigned clients, never the outlet. The default is `mine` with a coach profile and `all`
 * without one; `mine` without a coach profile is refused.
 */
export const resolveClientScope = (
  principal: ScopedPrincipal,
  requested?: ClientScopeChoice,
): Result<ClientScope, { code: 'COACH_REQUIRED' }> => {
  const { actor, orgId, coachId } = principal;
  const choice = requested ?? (coachId === null ? 'all' : 'mine');
  const inOrg = sql`${s.clients.outletId} in (select o.id from outlets o where o.org_id = ${orgId})`;

  if (choice === 'mine') {
    if (coachId === null) return err({ code: 'COACH_REQUIRED' });
    const assigned = new Set(actor.scope.assignedClientIds);
    return ok({
      choice,
      where: sql`(${inOrg} and exists (select 1 from coach_assignments a
        where a.client_id = ${s.clients.id} and a.coach_id = ${coachId} and a.unassigned_at is null))`,
      includes: (client) => assigned.has(client.id),
    });
  }

  const { scope } = actor;
  return ok({
    choice,
    // The scope set bounds the read (as F7.2's roster does); can() then applies each role's level.
    where: scope.orgWide
      ? inOrg
      : sql`(${inOrg} and (${inArray(s.clients.outletId, [...scope.outletIds])}
          or ${inArray(s.clients.id, [...scope.assignedClientIds])}
          or ${eq(s.clients.userId, scope.userId)}))`,
    includes: (client) =>
      can(actor, 'client.list', {
        clientId: client.id,
        outletId: client.outletId,
        ...(client.userId === null ? {} : { ownerUserId: client.userId }),
      }),
  });
};
