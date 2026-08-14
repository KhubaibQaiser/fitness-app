# Email OTP (Resend)

GymOS sends 6-digit email OTPs for coach signup and password reset.

## Local development

Leave `RESEND_API_KEY` unset. The API logs codes to stdout:

```text
[gymos-mail] OTP to=coach@example.com purpose=signup_coach code=123456
```

`OTP_PEPPER` and `EMAIL_FROM` may also be omitted locally (fixed non-production
fallbacks are used). The local From default is `GymOS <onboarding@resend.dev>`.

`resend.dev` is Resend's **testing domain**. If you set a `RESEND_API_KEY` while
still using that From address, Resend will only deliver to the account owner's
inbox. Any other recipient returns 403.

## Staging / production

Never send from `resend.dev` in production. Boot fails closed if you try.

1. Create a free [Resend](https://resend.com) account.
2. Verify a sending domain at [resend.com/domains](https://resend.com/domains)
   (SPF/DKIM; add DMARC after). The From mailbox does **not** need to exist —
   only the domain must be verified.
3. Set on the API host:

```bash
RESEND_API_KEY=re_...
EMAIL_FROM="GymOS <onboarding@khubaibqaiesr.com>"
OTP_PEPPER=<openssl rand -hex 32>
JWT_ACCESS_SECRET=<openssl rand -hex 32>
NODE_ENV=production
```

Production boot fails closed if `RESEND_API_KEY`, `OTP_PEPPER`, or `EMAIL_FROM`
is missing, or if `EMAIL_FROM` still uses `resend.dev`.

## Limits

Resend free tier is suitable for the pilot (~3k emails/month, ~100/day). Upgrade when signup volume hits the daily cap. SMS OTP is intentionally out of scope for the pilot.
