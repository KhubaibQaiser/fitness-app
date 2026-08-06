import { createHash, randomUUID } from 'node:crypto';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { type AiConfig } from '@gymos/ai';
import { can, type Action } from '@gymos/core/rbac';
import { schema as s, type Db } from '@gymos/db';
import {
  completeCheckIn,
  createClient,
  createGoal,
  createNote,
  getActiveGoal,
  getCheckIn,
  getClient,
  getCredentialsPdfData,
  goalProgressPct,
  latestWeightKg,
  listCheckIns,
  listClients,
  listGoals,
  listNotes,
  listVitals,
  nextDueCheckIns,
  onboardClient,
  recordVitals,
  setGoalStatus,
  updateClient,
} from '@gymos/modules/coaching';
import { getPilotPrincipal, type Principal } from '@gymos/modules/identity';
import {
  listNotifications,
  markAllRead,
  markRead,
  unreadCount,
} from '@gymos/modules/notifications';
import {
  diffPlanItems,
  foodsById,
  generatePlan,
  getActiveProfile,
  getPlanWithItems,
  listFoods,
  listPlans,
  patchPlan,
  publishPlan,
  putProfile,
} from '@gymos/modules/nutrition';
import { type TenantManifest } from '@gymos/modules/tenancy';
import { credentialsFilename, renderCredentialsPdf } from './credentials-pdf';
import { type Env } from './env';
import {
  createRateLimiter,
  GATE_COOKIE_NAME,
  issueGateCookie,
  verifyAccessKey,
  verifyGateCookie,
} from './gate';
import { ProblemError, problemResponse } from './problems';
import * as dto from './schemas';

export type AppDeps = {
  db: Db;
  manifest: TenantManifest;
  env: Pick<
    Env,
    | 'PILOT_ACCESS_KEY'
    | 'GATE_COOKIE_SECRET'
    | 'AI_MODE'
    | 'AI_BASE_URL'
    | 'AI_MODEL'
    | 'AI_API_KEY'
  >;
};

type Vars = { requestId: string; principal: Principal };
type AppContext = Context<{ Variables: Vars }>;

const json = <S extends z.ZodType>(schema: S) => ({
  content: { 'application/json': { schema } },
});

/** Spec-side documentation for error statuses (bodies are problem+json). */
const problemDocs = (...statuses: number[]) =>
  Object.fromEntries(
    statuses.map((status) => [status, { description: 'Problem details', ...json(dto.anyObject) }]),
  );

