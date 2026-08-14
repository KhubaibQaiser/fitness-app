# Email OTP (Resend)

GymOS sends 6-digit email OTPs for coach signup and password reset.

## Local development

Leave `RESEND_API_KEY` unset. The API logs codes to stdout:

```text
[gymos-mail] OTP to=coach@example.com purpose=signup_coach code=123456
```

`OTP_PEPPER` and `EMAIL_FROM` may also be omitted locally (OTP hashing uses a
fixed non-production pepper; no email is sent).

## Staging / production

Never send from `resend.dev`. That testing domain can only deliver to the
Resend account owner. Boot fails closed if you try — including locally, as
soon as `RESEND_API_KEY` is set.

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
is missing, or if `EMAIL_FROM` uses `resend.dev`.

`OTP_PEPPER` is a server-only secret mixed into `SHA-256(code + ":" + pepper)`
before the hash is stored. It is not emailed. Generate once and keep it stable
— rotating it invalidates outstanding codes.

## Limits

Resend free tier is suitable for the pilot (~3k emails/month, ~100/day). Upgrade when signup volume hits the daily cap. SMS OTP is intentionally out of scope for the pilot.
