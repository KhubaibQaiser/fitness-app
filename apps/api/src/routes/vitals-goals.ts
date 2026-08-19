import { createRoute } from '@hono/zod-openapi';
import {
  createGoal,
  listGoals,
  listVitals,
  recordVitals,
  saveActiveGoal,
  setGoalStatus,
} from '@gymos/modules/coaching';
import { getActiveProfile, putProfile } from '@gymos/modules/nutrition';
import { json, problemDocs, type GymosApp } from '../http';
import { ProblemError } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

export const registerVitalsGoalRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, authorize, asCoach, resolveTenantManifest } = bind;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/vitals',
      operationId: 'listVitals',
      request: { params: dto.clientIdParam },
      responses: { 200: { description: 'Vitals history (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'vitals.read', { clientId });
      return c.json({ items: await listVitals(db, clientId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients/{clientId}/vitals',
      operationId: 'recordVitals',
      request: { params: dto.clientIdParam, body: json(dto.recordVitalsBody) },
      responses: {
        200: { description: 'Recorded vitals', ...json(dto.anyObject) },
        ...problemDocs(422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'vitals.write', { clientId });
      return c.json(
        await recordVitals(db, asCoach(c.get('principal')), clientId, c.req.valid('json')),
      );
    },
  );

  // ---- dietary profile --------------------------------------------------------------
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/dietary-profile',
      operationId: 'getDietaryProfile',
      request: { params: dto.clientIdParam },
      responses: { 200: { description: 'Active profile or null', ...json(dto.anyObject) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'dietary.read', { clientId });
      return c.json({ profile: await getActiveProfile(db, clientId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'put',
      path: '/v1/clients/{clientId}/dietary-profile',
      operationId: 'putDietaryProfile',
      request: { params: dto.clientIdParam, body: json(dto.putDietaryBody) },
      responses: {
        200: {
          description: 'New profile version + immediate plan re-validation result',
          ...json(dto.anyObject),
        },
        ...problemDocs(422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'dietary.write', { clientId });
      const result = await putProfile(
        db,
        asCoach(c.get('principal')),
        clientId,
        c.req.valid('json').restrictions,
      );
      return c.json(result);
    },
  );

  // ---- goals ---------------------------------------------------------------------------
  app.openapi(
    createRoute({
      method: 'put',
      path: '/v1/clients/{clientId}/goal',
      operationId: 'saveActiveGoal',
      request: { params: dto.clientIdParam, body: json(dto.saveActiveGoalBody) },
      responses: {
        200: { description: 'Saved active goal with Layer-1 targets', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'goal.manage', { clientId });
      const tenant = await resolveTenantManifest(c.get('principal'));
      const result = await saveActiveGoal(
        db,
        asCoach(c.get('principal')),
        clientId,
        c.req.valid('json'),
        tenant,
      );
      if (!result.ok) {
        if (result.error.code === 'CLIENT_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
        }
        throw new ProblemError(
          422,
          result.error.code,
          'Goal cannot be saved',
          JSON.stringify(result.error),
        );
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/goals',
      operationId: 'listGoals',
      request: { params: dto.clientIdParam },
      responses: { 200: { description: 'Goals (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'goal.read', { clientId });
      return c.json({ items: await listGoals(db, clientId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients/{clientId}/goals',
      operationId: 'createGoal',
      request: { params: dto.clientIdParam, body: json(dto.createGoalBody) },
      responses: {
        200: { description: 'Created goal with Layer-1 targets', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'goal.manage', { clientId });
      const tenant = await resolveTenantManifest(c.get('principal'));
      const result = await createGoal(
        db,
        asCoach(c.get('principal')),
        clientId,
        c.req.valid('json'),
        tenant,
      );
      if (!result.ok) {
        if (result.error.code === 'CLIENT_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
        }
        throw new ProblemError(
          422,
          result.error.code,
          'Goal cannot be created',
          JSON.stringify(result.error),
        );
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/v1/goals/{id}',
      operationId: 'setGoalStatus',
      request: { params: dto.idParam, body: json(dto.goalStatusBody) },
      responses: {
        200: { description: 'Updated goal', ...json(dto.anyObject) },
        ...problemDocs(404),
      },
    }),
    async (c) => {
      authorize(c, 'goal.manage', {});
      const updated = await setGoalStatus(
        db,
        asCoach(c.get('principal')),
        c.req.valid('param').id,
        c.req.valid('json').status,
      );
      if (!updated) throw new ProblemError(404, 'NOT_FOUND', 'Goal not found');
      return c.json(updated);
    },
  );
};
