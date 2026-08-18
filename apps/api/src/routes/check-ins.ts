import { createRoute } from '@hono/zod-openapi';
import { schema as s } from '@gymos/db';
import {
  completeCheckIn,
  getCheckIn,
  getCheckInDetail,
  listCheckIns,
  nextDueCheckIns,
  updateAndRerunCheckIn,
} from '@gymos/modules/coaching';
import {
  diffPlanItems,
  foodsById,
  generatePlan,
  getPlanWithItems,
  listPlans,
} from '@gymos/modules/nutrition';
import { json, problemDocs, type GymosApp } from '../http';
import { ProblemError } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

export const registerCheckInRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, authorize, asCoach, requireCoachId, resolveTenantManifest, resolveAiConfig } = bind;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/check-ins',
      operationId: 'listDueCheckIns',
      responses: {
        200: { description: 'Due check-ins across the roster', ...json(dto.objectList) },
      },
    }),
    async (c) => {
      authorize(c, 'checkin.read');
      return c.json({
        items: await nextDueCheckIns(db, {
          scope: c.get('principal').actor.scope,
          orgId: c.get('principal').orgId,
        }),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/check-ins',
      operationId: 'listClientCheckIns',
      request: { params: dto.clientIdParam },
      responses: { 200: { description: 'Check-in history (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'checkin.read', { clientId });
      return c.json({ items: await listCheckIns(db, clientId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients/{clientId}/check-ins',
      operationId: 'completeCheckIn',
      request: { params: dto.clientIdParam, body: json(dto.completeCheckInBody) },
      responses: {
        200: { description: 'Adaptive-engine verdict', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'checkin.write', { clientId });
      const result = await completeCheckIn(
        db,
        asCoach(c.get('principal')),
        clientId,
        c.req.valid('json'),
      );
      if (!result.ok) {
        if (result.error.code === 'CLIENT_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
        }
        throw new ProblemError(422, result.error.code, 'Check-in cannot be completed');
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/check-ins/{id}',
      operationId: 'getCheckIn',
      request: { params: dto.idParam },
      responses: {
        200: { description: 'Check-in detail', ...json(dto.anyObject) },
        ...problemDocs(404),
      },
    }),
    async (c) => {
      const detail = await getCheckInDetail(db, c.req.valid('param').id);
      if (!detail) throw new ProblemError(404, 'NOT_FOUND', 'Check-in not found');
      authorize(c, 'checkin.read', { clientId: detail.clientId });
      return c.json(detail);
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/v1/check-ins/{id}',
      operationId: 'updateCheckIn',
      request: { params: dto.idParam, body: json(dto.completeCheckInBody) },
      responses: {
        200: { description: 'Re-run adaptive-engine verdict', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const existing = await getCheckIn(db, id);
      if (!existing) throw new ProblemError(404, 'NOT_FOUND', 'Check-in not found');
      authorize(c, 'checkin.write', { clientId: existing.clientId });

      const result = await updateAndRerunCheckIn(
        db,
        asCoach(c.get('principal')),
        id,
        c.req.valid('json'),
      );
      if (!result.ok) {
        if (result.error.code === 'NOT_FOUND' || result.error.code === 'CLIENT_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Check-in not found');
        }
        throw new ProblemError(422, result.error.code, 'Check-in cannot be updated');
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/check-ins/{id}/apply',
      operationId: 'applyAdjustment',
      request: { params: dto.idParam },
      responses: {
        200: { description: 'New draft plan + diff vs published', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const checkIn = await getCheckIn(db, c.req.valid('param').id);
      if (!checkIn) throw new ProblemError(404, 'NOT_FOUND', 'Check-in not found');
      authorize(c, 'plan.generate', { clientId: checkIn.clientId });

      const verdict = checkIn.engineOutput as { type?: string; newTargets?: unknown } | null;
      if (verdict?.type !== 'ADJUST_TARGETS' || verdict.newTargets === undefined) {
        throw new ProblemError(422, 'NOT_ADJUSTABLE', 'This check-in has no adjustment to apply');
      }

      const plans = await listPlans(db, checkIn.clientId);
      const publishedSummary = plans.find((plan) => plan.status === 'PUBLISHED');
      const beforePlan = publishedSummary ? await getPlanWithItems(db, publishedSummary.id) : null;

      const tenant = await resolveTenantManifest(c.get('principal'));
      const generated = await generatePlan(
        db,
        asCoach(c.get('principal')),
        tenant,
        checkIn.clientId,
        {
          kind: 'ADJUSTMENT',
          targetsOverride: verdict.newTargets as dto.MacroTargets,
          ai: resolveAiConfig(tenant),
        },
      );
      if (!generated.ok) {
        if (generated.error.code === 'QUOTA_EXCEEDED') {
          throw new ProblemError(
            429,
            'QUOTA_EXCEEDED',
            'Monthly plan generation quota exceeded',
            `used ${generated.error.used} of ${generated.error.limit}`,
          );
        }
        throw new ProblemError(
          422,
          generated.error.code,
          'Adjustment generation failed',
          JSON.stringify(generated.error),
        );
      }

      await db.insert(s.aiFeedbackEvents).values({
        planId: generated.value.plan.id,
        coachId: requireCoachId(c.get('principal')),
        kind: 'ADJUSTMENT_ACCEPTED',
        payload: { checkInId: checkIn.id },
      });

      const names = await foodsById(db, [
        ...new Set([...(beforePlan?.items ?? []), ...generated.value.items].map((i) => i.foodId)),
      ]);
      const diff = beforePlan
        ? diffPlanItems(
            beforePlan.items,
            generated.value.items,
            new Map([...names].map(([id, f]) => [id, f.name])),
          )
        : [];

      return c.json({ plan: generated.value.plan, items: generated.value.items, diff });
    },
  );
};
