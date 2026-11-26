import { describe, expect, it } from 'vitest';
import { type Role } from '@gymos/core/rbac';
import { resolveClientScope, type ScopedPrincipal } from './client-scope';

const MAIN = 'outlet-main';
const OTHER = 'outlet-other';

const principal = (
  roles: Role[],
  opts: { coachId?: string; orgWide?: boolean; outletIds?: string[]; assigned?: string[] } = {},
): ScopedPrincipal => ({
  coachId: opts.coachId ?? null,
  orgId: 'org-1',
  actor: {
    userId: 'user-1',
    roles,
    scope: {
      userId: 'user-1',
      orgWide: opts.orgWide ?? false,
      outletIds: opts.outletIds ?? [MAIN],
      assignedClientIds: opts.assigned ?? [],
    },
  },
});

/** Clients a coach may meet: their own in the main outlet, a colleague's there, one elsewhere. */
const mine = { id: 'mine', outletId: MAIN, userId: null };
const colleagues = { id: 'colleague', outletId: MAIN, userId: null };
const elsewhere = { id: 'elsewhere', outletId: OTHER, userId: null };
const visible = (p: ScopedPrincipal, choice?: 'mine' | 'all') => {
  const scope = resolveClientScope(p, choice);
  if (!scope.ok) throw new Error(scope.error.code);
  return {
    choice: scope.value.choice,
    ids: [mine, colleagues, elsewhere].filter(scope.value.includes).map((c) => c.id),
  };
};

describe('resolveClientScope', () => {
  it('an admin who coaches: mine by default, the whole org with all', () => {
    const adminCoach = principal(['COACH', 'ORG_ADMIN'], {
      coachId: 'coach-1',
      orgWide: true,
      assigned: ['mine'],
    });
    expect(visible(adminCoach)).toEqual({ choice: 'mine', ids: ['mine'] });
    expect(visible(adminCoach, 'all')).toEqual({
      choice: 'all',
      ids: ['mine', 'colleague', 'elsewhere'],
    });
  });

  it('an admin with no coach profile: all by default, and mine is refused', () => {
    const admin = principal(['ORG_ADMIN'], { orgWide: true, outletIds: [] });
    expect(visible(admin)).toEqual({ choice: 'all', ids: ['mine', 'colleague', 'elsewhere'] });
    expect(resolveClientScope(admin, 'mine')).toEqual({
      ok: false,
      error: { code: 'COACH_REQUIRED' },
    });
  });

  it('an outlet manager: their outlet only', () => {
    expect(visible(principal(['OUTLET_ADMIN']))).toEqual({
      choice: 'all',
      ids: ['mine', 'colleague'],
    });
  });

  it('a COACH-only coach: all never widens to the outlet', () => {
    const coach = principal(['COACH'], { coachId: 'coach-1', assigned: ['mine'] });
    expect(visible(coach)).toEqual({ choice: 'mine', ids: ['mine'] });
    expect(visible(coach, 'all')).toEqual({ choice: 'all', ids: ['mine'] });
  });

  it('a role without client.list sees nothing', () => {
    expect(visible(principal(['INSTRUCTOR']))).toEqual({ choice: 'all', ids: [] });
  });
});
