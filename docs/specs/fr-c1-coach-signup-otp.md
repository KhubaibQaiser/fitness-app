# FR-C1 — Coach self-signup OTP

## Invariant

Coach accounts are created only after email OTP confirm. Codes are hashed with a pepper, expire in 10 minutes, and lock after 5 failed attempts. Duplicate email or phone is a conflict, not a second user.

## Acceptance

- Given a new email and phone, When `POST /v1/auth/signup/coach/start`, Then 200 and an OTP email is sent (memory mailer in tests; Resend in production).
- Given a valid unused code, When `POST /v1/auth/signup/coach/confirm`, Then a user + coach profile + session are created and `/v1/me` works with the access token.
- Given a wrong code, When confirm, Then 401 `OTP_INVALID` and attempts increment.
- Given 5 wrong codes, When confirm again, Then 401 `OTP_LOCKED`.
- Given an expired challenge (TTL 10 minutes), When confirm, Then 401 `OTP_EXPIRED`.
- Given an email that already has an account, When start, Then 409 `EMAIL_TAKEN`.
- Given `NODE_ENV=production` without `OTP_PEPPER`, When the API boots, Then it refuses to start.

## Proven by

- `packages/modules/src/identity/otp.ts` (`OTP_TTL_MINUTES = 10`, `OTP_MAX_ATTEMPTS = 5`)
- `packages/modules/src/identity/signup-coach.ts`
- `apps/api/tests/auth-signup.test.ts`
- `apps/api/src/env.ts` (`resolveOtpPepper`)
