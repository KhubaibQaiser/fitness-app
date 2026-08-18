import { createHash, randomUUID } from 'node:crypto';
import { OpenAPIHono } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { getCookie } from 'hono/cookie';
import { type AiConfig } from '@gymos/ai';
import { resolveUnitPrefs, unitPrefsToSystem } from '@gymos/core/units';
import { schema as s } from '@gymos/db';
import {
  createEmailSender,
  isSessionActive,
  resolvePrincipal,
  type Principal,
} from '@gymos/modules/identity';
import { CURRENCY_CODES, getManifestBySlug, getManifestForOrg } from '@gymos/modules/tenancy';
import { type AppDeps } from './app-deps';
import { clearAuthCookies, setAccessCookie, setRefreshCookie } from './auth-cookies';
import { ACCESS_COOKIE_NAME } from './auth/constants';
import { issueAccessToken, verifyAccessToken } from './auth/jwt';
import { resolveEmailFrom, resolveOtpPepper } from './env';
import { type AppContext, type GymosVars } from './http';
import { ProblemError, problemResponse } from './problems';
import { createDbRateLimiter } from './rate-limit';
import { asCoach, authorize, requireCoachId } from './rbac-http';
import { type RouteBind } from './route-bind';
import { registerAuthRoutes } from './routes/auth';
import { registerCheckInRoutes } from './routes/check-ins';
import { registerClientRoutes } from './routes/clients';
import { registerMeRoutes } from './routes/me';
import { registerNotificationRoutes } from './routes/notifications';
import { registerPlanRoutes } from './routes/plans';
import { registerVitalsGoalRoutes } from './routes/vitals-goals';

export type { AppDeps } from './app-deps';