export const buildApp = ({ db, manifest, env }: AppDeps) => {
  const aiConfig: AiConfig = {
    mode: env.AI_MODE,
    verbosity: manifest.aiConfig.verbosity,
    ...(env.AI_BASE_URL !== undefined ? { baseUrl: env.AI_BASE_URL } : {}),
    ...(env.AI_MODEL !== undefined ? { model: env.AI_MODEL } : {}),
    ...(env.AI_API_KEY !== undefined ? { apiKey: env.AI_API_KEY } : {}),
  };

  const enterLimiter = createRateLimiter(5, 60_000);

  const app = new OpenAPIHono<{ Variables: Vars }>({
    defaultHook: (result, c) => {
      if (!result.success) {
        return problemResponse(
          c,
          422,
          'VALIDATION_FAILED',
          'Request validation failed',
          result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; '),
        );
      }
      return undefined;
    },
  });

  // ---- base middleware -------------------------------------------------------
  app.use('*', async (c, next) => {
    c.set('requestId', c.req.header('x-request-id') ?? randomUUID());
    await next();
    c.header('x-request-id', c.get('requestId'));
    c.header('x-content-type-options', 'nosniff');
  });

  app.onError((error, c) => {
    if (error instanceof ProblemError) {
      return problemResponse(c, error.status, error.code, error.title, error.detail);
    }
    console.error(`[${c.get('requestId')}]`, error);
    return problemResponse(c, 500, 'INTERNAL', 'Something went wrong on our side');
  });

  // ---- unauthenticated surface -----------------------------------------------
  app.get('/health/live', (c) => c.json({ status: 'live' }));

  app.get('/health/ready', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: 'ready' });
    } catch {
      return problemResponse(c, 500, 'NOT_READY', 'Database unreachable');
    }
  });

  const openGate = async (c: AppContext, key: string): Promise<Response> => {
    const ip = c.req.header('x-forwarded-for') ?? 'local';
    const allowed = enterLimiter(ip);
    const success = allowed && verifyAccessKey(key, env.PILOT_ACCESS_KEY);
    try {
      await db.insert(s.accessGateAttempts).values({ ip: null, success });
    } catch {
      // telemetry must never block the gate
    }
    if (!allowed)
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait a minute');
    if (!success)
      return problemResponse(c, 401, 'INVALID_ACCESS_KEY', 'That access key is not valid');
    // Secure only over HTTPS (prod Caddy sets x-forwarded-proto). Plain
    // http://localhost must stay non-Secure or the browser drops the cookie.
    const https =
      c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
    setCookie(c, GATE_COOKIE_NAME, issueGateCookie(env.GATE_COOKIE_SECRET), {
      httpOnly: true,
      secure: https,
      sameSite: 'Strict',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });
    return c.json({ ok: true });
  };

  app.post('/gate/enter', async (c) => {
    const parsed = dto.enterBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { key }');
    }
    return openGate(c, parsed.data.key);
  });

  // Link flow: the coach bookmarks /enter?key=… once per device.
  app.get('/gate/enter', async (c) => {
    const key = c.req.query('key');
    if (key === undefined) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Missing ?key');
    }
    const result = await openGate(c, key);
    if (result.status !== 200) return result;
    return c.redirect('/', 302);
  });

  app.get('/v1/config/public', (c) =>
    c.json({
      appName: manifest.branding.appName,
      colors: manifest.branding.colors,
      radius: manifest.branding.radius,
      terminology: manifest.terminology,
      locales: manifest.locales,
      units: manifest.units,
      currency: manifest.currency,
    }),
  );

  // ---- gate + principal for everything else under /v1 -------------------------
  app.use('/v1/*', async (c: AppContext, next) => {
    if (c.req.path === '/v1/config/public') return next();
    if (!verifyGateCookie(getCookie(c, GATE_COOKIE_NAME), env.GATE_COOKIE_SECRET)) {
      return problemResponse(c, 401, 'GATE_REQUIRED', 'Open your access link to use the app');
    }
    if (c.req.method !== 'GET') {
      const site = c.req.header('sec-fetch-site');
      if (site !== undefined && site !== 'same-origin' && site !== 'none') {
        return problemResponse(c, 403, 'CROSS_SITE_BLOCKED', 'Cross-site requests are not allowed');
      }
    }
    const principal = await getPilotPrincipal(db);
    c.set('principal', principal);
    return next();
  });

  // Idempotency replay for unsafe methods carrying Idempotency-Key.
  app.use('/v1/*', async (c: AppContext, next) => {
    if (c.req.method !== 'POST' && c.req.method !== 'PUT') return next();
    const key = c.req.header('idempotency-key');
    if (key === undefined) return next();
    const bodyText = await c.req.raw.clone().text();
    const requestHash = createHash('sha256').update(`${c.req.path}:${bodyText}`).digest('hex');
    const [existing] = await db
      .select()
      .from(s.idempotencyKeys)
      .where(sql`${s.idempotencyKeys.key} = ${key}`)
      .limit(1);
    if (existing) {
      if (existing.requestHash !== requestHash) {
        return problemResponse(c, 409, 'IDEMPOTENCY_CONFLICT', 'Same key, different request body');
      }
      return c.body(JSON.stringify(existing.responseBody), existing.responseStatus as 200, {
        'content-type': 'application/json',
        'x-idempotent-replay': 'true',
      });
    }
    await next();
    if (c.res.status < 500 && c.res.headers.get('content-type')?.includes('json') === true) {
      const responseBody: unknown = await c.res
        .clone()
        .json()
        .catch(() => null);
      await db
        .insert(s.idempotencyKeys)
        .values({
          key,
          requestHash,
          responseStatus: c.res.status,
          responseBody,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .onConflictDoNothing();
    }
  });

  /** RBAC check — denies read as 404 to avoid existence leaks. */
  const authorize = (
    c: AppContext,
    action: Action,
    resource: { outletId?: string; clientId?: string; ownerUserId?: string } = {},
  ): void => {
    if (!can(c.get('principal').actor, action, resource)) {
      throw new ProblemError(404, 'NOT_FOUND', 'Resource not found');
    }
  };

  // ---- me + notifications ------------------------------------------------------
  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/me',
      operationId: 'getMe',
      responses: { 200: { description: 'Current principal', ...json(dto.anyObject) } },
    }),
    (c) => {
      const p = c.get('principal');
      return c.json({
        userId: p.userId,
        name: p.name,
        email: p.email,
        locale: p.locale,
        unitPref: p.unitPref ?? manifest.units,
        roles: [...p.actor.roles],
      });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/notifications',
      operationId: 'listNotifications',
      responses: { 200: { description: 'Notifications (desc)', ...json(dto.objectList) } },
    }),
    async (c) => {
      authorize(c, 'notification.read', { ownerUserId: c.get('principal').userId });
      return c.json({ items: await listNotifications(db, c.get('principal').userId) });
    },
  );

  app.openapi(
    createRoute({
      method: 'get',
      path: '/v1/notifications/unread-count',
      operationId: 'unreadCount',
      responses: {
        200: { description: 'Unread count', ...json(z.object({ count: z.number() })) },
      },
    }),
    async (c) => c.json({ count: await unreadCount(db, c.get('principal').userId) }),
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/notifications/{id}/read',
      operationId: 'markNotificationRead',
      request: { params: dto.idParam },
      responses: { 200: { description: 'Marked', ...json(dto.okResponse) } },
    }),
    async (c) => {
      await markRead(db, c.get('principal').userId, c.req.valid('param').id);
      return c.json({ ok: true });
    },
  );

  app.openapi(
    createRoute({
      method: 'post',
      path: '/v1/notifications/read-all',
      operationId: 'markAllNotificationsRead',
      responses: { 200: { description: 'Marked', ...json(dto.okResponse) } },
    }),
    async (c) => {
      await markAllRead(db, c.get('principal').userId);
      return c.json({ ok: true });
    },
  );

  // ---- clients -------------------------------------------------------------------
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
      const items = await listClients(db, {
        ...(q !== undefined ? { q } : {}),
        ...(status !== undefined ? { status } : {}),
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
      const client = await createClient(db, c.get('principal'), c.req.valid('json'));
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
      const result = await onboardClient(db, c.get('principal'), {
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
      });
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
      const updated = await updateClient(db, c.get('principal'), clientId, c.req.valid('json'));
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
      return c.json(await createNote(db, c.get('principal'), clientId, c.req.valid('json').body));
    },
  );

  // ---- vitals --------------------------------------------------------------------
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
      return c.json(await recordVitals(db, c.get('principal'), clientId, c.req.valid('json')));
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
        c.get('principal'),
        clientId,
        c.req.valid('json').restrictions,
      );
      return c.json(result);
    },
  );

  // ---- goals ---------------------------------------------------------------------------
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
      const result = await createGoal(db, c.get('principal'), clientId, c.req.valid('json'));
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
        c.get('principal'),
        c.req.valid('param').id,
        c.req.valid('json').status,
      );
      if (!updated) throw new ProblemError(404, 'NOT_FOUND', 'Goal not found');
      return c.json(updated);
    },
  );

  // ---- check-ins -------------------------------------------------------------------------
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
      return c.json({ items: await nextDueCheckIns(db) });
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
      const result = await completeCheckIn(db, c.get('principal'), clientId, c.req.valid('json'));
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

      const generated = await generatePlan(db, c.get('principal'), manifest, checkIn.clientId, {
        kind: 'ADJUSTMENT',
        targetsOverride: verdict.newTargets as dto.MacroTargets,
        ai: aiConfig,
      });
      if (!generated.ok) {
        throw new ProblemError(
          422,
          generated.error.code,
          'Adjustment generation failed',
          JSON.stringify(generated.error),
        );
      }

      await db.insert(s.aiFeedbackEvents).values({
        planId: generated.value.plan.id,
        coachId: c.get('principal').coachId,
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

  // ---- foods & plans ------------------------------------------------------------------------
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
        ...problemDocs(403, 404, 422),
      },
    }),
    async (c) => {
      const { clientId } = c.req.valid('param');
      authorize(c, 'plan.generate', { clientId });
      const body = c.req.valid('json');
      const result = await generatePlan(db, c.get('principal'), manifest, clientId, {
        kind: 'INITIAL',
        ai: aiConfig,
        mealCount: body.mealCount,
        ...(body.override !== undefined ? { override: body.override } : {}),
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
        c.get('principal'),
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
      request: { params: dto.idParam },
      responses: {
        200: { description: 'Published plan', ...json(dto.anyObject) },
        ...problemDocs(404, 422),
      },
    }),
    async (c) => {
      const existing = await getPlanWithItems(db, c.req.valid('param').id);
      if (!existing) throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
      authorize(c, 'plan.publish', { clientId: existing.plan.clientId });
      const result = await publishPlan(db, c.get('principal'), c.req.valid('param').id);
      if (!result.ok) {
        if (result.error.code === 'PLAN_NOT_FOUND') {
          throw new ProblemError(404, 'NOT_FOUND', 'Plan not found');
        }
        throw new ProblemError(422, result.error.code, 'Plan cannot be published');
      }
      return c.json(result.value);
    },
  );

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'GymOS Pilot API', version: '1.0.0' },
  });

  return app;
};

export type App = ReturnType<typeof buildApp>;
