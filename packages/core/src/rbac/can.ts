import { type Action } from './actions';
import { MATRIX } from './matrix';
import { type Role } from './roles';
import { scopeAllows, type ResourceRef, type ScopeSet } from './scope';

export type Actor = {
  readonly userId: string;
  readonly roles: readonly Role[];
  readonly scope: ScopeSet;
};

/**
 * The single authorization question: may this actor perform this action on
 * this resource? Client-side callers may use it to hide UI; the server
 * re-derives and re-checks on every request regardless.
 */
export const can = (actor: Actor, action: Action, resource: ResourceRef = {}): boolean =>
  actor.roles.some((role) => {
    const level = MATRIX[role][action];
    return level !== undefined && scopeAllows(level, actor.scope, resource);
  });