export const buildApp = ({ db, manifest: bootstrapManifest, env, mail: mailOverride }: AppDeps) => {
  const resolveTenantManifest = async (principal: Principal) => {
    try {
      return await getManifestForOrg(db, principal.orgId);
    } catch {
      return bootstrapManifest;
    }
  };

  const resolveAiConfig = (tenant: Awaited<ReturnType<typeof resolveTenantManifest>>): AiConfig => {
    const flags = tenant.aiConfig.featureFlags;
    const canaryVersion = tenant.aiConfig.promptVersionCanary;
    const canaryPct = tenant.aiConfig.promptCanaryPercent ?? 0;
    const useCanary =
      canaryVersion !== undefined && canaryPct > 0 && Math.random() * 100 < canaryPct;
    return {
      mode: flags?.aiMode ?? env.AI_MODE,
      verbosity: tenant.aiConfig.verbosity,
      ...(env.AI_BASE_URL !== undefined ? { baseUrl: env.AI_BASE_URL } : {}),
      ...(env.AI_MODEL !== undefined ? { model: env.AI_MODEL } : {}),
      ...(env.AI_API_KEY !== undefined ? { apiKey: env.AI_API_KEY } : {}),
      ...(env.AI_ADAPTER_VERSION !== undefined ? { adapterVersion: env.AI_ADAPTER_VERSION } : {}),
      ...(flags?.adapterVersion !== undefined ? { adapterVersion: flags.adapterVersion } : {}),
      ...(flags?.promptVersion !== undefined ? { promptVersion: flags.promptVersion } : {}),
      ...(useCanary ? { promptVersion: canaryVersion } : {}),
      ...(tenant.aiConfig.promptPackId !== undefined
        ? { promptPackId: tenant.aiConfig.promptPackId }
        : { promptPackId: tenant.aiConfig.cuisineContext }),
    };
  };

  const loginLimiter = createDbRateLimiter(db, 10, 60_000);
  const signupIpLimiter = createDbRateLimiter(db, 5, 15 * 60_000);
  const signupEmailLimiter = createDbRateLimiter(db, 3, 15 * 60_000);
  const forgotIpLimiter = createDbRateLimiter(db, 5, 15 * 60_000);
  const forgotEmailLimiter = createDbRateLimiter(db, 3, 60 * 60_000);
  const confirmIpLimiter = createDbRateLimiter(db, 10, 15 * 60_000);

  const otpPepper = resolveOtpPepper({
    OTP_PEPPER: env.OTP_PEPPER,
    NODE_ENV: env.NODE_ENV ?? 'development',
  });
  const mail =
    mailOverride ??
    createEmailSender({
      apiKey: env.RESEND_API_KEY,
      from: resolveEmailFrom({
        EMAIL_FROM: env.EMAIL_FROM,
        RESEND_API_KEY: env.RESEND_API_KEY,
        NODE_ENV: env.NODE_ENV ?? 'development',
      }),
      requireDelivery: (env.NODE_ENV ?? 'development') === 'production',
    });
  const otpDeps = { pepper: otpPepper };
  const signupDeps = { ...otpDeps, mail };
  const resetDeps = { ...otpDeps, mail };

  const clientIp = (c: AppContext): string => {
    const raw = c.req.header('x-forwarded-for');
    if (raw === undefined) return 'local';
    return raw.split(',')[0]?.trim() ?? 'local';
  };

  const app = new OpenAPIHono<{ Variables: GymosVars }>({
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

  app.get('/health/live', (c) => c.json({ status: 'live' }));

  app.get('/health/ready', async (c) => {
    try {
      await db.execute(sql`select 1`);
      return c.json({ status: 'ready' });
    } catch {
      return problemResponse(c, 500, 'NOT_READY', 'Database unreachable');
    }
  });

  app.get('/v1/config/public', async (c) => {
    const slug = c.req.query('slug');
    const fromRegistry =
      slug !== undefined && slug.length > 0 ? await getManifestBySlug(db, slug) : null;
    const manifest = fromRegistry ?? bootstrapManifest;
    return c.json({
      appName: manifest.branding.appName,
      colors: manifest.branding.colors,
      radius: manifest.branding.radius,
      terminology: manifest.terminology,
      locales: manifest.locales,
      units: manifest.units,
      unitPrefs: manifest.unitPrefs,
      defaultCountry: manifest.defaultCountry,
      currency: manifest.currency,
      currencies: [...CURRENCY_CODES],
      ...(manifest.nutrition !== undefined ? { nutrition: manifest.nutrition } : {}),
    });
  });

  const respondWithTokens = async (
    c: AppContext,
    userId: string,
    session: { sessionId: string; refreshToken: string; expiresAt: string },
  ) => {
    const principal = await resolvePrincipal(db, userId);
    const tenant = await resolveTenantManifest(principal);
    const unitPrefs = resolveUnitPrefs(principal.unitPrefs, tenant.unitPrefs);
    const { token, expiresIn } = await issueAccessToken(
      {
        sub: principal.userId,
        sid: session.sessionId,
        orgId: principal.orgId,
        outletId: principal.outletId,
        roles: [...principal.actor.roles],
      },
      env.JWT_ACCESS_SECRET,
    );
    const maxAgeSec = Math.max(60, Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000));
    setRefreshCookie(c, session.refreshToken, maxAgeSec);
    setAccessCookie(c, token);
    return c.json({
      accessToken: token,
      expiresIn,
      refreshToken: session.refreshToken,
      me: {
        userId: principal.userId,
        name: principal.name,
        email: principal.email,
        locale: principal.locale,
        unitPref: unitPrefsToSystem(unitPrefs),
        unitPrefs,
        defaultCountry: principal.defaultCountry ?? tenant.defaultCountry,
        currencyPref: principal.currencyPref ?? tenant.currency,
        roles: principal.actor.roles,
      },
    });
  };

  const bind: RouteBind = {
    db,
    env,
    bootstrapManifest,
    resolveTenantManifest,
    resolveAiConfig,
    authorize,
    asCoach,
    requireCoachId,
    respondWithTokens,
    clientIp,
    loginLimiter,
    signupIpLimiter,
    signupEmailLimiter,
    forgotIpLimiter,
    forgotEmailLimiter,
    confirmIpLimiter,
    otpDeps,
    signupDeps,
    resetDeps,
  };

  registerAuthRoutes(app, bind);

  app.use('/v1/*', async (c: AppContext, next) => {
    if (c.req.path === '/v1/config/public') return next();
    if (
      c.req.path === '/v1/auth/login' ||
      c.req.path === '/v1/auth/refresh' ||
      c.req.path === '/v1/auth/logout' ||
      c.req.path === '/v1/auth/signup/coach/start' ||
      c.req.path === '/v1/auth/signup/coach/confirm' ||
      c.req.path === '/v1/auth/signup/coach/resend' ||
      c.req.path === '/v1/auth/password/forgot' ||
      c.req.path === '/v1/auth/password/reset'
    ) {
      return next();
    }

    const header = c.req.header('authorization');
    const bearer = header?.match(/^Bearer\s+(.+)$/i)?.[1];
    const fromCookie = getCookie(c, ACCESS_COOKIE_NAME);
    const accessToken =
      bearer !== undefined && bearer.length > 0
        ? bearer
        : fromCookie !== undefined && fromCookie.length > 0
          ? fromCookie
          : undefined;
    if (accessToken === undefined) {
      return problemResponse(c, 401, 'AUTH_REQUIRED', 'Sign in to use the app');
    }
    const claims = await verifyAccessToken(accessToken, env.JWT_ACCESS_SECRET);
    if (claims === null) {
      return problemResponse(c, 401, 'AUTH_REQUIRED', 'Session expired. Please sign in again');
    }

    const sessionLive = await isSessionActive(db, {
      sessionId: claims.sid,
      userId: claims.sub,
    });
    if (!sessionLive) {
      clearAuthCookies(c);
      return problemResponse(c, 401, 'AUTH_REQUIRED', 'Session expired. Please sign in again');
    }

    if (c.req.method !== 'GET') {
      const site = c.req.header('sec-fetch-site');
      if (site !== undefined && site !== 'same-origin' && site !== 'none') {
        return problemResponse(c, 403, 'CROSS_SITE_BLOCKED', 'Cross-site requests are not allowed');
      }
    }

    const principal = await resolvePrincipal(db, claims.sub);
    c.set('principal', principal);
    return next();
  });

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

  registerMeRoutes(app, bind);
  registerNotificationRoutes(app, bind);
  registerClientRoutes(app, bind);
  registerVitalsGoalRoutes(app, bind);
  registerCheckInRoutes(app, bind);
  registerPlanRoutes(app, bind);

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'GymOS Pilot API', version: '1.0.0' },
  });

  return app;
};

export type App = ReturnType<typeof buildApp>;
