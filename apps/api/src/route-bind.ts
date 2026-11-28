import { type AiConfig } from '@gymos/ai';
import { type Db } from '@gymos/db';
import { type Principal } from '@gymos/modules/identity';
import { type TenantManifest } from '@gymos/modules/tenancy';
import { type AppDeps } from './app-deps';
import { type ClientIp } from './client-ip';
import { type AppContext } from './http';
import { type AccountLimiter } from './rate-limit';
import { type asCoach, type authorize, type requireCoachId } from './rbac-http';

export type RateLimiter = (key: string) => Promise<boolean>;

export type OtpPepperDeps = { pepper: string };

export type RouteBind = {
  readonly db: Db;
  readonly env: AppDeps['env'];
  readonly bootstrapManifest: TenantManifest;
  readonly resolveTenantManifest: (principal: Principal) => Promise<TenantManifest>;
  readonly resolveAiConfig: (tenant: TenantManifest) => AiConfig;
  readonly authorize: typeof authorize;
  readonly asCoach: typeof asCoach;
  readonly requireCoachId: typeof requireCoachId;
  readonly respondWithTokens: (
    c: AppContext,
    userId: string,
    session: { sessionId: string; refreshToken: string; expiresAt: string },
  ) => Promise<Response>;
  readonly clientIp: ClientIp;
  readonly loginLimiter: RateLimiter;
  readonly loginAccountLimiter: AccountLimiter;
  readonly unattributedLimiter: RateLimiter;
  readonly signupIpLimiter: RateLimiter;
  readonly signupEmailLimiter: RateLimiter;
  readonly forgotIpLimiter: RateLimiter;
  readonly forgotEmailLimiter: RateLimiter;
  readonly confirmIpLimiter: RateLimiter;
  readonly otpDeps: OtpPepperDeps;
  readonly signupDeps: OtpPepperDeps & { mail: NonNullable<AppDeps['mail']> };
  readonly resetDeps: OtpPepperDeps & { mail: NonNullable<AppDeps['mail']> };
};
