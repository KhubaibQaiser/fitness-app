import { type Db } from '@gymos/db';
import { type EmailSender } from '@gymos/modules/identity';
import { type TenantManifest } from '@gymos/modules/tenancy';
import { type Env } from './env';

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
