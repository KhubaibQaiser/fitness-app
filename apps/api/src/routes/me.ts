import { createRoute } from '@hono/zod-openapi';
import { resolveUnitPrefs, unitPrefsToSystem } from '@gymos/core/units';
import {
  resolvePrincipal,
  revokeAllSessionsForUser,
  updateUserPrefs,
  type Principal,
} from '@gymos/modules/identity';
import { type TenantManifest } from '@gymos/modules/tenancy';
import { clearAuthCookies } from '../auth-cookies';
import { json, problemDocs, type GymosApp } from '../http';
import { ProblemError } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

const meResponse = (p: Principal, tenant: TenantManifest) => {
  const unitPrefs = resolveUnitPrefs(p.unitPrefs, tenant.unitPrefs);
  return {
    userId: p.userId,
    name: p.name,
    email: p.email,
    locale: p.locale,
    unitPref: unitPrefsToSystem(unitPrefs),
    unitPrefs,
    defaultCountry: p.defaultCountry ?? tenant.defaultCountry,
    currencyPref: p.currencyPref ?? tenant.currency,
    roles: [...p.actor.roles],
  };
};

export const registerMeRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, resolveTenantManifest } = bind;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/me',
      operationId: 'getMe',
      responses: { 200: { description: 'Current principal', ...json(dto.anyObject) } },
    }),
    async (c) => {
      const principal = c.get('principal');
      const tenant = await resolveTenantManifest(principal);
      return c.json(meResponse(principal, tenant));
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/v1/me',
      operationId: 'updateMe',
      request: { body: json(dto.updateMeBody) },
      responses: {
        200: { description: 'Updated principal prefs', ...json(dto.anyObject) },
        ...problemDocs(422),
      },
    }),
    async (c) => {
      const body = c.req.valid('json');
      const p = c.get('principal');
      const tenant = await resolveTenantManifest(p);

      if (body.locale !== undefined && !tenant.locales.enabled.includes(body.locale)) {
        throw new ProblemError(
          422,
          'VALIDATION_FAILED',
          'Locale is not enabled for this workspace',
        );
      }

      await updateUserPrefs(db, p.userId, {
        ...(body.locale !== undefined ? { locale: body.locale } : {}),
        ...(body.currencyPref !== undefined ? { currencyPref: body.currencyPref } : {}),
        ...(body.unitPrefs !== undefined ? { unitPrefs: body.unitPrefs } : {}),
        ...(body.defaultCountry !== undefined ? { defaultCountry: body.defaultCountry } : {}),
      });

      const refreshed = await resolvePrincipal(db, p.userId);
      return c.json(meResponse(refreshed, tenant));
    },
  );

  app.post('/v1/auth/logout-all', async (c) => {
    const count = await revokeAllSessionsForUser(db, c.get('principal').userId);
    clearAuthCookies(c);
    return c.json({ ok: true, revoked: count });
  });
};
