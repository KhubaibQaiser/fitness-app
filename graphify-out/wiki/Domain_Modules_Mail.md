# Domain Modules Mail

> 45 nodes · cohesion 0.08

## Key Concepts

- **signup-coach.ts** (41 connections) — `packages/modules/src/identity/signup-coach.ts`
- **otp.ts** (23 connections) — `packages/modules/src/identity/otp.ts`
- **password-reset.ts** (19 connections) — `packages/modules/src/identity/password-reset.ts`
- **confirmCoachSignup()** (14 connections) — `packages/modules/src/identity/signup-coach.ts`
- **signup-coach.test.ts** (12 connections) — `packages/modules/src/identity/signup-coach.test.ts`
- **createChallenge()** (10 connections) — `packages/modules/src/identity/otp.ts`
- **verifyAndConsume()** (10 connections) — `packages/modules/src/identity/otp.ts`
- **startCoachSignup()** (10 connections) — `packages/modules/src/identity/signup-coach.ts`
- **identity/phone.ts** (6 connections) — `packages/modules/src/identity/phone.ts`
- **resendCoachSignupOtp()** (6 connections) — `packages/modules/src/identity/signup-coach.ts`
- **normalizePhone()** (5 connections) — `packages/modules/src/identity/phone.ts`
- **createMemoryEmailSender()** (4 connections) — `packages/modules/src/identity/mail.ts`
- **EmailSender** (4 connections) — `packages/modules/src/identity/mail.ts`
- **findActiveChallenge()** (4 connections) — `packages/modules/src/identity/otp.ts`
- **hashOtp()** (3 connections) — `packages/modules/src/identity/otp.ts`
- **OtpDeps** (3 connections) — `packages/modules/src/identity/otp.ts`
- **assertEmailPhoneFree()** (3 connections) — `packages/modules/src/identity/signup-coach.ts`
- **CoachSignupAbort** (3 connections) — `packages/modules/src/identity/signup-coach.ts`
- **normalizeEmail()** (3 connections) — `packages/modules/src/identity/signup-coach.ts`
- **resolveJoinOrg()** (3 connections) — `packages/modules/src/identity/signup-coach.ts`
- **codesEqual()** (2 connections) — `packages/modules/src/identity/otp.ts`
- **generateCode()** (2 connections) — `packages/modules/src/identity/otp.ts`
- **stripToDigits()** (2 connections) — `packages/modules/src/identity/phone.ts`
- **phone.test.ts** (2 connections) — `packages/modules/src/identity/phone.test.ts`
- **defaultCoachManifest()** (2 connections) — `packages/modules/src/identity/signup-coach.ts`
- *... and 20 more nodes in this community*

## Relationships

- [Domain Modules Auth Cookies](Domain_Modules_Auth_Cookies.md) (25 shared connections)
- [Domain Modules](Domain_Modules.md) (16 shared connections)
- [Domain Modules Client](Domain_Modules_Client.md) (8 shared connections)
- [Hono API Server](Hono_API_Server.md) (7 shared connections)
- [Domain Modules 92](Domain_Modules_92.md) (5 shared connections)
- [Domain Modules App](Domain_Modules_App.md) (4 shared connections)
- [Domain Modules Vitals Goals](Domain_Modules_Vitals_Goals.md) (1 shared connections)

## Source Files

- `packages/modules/src/identity/mail.ts`
- `packages/modules/src/identity/otp.ts`
- `packages/modules/src/identity/password-reset.ts`
- `packages/modules/src/identity/phone.test.ts`
- `packages/modules/src/identity/phone.ts`
- `packages/modules/src/identity/signup-coach.test.ts`
- `packages/modules/src/identity/signup-coach.ts`

## Audit Trail

- EXTRACTED: 142 (100%)
- INFERRED: 0 (0%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*