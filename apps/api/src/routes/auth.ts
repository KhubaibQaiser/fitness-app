import {
  confirmCoachSignup,
  loginWithPassword,
  requestPasswordReset,
  resendCoachSignupOtp,
  resetPasswordWithOtp,
  revokeSessionByRefreshToken,
  rotateSessionByToken,
  startCoachSignup,
} from '@gymos/modules/identity';
import { clearAuthCookies, readRefreshToken } from '../auth-cookies';
import { type GymosApp } from '../http';
import { problemResponse } from '../problems';
import { type RouteBind } from '../route-bind';
import * as dto from '../schemas';

export const registerAuthRoutes = (app: GymosApp, bind: RouteBind): void => {
  const {
    db,
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
  } = bind;
  app.post('/v1/auth/login', async (c) => {
    const parsed = dto.loginBody.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      return problemResponse(c, 422, 'VALIDATION_FAILED', 'Provide { email, password }');
    }
    const ip = c.req.header('x-forwarded-for') ?? 'local';
    if (!(await loginLimiter(ip))) {
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts. Wait a minute');
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
        return problemResponse(c, 401, 'REFRESH_RACE', 'Token already rotated. Retry');
      case 'reuse-detected':
        clearAuthCookies(c);
        return problemResponse(
          c,
          401,
          'REUSE_DETECTED',
          'Refresh token reused. All sessions revoked for safety',
        );
      case 'invalid':
        clearAuthCookies(c);
        return problemResponse(c, 401, 'AUTH_REQUIRED', 'Session expired. Please sign in again');
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
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts. Wait and try again');
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
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts. Wait and try again');
    }
    const result = await confirmCoachSignup(db, otpDeps, parsed.data, {
      userAgent: c.req.header('user-agent'),
      ip: ip === 'local' ? undefined : ip,
    });
    if (!result.ok) {
      const map: Record<string, { status: 400 | 401 | 409; title: string }> = {
        OTP_INVALID: { status: 401, title: 'Invalid verification code' },
        OTP_EXPIRED: { status: 401, title: 'Verification code expired' },
        OTP_LOCKED: { status: 401, title: 'Too many incorrect codes. Request a new one' },
        OTP_NOT_FOUND: { status: 401, title: 'No pending verification. Start signup again' },
        EMAIL_TAKEN: { status: 409, title: 'An account with this email already exists' },
        PHONE_TAKEN: { status: 409, title: 'An account with this phone already exists' },
        INVALID_JOIN_CODE: { status: 400, title: 'Join code is invalid' },
        INVALID_PAYLOAD: { status: 400, title: 'Signup data is invalid. Start again' },
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
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts. Wait and try again');
    }
    const result = await resendCoachSignupOtp(db, signupDeps, parsed.data.email);
    if (!result.ok) {
      return problemResponse(
        c,
        401,
        'OTP_NOT_FOUND',
        'No pending verification. Start signup again',
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
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts. Wait and try again');
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
      return problemResponse(c, 429, 'RATE_LIMITED', 'Too many attempts. Wait and try again');
    }
    const result = await resetPasswordWithOtp(db, otpDeps, parsed.data);
    if (!result.ok) {
      const map: Record<string, { status: 401 | 404; title: string }> = {
        OTP_INVALID: { status: 401, title: 'Invalid verification code' },
        OTP_EXPIRED: { status: 401, title: 'Verification code expired' },
        OTP_LOCKED: { status: 401, title: 'Too many incorrect codes. Request a new one' },
        OTP_NOT_FOUND: { status: 401, title: 'No pending reset. Request a new code' },
        USER_NOT_FOUND: { status: 404, title: 'Account not found' },
      };
      const mapped = map[result.error.reason] ?? { status: 401 as const, title: 'Reset failed' };
      return problemResponse(c, mapped.status, result.error.reason, mapped.title);
    }
    return c.json({ ok: true });
  });
};
