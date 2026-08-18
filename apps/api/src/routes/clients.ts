import { createRoute, z } from '@hono/zod-openapi';
import {
  createClient,
  createNote,
  getActiveGoal,
  getClient,
  getCredentialsPdfData,
  goalProgressPct,
  latestWeightKg,
  listCheckIns,
  listClients,
  listNotes,
  onboardClient,
  updateClient,
} from '@gymos/modules/coaching';
import { getActiveProfile, listPlans } from '@gymos/modules/nutrition';
import { credentialsFilename, renderCredentialsPdf } from '../credentials-pdf';
import { json, problemDocs, type GymosApp } from '../http';
import { ProblemError } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

export const registerClientRoutes = (app: GymosApp, bind: RouteBind): void => {
  const { db, authorize, asCoach, resolveTenantManifest } = bind;
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients',
      operationId: 'listClients',
      request: {
        query: z.object({
          q: z.string().optional(),
          status: z.enum(['active', 'archived']).optional(),
        }),
      },
      responses: { 200: { description: 'Roster, attention-sorted', ...json(dto.objectList) } },
    }),
    async (c) => {
      authorize(c, 'client.list');
      const { q, status } = c.req.valid('query');
      const principal = c.get('principal');
      const items = await listClients(db, {
        ...(q !== undefined ? { q } : {}),
        ...(status !== undefined ? { status } : {}),
        scope: principal.actor.scope,
        orgId: principal.orgId,
      });
      return c.json({ items });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients',
      operationId: 'createClient',
      request: { body: json(dto.createClientBody) },
      responses: {
        200: { description: 'Created client', ...json(dto.anyObject) },
        ...problemDocs(422),
      },
    }),
    async (c) => {
      authorize(c, 'client.manage');
      const client = await createClient(db, asCoach(c.get('principal')), c.req.valid('json'));
      return c.json(client);
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients/onboard',
      operationId: 'onboardClient',
      request: { body: json(dto.onboardClientBody) },
      responses: {
        200: { description: 'Onboarded client with vitals and goal', ...json(dto.anyObject) },
        ...problemDocs(422),
      },
    }),
    async (c) => {
      authorize(c, 'client.manage');
      const body = c.req.valid('json');
      const tenant = await resolveTenantManifest(c.get('principal'));
      const result = await onboardClient(
        db,
        asCoach(c.get('principal')),
        {
          client: {
            name: body.client.name,
            sex: body.client.sex,
            ...(body.client.dob !== undefined ? { dob: body.client.dob } : {}),
            ...(body.client.phone !== undefined ? { phone: body.client.phone } : {}),
            ...(body.client.email !== undefined ? { email: body.client.email } : {}),
            heightCm: body.client.heightCm,
            activityLevel: body.client.activityLevel,
            ...(body.client.medicalFlags !== undefined
              ? { medicalFlags: body.client.medicalFlags }
              : {}),
            intake: {
              signaturePngBase64: body.client.intake.signaturePngBase64,
              signedAt: body.client.intake.signedAt,
              ...(body.client.intake.heightDisplayUnit !== undefined
                ? { heightDisplayUnit: body.client.intake.heightDisplayUnit }
                : {}),
            },
          },
          vitals: body.vitals,
          goal: body.goal,
          ...(body.dietary !== undefined ? { dietary: body.dietary } : {}),
        },
        tenant,
      );
      if (!result.ok) {
        throw new ProblemError(
          422,
          result.error.code,
          'Onboarding could not complete',
          JSON.stringify(result.error),
        );
      }
      return c.json(result.value);
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/credentials.pdf',
      operationId: 'downloadCredentialsPdf',
      request: { params: dto.clientIdParam },
      responses: {
        200: { description: 'Credentials PDF' },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'client.read', { clientId });
      const result = await getCredentialsPdfData(db, clientId);
      if (!result.ok) {
        if (result.error.code === 'CLIENT_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
        }
        throw new ProblemError(
          422,
          'SIGNATURE_MISSING',
          'Client has not completed e-sign onboarding',
        );
      }
      const pdf = await renderCredentialsPdf(result.value);
      const filename = credentialsFilename(result.value.client.name);
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
      method: 'get',
      path: '/v1/clients/{clientId}',
      operationId: 'getClientDetail',
      request: { params: dto.clientIdParam },
      responses: {
        200: { description: 'Aggregated client detail', ...json(dto.anyObject) },
        ...problemDocs(404),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'client.read', { clientId });
      const client = await getClient(db, clientId);
      if (!client) throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
      const [goal, weight, profile, plans, checkIns] = await Promise.all([
        getActiveGoal(db, clientId),
        latestWeightKg(db, clientId),
        getActiveProfile(db, clientId),
        listPlans(db, clientId),
        listCheckIns(db, clientId, 8),
      ]);
      return c.json({
        client,
        goal,
        latestWeightKg: weight,
        goalProgressPct: goal
          ? goalProgressPct(goal.startWeightKg, goal.targetWeightKg, weight)
          : null,
        dietaryProfile: profile,
        plans: plans.map((plan) => ({
          id: plan.id,
          version: plan.version,
          title: plan.title,
          status: plan.status,
          targets: plan.targets,
          publishedAt: plan.publishedAt,
        })),
        recentCheckIns: checkIns,
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'patch',
      path: '/v1/clients/{clientId}',
      operationId: 'updateClient',
      request: { params: dto.clientIdParam, body: json(dto.updateClientBody) },
      responses: {
        200: { description: 'Updated client', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'client.manage', { clientId });
      const updated = await updateClient(
        db,
        asCoach(c.get('principal')),
        clientId,
        c.req.valid('json'),
      );
      if (!updated) throw new ProblemError(404, 'NOT_FOUND', 'Client not found');
      return c.json(updated);
    },
  );

  // ---- notes ---------------------------------------------------------------------
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/clients/{clientId}/notes',
      operationId: 'listNotes',
      request: { params: dto.clientIdParam },
      responses: { 200: { description: 'Notes (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'notes.read', { clientId });
      return c.json({ items: await listNotes(db, clientId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/clients/{clientId}/notes',
      operationId: 'createNote',
      request: { params: dto.clientIdParam, body: json(dto.noteBody) },
      responses: { 200: { description: 'Created note', ...json(dto.anyObject) } },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'notes.write', { clientId });
      return c.json(
        await createNote(db, asCoach(c.get('principal')), clientId, c.req.valid('json').body),
      );
    },
  );
};
