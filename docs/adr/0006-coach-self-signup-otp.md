# ADR-0006: Coach self-signup + email OTP

- **Status**: Accepted
- **Date**: 2026-08-12

## Context

Phase 1 shipped per-user email/password auth (ADR-0002) against a seeded pilot
coach. Product direction now requires coaches to self-signup without an admin
in the loop, while preserving the invariant that every JWT carries a real
`orgId` / `outletId` (ADR-0003). We also need forgot-password without paid SMS.

## Decision

1. **"Coach is the tenant."** Coach signup either:
   - provisions a new `organizations` + `outlets` + `tenant_configs` row,
     `COACH` + `ORG_ADMIN` memberships, and a `coaches` row; or
   - joins an existing org via `organizations.join_code` (outlet-scoped `COACH`
     only — no auto `ORG_ADMIN`).
2. **Email OTP** (Resend free tier) proves email ownership for signup and
   password reset. Codes are hashed at rest (`SHA-256` + server pepper) in
   `otp_challenges`, single-use, 10-minute TTL, attempt-limited.
3. **Phone** is required and unique (E.164, partial unique index). SMS OTP is
   deferred; phone is collected for identity integrity only in the pilot.
4. Keep ADR-0002 transport: short-lived JWT access + rotating refresh sessions.
   Do not introduce Clerk / Supabase Auth / Auth0.

## Consequences

- Public routes: `POST /v1/auth/signup/coach/{start,confirm,resend}`,
  `POST /v1/auth/password/{forgot,reset}`.
- Forgot-password always returns 200 (anti-enumeration); signup returns explicit
  `EMAIL_TAKEN` / `PHONE_TAKEN`.
- Client signup-and-hire, public coach directory, messaging, and SMS OTP remain
  out of scope until later Phase 4 slices.
