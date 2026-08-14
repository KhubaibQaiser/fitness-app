import { createHash, randomUUID } from 'node:crypto';
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { sql } from 'drizzle-orm';
import { type Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { type AiConfig } from '@gymos/ai';
import { can, type Action } from '@gymos/core/rbac';
import { resolveUnitPrefs, unitPrefsToSystem } from '@gymos/core/units';
import { schema as s, type Db } from '@gymos/db';
import {
  completeCheckIn,
  createClient,
  createGoal,
  createNote,
  getActiveGoal,
  getCheckIn,
  getCheckInDetail,
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
  updateAndRerunCheckIn,
  updateClient,
} from '@gymos/modules/coaching';
import {
  confirmCoachSignup,
  createEmailSender,
  isSessionActive,
  loginWithPassword,
  requestPasswordReset,
  resendCoachSignupOtp,
  resetPasswordWithOtp,
  resolvePrincipal,
  revokeAllSessionsForUser,
  revokeSessionByRefreshToken,
  rotateSessionByToken,
  startCoachSignup,
  updateUserPrefs,
  type EmailSender,
  type Principal,
} from '@gymos/modules/identity';
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
  getDietPlanPdfData,
  getPlanWithItems,
  listFoods,
  listPlans,
  patchPlan,
  publishPlan,
  putProfile,
} from '@gymos/modules/nutrition';
import {
  CURRENCY_CODES,
  getManifestBySlug,
  getManifestForOrg,
  type TenantManifest,
} from '@gymos/modules/tenancy';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_HEADER_NAME } from './auth/constants';
import { ACCESS_TOKEN_TTL_SECONDS, issueAccessToken, verifyAccessToken } from './auth/jwt';
import { credentialsFilename, renderCredentialsPdf } from './credentials-pdf';
import { dietPlanFilename, renderDietPlanPdf } from './diet-plan-pdf';
import { resolveEmailFrom, resolveOtpPepper, type Env } from './env';
import { ProblemError, problemResponse } from './problems';
import { createDbRateLimiter } from './rate-limit';
import * as dto from './schemas';

