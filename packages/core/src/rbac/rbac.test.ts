import { describe, expect, it } from 'vitest';
import { ACTIONS } from './actions';
import { can, type Actor } from './can';
import { MATRIX } from './matrix';
import { ROLES } from './roles';
import { scopeAllows, type ScopeSet } from './scope';

const scope = (partial: Partial<ScopeSet>): ScopeSet => ({
  userId: 'u-coach',
  orgWide: false,
  outletIds: [],
  assignedClientIds: [],
  ...partial,
});

describe('matrix shape', () => {
  it('defines grants for every role', () => {
    for (const role of ROLES) {
      expect(MATRIX[role]).toBeDefined();
    }
  });

  it('only references known actions', () => {
    const known = new Set<string>(ACTIONS);
    for (const role of ROLES) {
      for (const action of Object.keys(MATRIX[role])) {
        expect(known.has(action), `${role} grants unknown action ${action}`).toBe(true);
      }
    }
  });
});

describe('scopeAllows', () => {
  it('org level requires orgWide', () => {
    expect(scopeAllows('org', scope({ orgWide: true }), {})).toBe(true);
    expect(scopeAllows('org', scope({}), {})).toBe(false);
  });

  it('outlet level matches outlet membership or orgWide', () => {
    expect(scopeAllows('outlet', scope({ outletIds: ['o1'] }), { outletId: 'o1' })).toBe(true);
    expect(scopeAllows('outlet', scope({ outletIds: ['o1'] }), { outletId: 'o2' })).toBe(false);
    expect(scopeAllows('outlet', scope({ outletIds: ['o1'] }), {})).toBe(false);
    expect(scopeAllows('outlet', scope({ orgWide: true }), { outletId: 'anything' })).toBe(true);
  });

  it('assigned level matches the coach assignment set only', () => {
    expect(scopeAllows('assigned', scope({ assignedClientIds: ['c1'] }), { clientId: 'c1' })).toBe(
      true,
    );
    expect(scopeAllows('assigned', scope({ assignedClientIds: ['c1'] }), { clientId: 'c2' })).toBe(
      false,
    );
    expect(scopeAllows('assigned', scope({ assignedClientIds: ['c1'] }), {})).toBe(false);
  });

  it('self level matches the owning user only', () => {
    expect(scopeAllows('self', scope({}), { ownerUserId: 'u-coach' })).toBe(true);
    expect(scopeAllows('self', scope({}), { ownerUserId: 'someone-else' })).toBe(false);
    expect(scopeAllows('self', scope({}), {})).toBe(false);
  });
});

describe('can()', () => {
  const coach: Actor = {
    userId: 'u-coach',
    roles: ['COACH'],
    scope: scope({ assignedClientIds: ['c1'] }),
  };

  it('lets a coach write vitals for an assigned client only', () => {
    expect(can(coach, 'vitals.write', { clientId: 'c1' })).toBe(true);
    expect(can(coach, 'vitals.write', { clientId: 'c-unassigned' })).toBe(false);
  });

  it('denies actions absent from the role grants', () => {
    const frontDesk: Actor = {
      userId: 'u-fd',
      roles: ['FRONT_DESK'],
      scope: scope({ userId: 'u-fd', outletIds: ['o1'] }),
    };
    expect(can(frontDesk, 'plan.publish', { clientId: 'c1' })).toBe(false);
    expect(can(frontDesk, 'client.read', { outletId: 'o1' })).toBe(true);
  });

  it('grants through any of multiple roles (pilot coach = COACH + ORG_ADMIN)', () => {
    const pilotCoach: Actor = {
      userId: 'u-pilot',
      roles: ['COACH', 'ORG_ADMIN'],
      scope: scope({ userId: 'u-pilot', orgWide: true }),
    };
    expect(can(pilotCoach, 'client.manage', {})).toBe(true);
    expect(can(pilotCoach, 'data.erase', {})).toBe(true);
  });

  it('scopes clients to their own resources', () => {
    const client: Actor = {
      userId: 'u-client',
      roles: ['CLIENT'],
      scope: scope({ userId: 'u-client' }),
    };
    expect(can(client, 'plan.read', { ownerUserId: 'u-client' })).toBe(true);
    expect(can(client, 'plan.read', { ownerUserId: 'u-other' })).toBe(false);
    expect(can(client, 'plan.publish', { ownerUserId: 'u-client' })).toBe(false);
  });

  it('defaults resource to empty (org-level checks still work)', () => {
    const admin: Actor = {
      userId: 'u-admin',
      roles: ['ORG_ADMIN'],
      scope: scope({ userId: 'u-admin', orgWide: true }),
    };
    expect(can(admin, 'foods.read')).toBe(true);
  });
});
