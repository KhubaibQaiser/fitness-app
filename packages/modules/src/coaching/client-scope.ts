import { eq, inArray, sql, type SQL } from 'drizzle-orm';
import { err, ok, type Result } from '@gymos/core';
import { can, MATRIX, type Action, type Actor } from '@gymos/core/rbac';
import { schema as s } from '@gymos/db';

/** "My clients" or everything the principal's roles may list (the S02 and S03 switch). */
export type ClientScopeChoice = 'mine' | 'all';

export type ScopedPrincipal = { coachId: string | null; orgId: string; actor: Actor };

type ClientRef = { id: string; outletId: string; userId: string | null };

export type ClientScope = {
  choice: ClientScopeChoice;
  /**
   * Bounds a read of `clients` to rows that can be in scope, inside the principal's org. It is
   * as narrow as the roles' `client.list` levels and references only the `clients` table.
   */
  where: SQL;
  /** The exact rule per client: apply it to every row the bounded read returns. */
  includes: (client: ClientRef) => boolean;
  /** Whether the principal may see one kind of data about a client (vitals, plans, check-ins). */
  allows: (action: Action, client: ClientRef) => boolean;
};

/**
 * SQL for `scopeAllows` over every level the roles grant `action` at (packages/core/src/rbac).
 * can() stays the authority per row; this only keeps the read from fetching wider than it.
 */
const levelBound = (actor: Actor, action: Action): SQL => {
  const levels = new Set(actor.roles.map((role) => MATRIX[role][action]));
  const { scope } = actor;
  if (scope.orgWide && (levels.has('org') || levels.has('outlet'))) return sql`true`;
  const parts: SQL[] = [
    ...(levels.has('outlet') ? [inArray(s.clients.outletId, [...scope.outletIds])] : []),
    ...(levels.has('assigned') ? [inArray(s.clients.id, [...scope.assignedClientIds])] : []),
    ...(levels.has('self') ? [eq(s.clients.userId, scope.userId)] : []),
  ];
  return parts.length === 0 ? sql`false` : sql`(${sql.join(parts, sql` or `)})`;
};

/**
 * The one client-scope rule (F7.1 Today, F7.2 roster, the coach-scope fix for /v1/clients).
 * `mine` is the clients assigned to the signed-in coach. `all` is every client the principal's
 * roles may list. Both are filtered by `can(actor, 'client.list')`, so a COACH-only principal
 * still gets only their assigned clients, never the outlet, and a role without `client.list`
 * gets none. The default is `mine` with a coach profile and `all` without one; `mine` without
 * a coach profile is refused.
 */
export const resolveClientScope = (
  principal: ScopedPrincipal,
  requested?: ClientScopeChoice,
): Result<ClientScope, { code: 'COACH_REQUIRED' }> => {
  const { actor, orgId, coachId } = principal;
  const choice = requested ?? (coachId === null ? 'all' : 'mine');
  if (choice === 'mine' && coachId === null) return err({ code: 'COACH_REQUIRED' });

  const allows = (action: Action, client: ClientRef) =>
    can(actor, action, {
      clientId: client.id,
      outletId: client.outletId,
      ...(client.userId === null ? {} : { ownerUserId: client.userId }),
    });
  const inOrg = sql`${s.clients.outletId} in (select o.id from outlets o where o.org_id = ${orgId})`;
  const listable = levelBound(actor, 'client.list');

  if (choice === 'mine') {
    const assigned = new Set(actor.scope.assignedClientIds);
    return ok({
      choice,
      where: sql`(${inOrg} and ${listable} and exists (select 1 from coach_assignments a
        where a.client_id = ${s.clients.id} and a.coach_id = ${coachId} and a.unassigned_at is null))`,
      includes: (client) => assigned.has(client.id) && allows('client.list', client),
      allows,
    });
  }
  return ok({
    choice,
    where: sql`(${inOrg} and ${listable})`,
    includes: (client) => allows('client.list', client),
    allows,
  });
};
