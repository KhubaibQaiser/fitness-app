import { describe, expect, it } from 'vitest';
import { loadEnv, resolveEmailFrom } from '../src/env';

const base = {
  DATABASE_URL: 'postgres://gymos:gymos@localhost:5432/gymos',
  JWT_ACCESS_SECRET: 'a-test-jwt-access-secret-that-is-long-enough',
  TENANT_MANIFEST_PATH: '../../infra/tenants/pilot.json',
};

const productionOk = {
  ...base,
  NODE_ENV: 'production' as const,
  OTP_PEPPER: 'test-otp-pepper-at-least-32-characters!!',
  RESEND_API_KEY: 're_test',
  EMAIL_FROM: 'GymOS <onboarding@khubaibqaiesr.com>',
};

describe('loadEnv production mail config', () => {
  it('accepts a verified custom From domain', () => {
    const env = loadEnv(productionOk);
    expect(env.EMAIL_FROM).toBe('GymOS <onboarding@khubaibqaiesr.com>');
    expect(resolveEmailFrom(env)).toBe('GymOS <onboarding@khubaibqaiesr.com>');
  });

  it('refuses resend.dev as EMAIL_FROM', () => {
    expect(() => loadEnv({ ...productionOk, EMAIL_FROM: 'GymOS <onboarding@resend.dev>' })).toThrow(
      /verified custom domain/,
    );
  });

  it('requires EMAIL_FROM', () => {
    expect(() => loadEnv({ ...productionOk, EMAIL_FROM: undefined })).toThrow(
      /EMAIL_FROM is required/,
    );
  });

  it('requires RESEND_API_KEY', () => {
    expect(() => loadEnv({ ...productionOk, RESEND_API_KEY: undefined })).toThrow(
      /RESEND_API_KEY is required/,
    );
  });
});

describe('resolveEmailFrom local default', () => {
  it('falls back to resend.dev outside production', () => {
    const env = loadEnv(base);
    expect(resolveEmailFrom(env)).toBe('GymOS <onboarding@resend.dev>');
  });
});
