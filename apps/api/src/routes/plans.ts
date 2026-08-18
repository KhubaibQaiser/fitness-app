import { createRoute, z } from '@hono/zod-openapi';
import {
  generatePlan,
  getDietPlanPdfData,
  getPlanWithItems,
  listFoods,
  listPlans,
  patchPlan,
  publishPlan,
} from '@gymos/modules/nutrition';
import { dietPlanFilename, renderDietPlanPdf } from '../diet-plan-pdf';
import { json, problemDocs, type GymosApp } from '../http';
import { ProblemError } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

export const registerPlanRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, authorize, asCoach, resolveTenantManifest, resolveAiConfig } = bind;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/foods',
      operationId: 'listFoods',
      request: { query: z.object({ q: z.string().optional(), group: z.string().optional() }) },
      responses: { 200: { description: 'Food catalog', ...json(dto.objectList) } },
    }),
    async (c) => {
      authorize(c, 'foods.read');
      const { q, group } = c.req.valid('query');
      return c.json({
        items: await listFoods(db, {
          ...(q !== undefined ? { q } : {}),
          ...(group !== undefined ? { group } : {}),
        }),
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/meal-plans',
      operationId: 'listPlans',
      request: { params: dto.clientIdParam },
      responses: { 200: { description: 'Plan versions (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'plan.read', { clientId });
      return c.json({ items: await listPlans(db, clientId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/meal-plans/{id}',
      operationId: 'getPlan',
      request: { params: dto.idParam },
      responses: {
        200: { description: 'Plan with items', ...json(dto.anyObject) },
        ...problemDocs(404),
      },
    }),
    async (c) => {
      const result = await getPlanWithItems(db, c.req.valid('param').id);
      if (!result) throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
      authorize(c, 'plan.read', { clientId: result.plan.clientId });
      return c.json(result);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients/{clientId}/meal-plans/generate',
      operationId: 'generatePlan',
      request: { params: dto.clientIdParam, body: json(dto.generateBody) },
      responses: {
        200: { description: 'Draft plan with items', ...json(dto.anyObject) },
        ...problemDocs(403, 404, 422, 429),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'plan.generate', { clientId });
      const body = c.req.valid('json');
      const existing = await listPlans(db, clientId);
      const tenant = await resolveTenantManifest(c.get('principal'));
      const result = await generatePlan(db, asCoach(c.get('principal')), tenant, clientId, {
        kind: existing.length > 0 ? 'ADJUSTMENT' : 'INITIAL',
        ai: resolveAiConfig(tenant),
        mealCount: body.mealCount,
        ...(body.override !== undefined ? { override: body.override } : {}),
        ...(body.idempotencyKey !== undefined ? { idempotencyKey: body.idempotencyKey } : {}),
      });
      if (!result.ok) {
        if (result.error.code === 'CLIENT_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
        }
        if (result.error.code === 'BLOCKED_REQUIRES_OVERRIDE') {
          throw new ProblemError(
            403,
            'BLOCKED_REQUIRES_OVERRIDE',
            'Safety gate: coach override with reason required',
            result.error.reasons.join(', '),
          );
        }
        if (result.error.code === 'QUOTA_EXCEEDED') {
          throw new ProblemError(
            429,
            'QUOTA_EXCEEDED',
            'Monthly plan generation quota exceeded',
            `used ${result.error.used} of ${result.error.limit}`,
          );
        }
        throw new ProblemError(
          422,
          result.error.code,
          'Plan generation failed',
          JSON.stringify(result.error),
        );
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/meal-plans/{id}/diet-plan.pdf',
      operationId: 'downloadDietPlanPdf',
      request: { params: dto.idParam },
      responses: {
        200: { description: 'Diet plan PDF (Day-1 template)' },
        ...problemDocs(404),
      },
    }),
    async (c) => {
      const { id } = c.req.valid('param');
      const existing = await getPlanWithItems(db, id);
      if (!existing) throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
      authorize(c, 'plan.read', { clientId: existing.plan.clientId });
      const result = await getDietPlanPdfData(db, id);
      if (!result.ok) {
        throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
      }
      const pdf = await renderDietPlanPdf(result.value);
      const filename = dietPlanFilename(result.value.clientName);
      return new Response(new Uint8Array(pdf), {
        status: 200,
        headers: {
          'content-type': 'application/pdf',
          'content-disposition': `attachment; filename="${filename}"`,
          'cache-control': 'no-store',
        },
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/v1/meal-plans/{id}',
      operationId: 'patchPlan',
      request: { params: dto.idParam, body: json(dto.patchPlanBody) },
      responses: {
        200: { description: 'Updated plan with items', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const planBefore = await getPlanWithItems(db, c.req.valid('param').id);
      if (!planBefore) throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
      authorize(c, 'plan.edit', { clientId: planBefore.plan.clientId });
      const result = await patchPlan(
        db,
        asCoach(c.get('principal')),
        c.req.valid('param').id,
        c.req.valid('json').ops,
      );
      if (!result.ok) {
        if (result.error.code === 'PLAN_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
        }
        throw new ProblemError(
          422,
          result.error.code,
          'Plan edit rejected',
          JSON.stringify(result.error),
        );
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/meal-plans/{id}/publish',
      operationId: 'publishPlan',
      request: { params: dto.idParam, body: json(dto.publishBody) },
      responses: {
        200: { description: 'Published plan', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const existing = await getPlanWithItems(db, c.req.valid('param').id);
      if (!existing) throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
      authorize(c, 'plan.publish', { clientId: existing.plan.clientId });
      const body = c.req.valid('json');
      const tenant = await resolveTenantManifest(c.get('principal'));
      const result = await publishPlan(
        db,
        asCoach(c.get('principal')),
        c.req.valid('param').id,
        {
          reviewed: true,
          ...(body.acknowledgeDrift === true ? { acknowledgeDrift: true } : {}),
        },
        {
          kcalTolerancePct: tenant.aiConfig.kcalTolerancePct,
          macroTolerancePct: tenant.aiConfig.macroTolerancePct,
        },
      );
      if (!result.ok) {
        if (result.error.code === 'PLAN_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
        }
        if (result.error.code === 'DRIFT_ACK_REQUIRED') {
          throw new ProblemError(
            422,
            'DRIFT_ACK_REQUIRED',
            'Day totals are outside tolerance. Acknowledge drift to publish',
            `days=${result.error.days.join(',')}`,
          );
        }
        if (result.error.code === 'REVIEW_REQUIRED') {
          throw new ProblemError(422, 'REVIEW_REQUIRED', 'Coach review confirmation required');
        }
        throw new ProblemError(422, result.error.code, 'Plan cannot be published');
      }
      return c.json(result.value);
    },
  );
};
