/**
 * Scope levels, narrowest match wins nothing — each grant names the level it
 * operates at and the resource must fall inside the actor's scope set.
 *
 * - org: anywhere in the organization
 * - outlet: resources belonging to one of the actor's outlets
 * - assigned: clients currently assigned to the actor (coach)
 * - self: resources owned by the actor's own user
 */
export type ScopeLevel = 'org' | 'outlet' | 'assigned' | 'self';

export type ScopeSet = {
  readonly userId: string;
  readonly orgWide: boolean;
  readonly outletIds: readonly string[];
  readonly assignedClientIds: readonly string[];
};

export type ResourceRef = {
  readonly outletId?: string;
  readonly clientId?: string;
  readonly ownerUserId?: string;
};

export const scopeAllows = (level: ScopeLevel, scope: ScopeSet, resource: ResourceRef): boolean => {
  switch (level) {
    case 'org':
      return scope.orgWide;
    case 'outlet':
      return (
        scope.orgWide ||
        (resource.outletId !== undefined && scope.outletIds.includes(resource.outletId))
      );
    case 'assigned':
      return resource.clientId !== undefined && scope.assignedClientIds.includes(resource.clientId);
    case 'self':
      return resource.ownerUserId !== undefined && resource.ownerUserId === scope.userId;
  }
};
