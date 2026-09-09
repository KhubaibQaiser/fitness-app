# Domain Modules Auth Cookies

> 36 nodes · cohesion 0.12

## Key Concepts

- **sessions.ts** (27 connections) — `packages/modules/src/identity/sessions.ts`
- **auth.ts** (21 connections) — `apps/api/src/routes/auth.ts`
- **login.ts** (19 connections) — `packages/modules/src/identity/login.ts`
- **password-reset.test.ts** (16 connections) — `packages/modules/src/identity/password-reset.test.ts`
- **registerAuthRoutes()** (14 connections) — `apps/api/src/routes/auth.ts`
- **hashPassword()** (12 connections) — `packages/modules/src/identity/password.ts`
- **createSession()** (12 connections) — `packages/modules/src/identity/sessions.ts`
- **sessions.test.ts** (10 connections) — `packages/modules/src/identity/sessions.test.ts`
- **password.ts** (9 connections) — `packages/modules/src/identity/password.ts`
- **rotateSessionByToken()** (8 connections) — `packages/modules/src/identity/sessions.ts`
- **resetPasswordWithOtp()** (7 connections) — `packages/modules/src/identity/password-reset.ts`
- **loginWithPassword()** (6 connections) — `packages/modules/src/identity/login.ts`
- **revokeSessionByRefreshToken()** (6 connections) — `packages/modules/src/identity/sessions.ts`
- **problemResponse()** (5 connections) — `apps/api/src/problems.ts`
- **requestPasswordReset()** (5 connections) — `packages/modules/src/identity/password-reset.ts`
- **verifyPassword()** (5 connections) — `packages/modules/src/identity/password.ts`
- **isSessionActive()** (5 connections) — `packages/modules/src/identity/sessions.ts`
- **setUserPassword()** (4 connections) — `packages/modules/src/identity/login.ts`
- **hashRefreshToken()** (4 connections) — `packages/modules/src/identity/sessions.ts`
- **readRefreshToken()** (3 connections) — `apps/api/src/auth-cookies.ts`
- **scrypt()** (3 connections) — `packages/modules/src/identity/password.ts`
- **password.test.ts** (3 connections) — `packages/modules/src/identity/password.test.ts`
- **CreatedSession** (3 connections) — `packages/modules/src/identity/sessions.ts`
- **SessionMeta** (3 connections) — `packages/modules/src/identity/sessions.ts`
- **newRawRefreshToken()** (2 connections) — `packages/modules/src/identity/sessions.ts`
- *... and 11 more nodes in this community*

## Relationships

- [Domain Modules Mail](Domain_Modules_Mail.md) (25 shared connections)
- [Hono API Server](Hono_API_Server.md) (22 shared connections)
- [Domain Modules](Domain_Modules.md) (14 shared connections)
- [Domain Modules Client](Domain_Modules_Client.md) (9 shared connections)
- [Domain Modules App](Domain_Modules_App.md) (3 shared connections)
- [Database Persistence Enums](Database_Persistence_Enums.md) (2 shared connections)
- [Domain Modules Http](Domain_Modules_Http.md) (1 shared connections)
- [Hono API Server Schemas](Hono_API_Server_Schemas.md) (1 shared connections)
- [Domain Modules 92](Domain_Modules_92.md) (1 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (1 shared connections)

## Source Files

- `apps/api/src/auth-cookies.ts`
- `apps/api/src/problems.ts`
- `apps/api/src/routes/auth.ts`
- `packages/modules/src/identity/login.ts`
- `packages/modules/src/identity/password-reset.test.ts`
- `packages/modules/src/identity/password-reset.ts`
- `packages/modules/src/identity/password.test.ts`
- `packages/modules/src/identity/password.ts`
- `packages/modules/src/identity/sessions.test.ts`
- `packages/modules/src/identity/sessions.ts`

## Audit Trail

- EXTRACTED: 152 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*