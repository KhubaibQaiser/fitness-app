import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEmailSender, emailFromError, fromAddressUsesResendTestingDomain } from './mail';

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

describe('emailFromError', () => {
  it('requires a non-testing From when sending via Resend', () => {
    expect(emailFromError(undefined)).toMatch(/EMAIL_FROM is required/);
    expect(emailFromError('GymOS <onboarding@resend.dev>')).toMatch(/verified custom domain/);
    expect(emailFromError('GymOS <onboarding@khubaibqaiesr.com>')).toBeUndefined();
  });
});

describe('createEmailSender', () => {
  it('refuses resend.dev whenever an API key is set', () => {
    expect(() =>
      createEmailSender({
        apiKey: 're_test',
        from: 'GymOS <onboarding@resend.dev>',
        requireDelivery: false,
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
});
