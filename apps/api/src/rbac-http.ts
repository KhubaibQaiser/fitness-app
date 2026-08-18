import { can, type Action } from '@gymos/core/rbac';
import { type Principal } from '@gymos/modules/identity';
import { type AppContext } from './http';
import { ProblemError } from './problems';

export const requireCoachId = (principal: Principal): string => {
  if (principal.coachId === null) {
    throw new ProblemError(403, 'COACH_REQUIRED', 'This action requires a coach account');
  }
  return principal.coachId;
};

/** Narrow principal for coaching mutations that require a coach profile. */
export const asCoach = (principal: Principal): Principal & { coachId: string } => ({
  ...principal,
  coachId: requireCoachId(principal),
});

/** RBAC check — denies read as 404 to avoid existence leaks. */
export const authorize = (
  c: AppContext,
  action: Action,
  resource: { outletId?: string; clientId?: string; ownerUserId?: string } = {},
): void => {
  if (!can(c.get('principal').actor, action, resource)) {
    throw new ProblemError(404, 'NOT_FOUND', 'Resource not found');
  }
};
