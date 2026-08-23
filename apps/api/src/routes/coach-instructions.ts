import { createRoute } from '@hono/zod-openapi';
import { getActiveInstructions, saveInstructions } from '@gymos/modules/nutrition';
import { json, type GymosApp } from '../http';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

/**
 * Coach-scoped Layer-3 narration override (ADR-0015 D2). Self-scoped by
 * construction — a coach can only ever read/write their own instructions,
 * keyed by their own `coachId` — so no separate `authorize()` RBAC check is
 * needed beyond `asCoach` confirming the principal has a coach profile at
 * all, matching the existing `/v1/me` route's self-scope pattern.
 */
export const registerCoachInstructionsRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, asCoach } = bind;

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/me/meal-instructions',
      operationId: 'getMealInstructions',
      responses: { 200: { description: 'Active coach meal instructions', ...json(dto.anyObject) } },
    }),
    async (c) => {
      const { coachId } = asCoach(c.get('principal'));
      const active = await getActiveInstructions(db, coachId);
      return c.json({ instructions: active });
    },
  );

  app.openapi(
    createRoute({
      method: 'put',
      path: '/v1/me/meal-instructions',
      operationId: 'putMealInstructions',
      request: { body: json(dto.putMealInstructionsBody) },
      responses: { 200: { description: 'Saved coach meal instructions', ...json(dto.anyObject) } },
    }),
    async (c) => {
      const principal = asCoach(c.get('principal'));
      const { text, mealShares } = c.req.valid('json');
      const result = await saveInstructions(db, principal, text, mealShares);
      return c.json({ instructions: result });
    },
  );
};