export type AppDeps = {
  db: Db;
  /**
   * Bootstrap manifest (file / OpenAPI). Authenticated routes prefer the
   * per-org registry via `getManifestForOrg`; public config falls back here.
   */
  manifest: TenantManifest;
  env: Pick<Env, 'JWT_ACCESS_SECRET' | 'AI_MODE'> &
    Partial<
      Pick<
        Env,
        | 'AI_BASE_URL'
        | 'AI_MODEL'
        | 'AI_API_KEY'
        | 'AI_ADAPTER_VERSION'
        | 'OTP_PEPPER'
        | 'RESEND_API_KEY'
        | 'EMAIL_FROM'
        | 'NODE_ENV'
      >
    >;
  /** Test seam — inject a memory mailer. */
  mail?: EmailSender | undefined;
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

const readRefreshToken = (c: AppContext): string | undefined => {
  const fromCookie = getCookie(c, REFRESH_COOKIE_NAME);
  if (fromCookie !== undefined && fromCookie.length > 0) return fromCookie;
  const fromHeader = c.req.header(REFRESH_HEADER_NAME);
  if (fromHeader !== undefined && fromHeader.length > 0) return fromHeader;
  return undefined;
};

const setRefreshCookie = (c: AppContext, refreshToken: string, maxAgeSec: number): void => {
  const https =
    c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
  setCookie(c, REFRESH_COOKIE_NAME, refreshToken, {
    httpOnly: true,
    secure: https,
    sameSite: 'Strict',
    path: '/',
    maxAge: maxAgeSec,
  });
};

const setAccessCookie = (c: AppContext, accessToken: string): void => {
  const https =
    c.req.header('x-forwarded-proto') === 'https' || new URL(c.req.url).protocol === 'https:';
  setCookie(c, ACCESS_COOKIE_NAME, accessToken, {
    httpOnly: true,
    secure: https,
    sameSite: 'Strict',
    path: '/',
    maxAge: ACCESS_TOKEN_TTL_SECONDS,
  });
};

const clearRefreshCookie = (c: AppContext): void => {
  deleteCookie(c, REFRESH_COOKIE_NAME, { path: '/' });
};

const clearAccessCookie = (c: AppContext): void => {
  deleteCookie(c, ACCESS_COOKIE_NAME, { path: '/' });
};

/** Clear both web session cookies (login out / hard auth failure). */
const clearAuthCookies = (c: AppContext): void => {
  clearRefreshCookie(c);
  clearAccessCookie(c);
};

const requireCoachId = (principal: Principal): string => {
  if (principal.coachId === null) {
    throw new ProblemError(403, 'COACH_REQUIRED', 'This action requires a coach account');
  }
  return principal.coachId;
};

/** Narrow principal for coaching mutations that require a coach profile. */
const asCoach = (principal: Principal): Principal & { coachId: string } => ({
  ...principal,
  coachId: requireCoachId(principal),
});

export const buildApp = ({ db, manifest: bootstrapManifest, env, mail: mailOverride }: AppDeps) => {
  /** Authenticated path: org registry first, bootstrap file as last-resort fallback. */
  const resolveTenantManifest = async (principal: Principal): Promise<TenantManifest> => {
    try {
      return await getManifestForOrg(db, principal.orgId);
    } catch {
      return bootstrapManifest;
    }
  };

  /** Resolve per generation so prompt canary % applies across requests. */
  const resolveAiConfig = (tenant: TenantManifest): AiConfig => {
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
    });
  });

  /** Issue access JWT + set refresh cookie/body for a freshly created/rotated session. */
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

  app.post('/v1/auth/login', async (c) => {
    const parsed = dto.loginBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { email, password }');
    }
    const ip = c.req.header('x-forwarded-for') ?? 'local';
    if (!(await loginLimiter(ip))) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait a minute');
    }
    const result = await loginWithPassword(db, parsed.data.email, parsed.data.password, {
      userAgent: c.req.header('user-agent'),
      ip: ip === 'local' ? undefined : ip.split(',')[0]?.trim(),
    });
    if (!result.ok) {
      return problemResponse(c, 401, 'INVALID_CREDENTIALS', 'Email or password is incorrect');
    }
    return respondWithTokens(c, result.value.userId, result.value.session);
  });

  app.post('/v1/auth/refresh', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { refreshToken?: string } | null;
    const refreshToken = body?.refreshToken ?? readRefreshToken(c);
    if (refreshToken === undefined) {
      return problemResponse(c, 401, 'AUTH_REQUIRED', 'Missing refresh token');
    }
    const outcome = await rotateSessionByToken(db, refreshToken, {
      userAgent: c.req.header('user-agent'),
      ip: (() => {
        const raw = c.req.header('x-forwarded-for');
        if (raw === undefined) return undefined;
        return raw.split(',')[0]?.trim();
      })(),
    });

    switch (outcome.kind) {
      case 'rotated':
        return respondWithTokens(c, outcome.userId, outcome.session);
      case 'reuse-grace':
        // Benign race (concurrent request already rotated this token) —
        // fail this one call without tearing down the session.
        return problemResponse(c, 401, 'REFRESH_RACE', 'Token already rotated — retry');
      case 'reuse-detected':
        clearAuthCookies(c);
        return problemResponse(
          c,
          401,
          'REUSE_DETECTED',
          'Refresh token reused — all sessions revoked for safety',
        );
      case 'invalid':
        clearAuthCookies(c);
        return problemResponse(c, 401, 'AUTH_REQUIRED', 'Session expired — please sign in again');
    }
  });

  app.post('/v1/auth/logout', async (c) => {
    const body = (await c.req.json().catch(() => null)) as { refreshToken?: string } | null;
    const refreshToken = body?.refreshToken ?? readRefreshToken(c);
    if (refreshToken !== undefined) {
      await revokeSessionByRefreshToken(db, refreshToken);
    }
    clearAuthCookies(c);
    return c.json({ ok: true });
  });

  app.post('/v1/auth/signup/coach/start', async (c) => {
    const parsed = dto.signupCoachStartBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(
        c,
        422,
        'VALIDATION_FAILED',
        'Provide { name, email, phone, password }',
      );
    }
    const ip = clientIp(c);
    const emailKey = parsed.data.email.trim().toLowerCase();
    if (
      !(await signupIpLimiter(`signup:ip:${ip}`)) ||
      !(await signupEmailLimiter(`signup:email:${emailKey}`))
    ) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait and try again');
    }
    const result = await startCoachSignup(db, signupDeps, parsed.data);
    if (!result.ok) {
      const map: Record<string, { status: 400 | 409; title: string }> = {
        EMAIL_TAKEN: { status: 409, title: 'An account with this email already exists' },
        PHONE_TAKEN: { status: 409, title: 'An account with this phone already exists' },
        INVALID_PHONE: { status: 400, title: 'Enter a valid phone number' },
        INVALID_JOIN_CODE: { status: 400, title: 'Join code is invalid' },
      };
      const mapped = map[result.error.reason] ?? { status: 400 as const, title: 'Signup failed' };
      return problemResponse(c, mapped.status, result.error.reason, mapped.title);
    }
    return c.json({ ok: true });
  });

  app.post('/v1/auth/signup/coach/confirm', async (c) => {
    const parsed = dto.signupCoachConfirmBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { email, code }');
    }
    const ip = clientIp(c);
    if (!(await confirmIpLimiter(`confirm:ip:${ip}`))) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait and try again');
    }
    const result = await confirmCoachSignup(db, otpDeps, parsed.data, {
      userAgent: c.req.header('user-agent'),
      ip: ip === 'local' ? undefined : ip,
    });
    if (!result.ok) {
      const map: Record<string, { status: 400 | 401 | 409; title: string }> = {
        OTP_INVALID: { status: 401, title: 'Invalid verification code' },
        OTP_EXPIRED: { status: 401, title: 'Verification code expired' },
        OTP_LOCKED: { status: 401, title: 'Too many incorrect codes — request a new one' },
        OTP_NOT_FOUND: { status: 401, title: 'No pending verification — start signup again' },
        EMAIL_TAKEN: { status: 409, title: 'An account with this email already exists' },
        PHONE_TAKEN: { status: 409, title: 'An account with this phone already exists' },
        INVALID_JOIN_CODE: { status: 400, title: 'Join code is invalid' },
        INVALID_PAYLOAD: { status: 400, title: 'Signup data is invalid — start again' },
      };
      const mapped = map[result.error.reason] ?? {
        status: 401 as const,
        title: 'Verification failed',
      };
      return problemResponse(c, mapped.status, result.error.reason, mapped.title);
    }
    return respondWithTokens(c, result.value.userId, result.value.session);
  });

  app.post('/v1/auth/signup/coach/resend', async (c) => {
    const parsed = dto.signupCoachResendBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { email }');
    }
    const ip = clientIp(c);
    const emailKey = parsed.data.email.trim().toLowerCase();
    if (
      !(await signupIpLimiter(`resend:ip:${ip}`)) ||
      !(await signupEmailLimiter(`resend:email:${emailKey}`))
    ) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait and try again');
    }
    const result = await resendCoachSignupOtp(db, signupDeps, parsed.data.email);
    if (!result.ok) {
      return problemResponse(
        c,
        401,
        'OTP_NOT_FOUND',
        'No pending verification — start signup again',
      );
    }
    return c.json({ ok: true });
  });

  app.post('/v1/auth/password/forgot', async (c) => {
    const parsed = dto.forgotPasswordBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { email }');
    }
    const ip = clientIp(c);
    const emailKey = parsed.data.email.trim().toLowerCase();
    if (
      !(await forgotIpLimiter(`forgot:ip:${ip}`)) ||
      !(await forgotEmailLimiter(`forgot:email:${emailKey}`))
    ) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait and try again');
    }
    await requestPasswordReset(db, resetDeps, parsed.data.email);
    return c.json({ ok: true });
  });

  app.post('/v1/auth/password/reset', async (c) => {
    const parsed = dto.resetPasswordBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { email, code, newPassword }');
    }
    const ip = clientIp(c);
    if (!(await confirmIpLimiter(`reset:ip:${ip}`))) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts — wait and try again');
    }
    const result = await resetPasswordWithOtp(db, otpDeps, parsed.data);
    if (!result.ok) {
      const map: Record<string, { status: 401 | 404; title: string }> = {
        OTP_INVALID: { status: 401, title: 'Invalid verification code' },
        OTP_EXPIRED: { status: 401, title: 'Verification code expired' },
        OTP_LOCKED: { status: 401, title: 'Too many incorrect codes — request a new one' },
        OTP_NOT_FOUND: { status: 401, title: 'No pending reset — request a new code' },
        USER_NOT_FOUND: { status: 404, title: 'Account not found' },
      };
      const mapped = map[result.error.reason] ?? { status: 401 as const, title: 'Reset failed' };
      return problemResponse(c, mapped.status, result.error.reason, mapped.title);
    }
    return c.json({ ok: true });
  });

  // ---- JWT principal for everything else under /v1 -------------------------
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
      return problemResponse(c, 401, 'AUTH_REQUIRED', 'Session expired — please sign in again');
    }

    const sessionLive = await isSessionActive(db, {
      sessionId: claims.sid,
      userId: claims.sub,
    });
    if (!sessionLive) {
      clearAuthCookies(c);
      return problemResponse(c, 401, 'AUTH_REQUIRED', 'Session expired — please sign in again');
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
      const result = await onboardClient(db, asCoach(c.get('principal')), {
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
      const result = await createGoal(
        db,
        asCoach(c.get('principal')),
        clientId,
        c.req.valid('json'),
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
            'Day totals are outside tolerance — acknowledge drift to publish',
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

  app.doc('/openapi.json', {
    openapi: '3.1.0',
    info: { title: 'GymOS Pilot API', version: '1.0.0' },
  });

  return app;
};

export type App = ReturnType<typeof buildApp>;
