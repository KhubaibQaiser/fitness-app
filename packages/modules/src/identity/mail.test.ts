import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createEmailSender,
  fromAddressUsesResendTestingDomain,
  productionEmailFromError,
} from './mail';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fromAddressUsesResendTestingDomain', () => {
  it('detects Resend testing-domain From addresses', () => {
    expect(fromAddressUsesResendTestingDomain('GymOS <onboarding@resend.dev>')).toBe(true);
    expect(fromAddressUsesResendTestingDomain('onboarding@resend.dev')).toBe(true);
    expect(fromAddressUsesResendTestingDomain('GymOS <hello@foo.resend.dev>')).toBe(true);
  });

  it('allows verified custom domains', () => {
    expect(fromAddressUsesResendTestingDomain('GymOS <onboarding@khubaibqaiesr.com>')).toBe(false);
    expect(fromAddressUsesResendTestingDomain('noreply@example.com')).toBe(false);
    expect(fromAddressUsesResendTestingDomain('not-an-email')).toBe(false);
  });
});

describe('productionEmailFromError', () => {
  it('requires a non-testing From in production', () => {
    expect(productionEmailFromError(undefined)).toMatch(/EMAIL_FROM is required/);
    expect(productionEmailFromError('GymOS <onboarding@resend.dev>')).toMatch(
      /verified custom domain/,
    );
    expect(productionEmailFromError('GymOS <onboarding@khubaibqaiesr.com>')).toBeUndefined();
  });
});

describe('createEmailSender', () => {
  it('refuses to construct a production sender on resend.dev', () => {
    expect(() =>
      createEmailSender({
        apiKey: 're_test',
        from: 'GymOS <onboarding@resend.dev>',
        requireDelivery: true,
      }),
    ).toThrow(/verified custom domain/);
  });

  it('sends from a verified domain', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const mail = createEmailSender({
      apiKey: 're_test',
      from: 'GymOS <onboarding@khubaibqaiesr.com>',
      requireDelivery: true,
    });
    await mail.sendOtp({ to: 'coach@example.com', code: '123456', purpose: 'signup_coach' });
    expect(fetchMock).toHaveBeenCalledOnce();
    const body = fetchMock.mock.calls[0]?.[1]?.body;
    expect(typeof body).toBe('string');
    expect(body).toContain('onboarding@khubaibqaiesr.com');
  });

  it('explains Resend 403 when still on resend.dev', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('only send to your own email', { status: 403 }),
    );
    const mail = createEmailSender({
      apiKey: 're_test',
      from: 'GymOS <onboarding@resend.dev>',
      requireDelivery: false,
    });
    await expect(
      mail.sendOtp({ to: 'other@example.com', code: '123456', purpose: 'signup_coach' }),
    ).rejects.toThrow(/testing domain resend\.dev/);
  });
});
