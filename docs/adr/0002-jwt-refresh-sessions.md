# ADR-0002: JWT access tokens + rotating refresh sessions

- Status: Accepted
- Date: 2026-08-11
- Deciders: GymOS platform

## Context

The pilot authenticated devices with a shared access-key gate cookie (`gymos_gate`)
and resolved a single seeded coach via `getPilotPrincipal`, which cached the
principal in a **process-global** variable. That is correct for one coach and
incorrect the moment a second concurrent user exists. Upcoming surfaces (coach
mobile, client app, gym/org-admin) all need real per-user identity.

## Decision

Replace the shared gate with:

1. **Email + password** login (`POST /v1/auth/login`) using Node `scrypt` password
   hashes stored on `users.password_hash`.
2. **Short-lived JWT access tokens** (~15 minutes, HS256 via `jose`) carrying
   `sub` (userId), `sid` (session id), `orgId`, `outletId`, and `roles`.
3. **Opaque refresh tokens** stored as SHA-256 hashes in a `sessions` table —
   one row per device/login, with rotation on every refresh and revocation for
   logout / logout-all.
4. **Transport**: web uses HttpOnly `gymos_refresh` + HttpOnly `gymos_access`
   cookies (same-origin via the Next rewrite); the API accepts the access JWT
   from `Authorization: Bearer` or, when absent, from `gymos_access`. Mobile
   stores both tokens in SecureStore and sends Bearer for access (refresh in
   the JSON body).
5. **Per-request principal resolution** via `resolvePrincipal(db, userId)` —
   no process-global cache.

The typed contracts client (`configureApiClient`) silent-refreshes once on 401
before treating the session as dead.

## Consequences

- Login is `POST /v1/auth/login`. There is no shared access-key cookie or `/gate/enter` route.
- Seed must set a password for `coach@pilot.local` (`PILOT_COACH_PASSWORD`).
- SSO / SAML / OIDC remain out of scope until a customer contract requires them.
- Access JWTs are still HS256-signed and short-lived (~15m) so horizontal API
  scale does not require a session store for _signature_ checks. They are **not**
  accepted after logout: every protected `/v1/*` request verifies the JWT then
  confirms `sid` is an active `sessions` row (`userId` matches `sub`,
  `revokedAt` is null, `expiresAt` is in the future). Revoking a family
  (current-device logout) or all user sessions (logout-all / password reset)
  therefore rejects residual access tokens on the next request.
- Refresh still hits the DB (rotation, reuse detection, revocation).
- A Redis (or similar) cache in front of the `sid` lookup is a later scale
  path — see [docs/roadmap.md](../roadmap.md) deferred items. Postgres remains
  the source of truth.
