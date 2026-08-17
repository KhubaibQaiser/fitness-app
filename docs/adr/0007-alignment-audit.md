# ADR-0007: Alignment Phase 0 gap audit

- **Status**: Proposed (blocks Phase 1 until human review)
- **Date**: 2026-08-17
- **Deciders**: GymOS platform
- **Supersedes**: none. Does not replace ADR-0001 through ADR-0006. Those remain current-state decisions.

## Context

This is the Phase 0 deliverable for the GymOS alignment initiative. Alignment prompt v5 is the target and wins on conflict with architecture v4. `docs/roadmap.md` and existing ADRs are current state, not the target.

Locked inputs used for this audit:

- Alignment prompt: repo-root `CLAUDE.md` (installed from alignment v5)
- Architecture reference: `3-gymos-system-prompt-v4.md`
- Canonical PRD: `GymOS-PRD.md` (Downloads, 2026-08-17)
- Canonical design: `gym-app/files 2/gymos-components.jsx` and `gymos-prototype.jsx`, plus token tables in `CLAUDE.md`
- Figma: out of scope
- Product surface: coach-only; no client/member app
- Path override: this file is `0007` because `docs/adr/0000-adr-template.md` already exists

No feature/source logic was changed for this phase. Verification in this session: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm --filter @gymos/web build`, and iOS `expo export` all passed. Local Node was `20.14.0`; the repo pins `>=22.11.0` / `.nvmrc` `v22.23.2`. CI uses `.nvmrc`.

---

## Decision

Record the inventory, scorecards, verdict, and proposed P1–P4 ordering below. Do not start Phase 1 until this document is accepted.

---

## 0.1 Repo inventory

### Tooling

| Item            | Actual                                                        |
| --------------- | ------------------------------------------------------------- |
| Package manager | pnpm `10.34.4` (`package.json` `packageManager`)              |
| Monorepo        | pnpm workspaces (`apps/*`, `packages/*`) + Turborepo `2.10.8` |
| Node            | `>=22.11.0`; `.nvmrc` is `v22.23.2`                           |
| TypeScript      | `5.9.3`, strict (`tsconfig.base.json`)                        |

### Apps

| Package                         | Purpose                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/web` (`@gymos/web`)       | Next.js 16 coach web/PWA shell. Renders `@gymos/app` screens. Entry: `apps/web/app/layout.tsx`.                                      |
| `apps/mobile` (`@gymos/mobile`) | Expo SDK 57 / Expo Router coach native shell around the same screens. Entry: `expo-router/entry`.                                    |
| `apps/api` (`@gymos/api`)       | Hono 4.13 modular-monolith HTTP API. JWT + refresh sessions. OpenAPI 3.1 from `@hono/zod-openapi`. Entry: `apps/api/src/index.ts`.   |
| `apps/worker` (`@gymos/worker`) | pg-boss background jobs (check-in roll, attention refresh, ranking, cleanup). Same domain packages as the API, different entrypoint. |

No `apps/web-client`, `apps/mobile-client`, or admin app exists.

### Packages

| Package              | Purpose                                                                 |
| -------------------- | ----------------------------------------------------------------------- |
| `packages/app`       | Shared coach feature screens, shell, React Query hooks.                 |
| `packages/ui`        | Tamagui design system and primitives.                                   |
| `packages/platform`  | Web/native façades: storage, theme, safe area, download, `isWeb`.       |
| `packages/contracts` | Committed OpenAPI + hand-maintained typed client.                       |
| `packages/core`      | Pure domain: nutrition, money, units, RBAC, intake types.               |
| `packages/db`        | Drizzle schema, migrations, seed.                                       |
| `packages/modules`   | Backend domains: identity, tenancy, coaching, nutrition, notifications. |
| `packages/ai`        | Layer-3 language only (local llama.cpp client + fallback).              |

Declared in ESLint but **absent from disk**: `packages/charts`, `packages/i18n`, `packages/app-client`, `packages/app-admin`.

### Styling

Tamagui `2.7.2` via `packages/ui/src/tamagui.config.ts`. Light/dark semantic tokens (green primary `#00A872` / `#00D68F`, muted blue accent). Inter + JetBrains Mono, not Roboto Mono. No NativeWind, no styled-components, no Tailwind `className` in feature code.

### RN primitives vs raw DOM

Feature UI is Tamagui / React Native primitives through `react-native-web` (`apps/web/next.config.mjs`). ESLint bans raw `<div>` and raw `fetch` in `packages/app`. Intentional DOM exceptions: Next `<html>`/`<body>`, Tamagui SSR style injection, web signature canvas (`packages/app/src/features/client-onboarding/signature-pad.tsx`); native pad hosts canvas HTML in a WebView.

### Mobile + CI

`apps/mobile` exists. CI job `mobile-bundle` runs `expo export --platform ios` (`.github/workflows/ci.yml`). This session’s iOS export succeeded (5002 modules, Hermes bundle). Android export is not in CI. EAS `projectId` and update URL are all-zero placeholders (`apps/mobile/app.json`). Preview/deploy workflows queue EAS with `--no-wait`, so a green GitHub job does not prove the native binary finished; production submit uses `--latest` and can pick an older build. One `MOBILE_IOS_FINGERPRINT` gates both platforms. Production mobile deploy is off unless `PILOT_MOBILE_DEPLOY_ENABLED=true`.

### Navigation

Solito links/router in shared features. Next App Router adapters on web. Expo Router stacks on mobile. Shared shell: desktop sidebar + mobile tab bar (`packages/app/src/features/shell/app-shell.tsx`). Routes today: `/`, `/clients`, `/tools`, `/notifications`, `/settings`.

### API / contracts / DB

Hono 4.13 + `@hono/zod-openapi` 1.5.1. Spec generated by `apps/api/src/cli/generate-openapi.ts` into `packages/contracts/openapi/openapi.v1.json`. Client types are still hand-written (`packages/contracts/src/types.ts`). No `oasdiff` / hey-api drift gate in CI.

Postgres 17 + Drizzle 0.45. Shared schema: `organizations` / `outlets` / `org_id` / `outlet_id` (ADR-0003). Not database-per-tenant. RLS enabled without FORCE.

### Auth / data fetching / tests

Custom identity module: scrypt passwords, 15-minute JWT, rotating refresh (ADR-0002), email OTP for **signup/reset** (ADR-0006). **No login MFA.** Public coach self-signup exists (`POST /v1/auth/signup/coach/*`).

TanStack Query v5 in `packages/app/src/api/index.ts`. Transport is `@gymos/contracts` client. No Redux/Zustand.

CI (`.github/workflows/ci.yml`): gitleaks, format, lint (including boundaries), typecheck, test, web build, prod audit, iOS Expo export. This session: 277 tests passed, 3 skipped. No Playwright in CI. Maestro exists under `apps/mobile/maestro/` but is not CI-gated. `packages/ui`, `packages/platform`, and `apps/web` have no test scripts. `packages/app` Vitest excludes feature TSX. `apps/worker` is configured `passWithNoTests`. Mobile Jest is four assertions (RNTL smoke + `paramId`). Web has an optimistic refresh-cookie gate in `apps/web/proxy.ts`; API auth remains authoritative.

### Existing tokens

`packages/ui/src/tamagui.config.ts` encodes a theme object (not scattered hex in every component). Light primary is hardcoded; dark primary/accent come from `infra/tenants/pilot.json`. Radius `soft` vs other values currently compile to the same numbers. Web `ThemeModeProvider` always resolves initial mode to `'dark'`.

---

## 0.2 Architecture invariant scorecard

Target = architecture v4. Alignment v5 wins on conflict. Citations are the proving files.

| Invariant                                                                                                                                                      | Status            | Evidence                                                                                                                                                                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Feature code uses RN primitives via `react-native-web`, not raw DOM (v4 §1, §9)                                                                                | **Met**           | `packages/app` + `packages/ui` Tamagui/RN; `apps/web/next.config.mjs` aliases RN→RN-web; ESLint bans `<div>` in `packages/app` (`eslint.config.mjs`).                                                                                                                                                                                                    |
| `apps/mobile` exists and bundles in CI even though unshipped (v4 §14, §17.2)                                                                                   | **Partially met** | App exists; CI iOS `expo export` exists and passed. Android not bundled in CI. EAS IDs are placeholders.                                                                                                                                                                                                                                                 |
| Modular monolith: domain modules with `index.ts` public API; no cross-module table access (v4 §5.1)                                                            | **Partially met** | Public barrels exist (`packages/modules/package.json` exports). Sibling modules and worker still import `schema as s` and read other domains’ tables (`packages/modules/src/coaching/clients.ts`, `packages/modules/src/nutrition/plans.ts`, `apps/worker/src/jobs/checkins-roll.ts`).                                                                   |
| Lint-enforced module boundaries wired into CI (v4 §5.1, §9)                                                                                                    | **Partially met** | `eslint-plugin-boundaries` default-deny is in `eslint.config.mjs` and `pnpm lint` runs in CI. `packages/modules` is one element that may depend on itself, so intra-modules table sharing is allowed. No `dependency-cruiser`.                                                                                                                           |
| Database-per-tenant, or a scoping dimension that could evolve without a rewrite (v4 §3.1)                                                                      | **Partially met** | Shared schema + `org_id`/`outlet_id` + list scoping (ADR-0003, `packages/db/src/schema/tenancy.ts`). Not DB-per-tenant. RLS ENABLE without FORCE (`packages/db/migrations/0007_tenant_columns_rls.sql`). Evolving to true DB-per-tenant is a migration project, not a connection-string change. v5’s “or at minimum a scoping dimension” is what exists. |
| Contract layer: Zod-derived OpenAPI, not hand-written types (v4 §6)                                                                                            | **Partially met** | Request Zod + `createRoute` generate OpenAPI 3.1. Auth routes are plain `app.post` and missing from the spec. Responses mostly untyped. Client types hand-maintained. No CI drift gate.                                                                                                                                                                  |
| `packages/core` pure TS, zero React/platform, holding nutrition/billing/rbac/money/units (v4 §9.4, §12)                                                        | **Partially met** | Pure (`packages/core/package.json`, no React imports). Has nutrition, rbac, money, units. **No `billing`.** 100% coverage gate in `packages/core/vitest.config.ts`.                                                                                                                                                                                      |
| RBAC via `can(actor, action, resource)` from server-resolved scope (v4 §13)                                                                                    | **Partially met** | `packages/core/src/rbac/can.ts` + API `authorize`. `scopeAllows('org')` returns only `scope.orgWide` and does not bind resource `orgId` (`packages/core/src/rbac/scope.ts`). Direct UUID reads can IDOR across orgs for org-wide actors. Isolation test covers roster list, not GET/PATCH by id (`apps/api/tests/tenant-isolation.test.ts`).             |
| Money as `{ amount: bigint minor units, currency }`, no floats, no default currency (v4 §12)                                                                   | **Partially met** | `packages/core/src/money/money.ts` is correct. No invoice/payment tables yet; only `users.currencyPref`.                                                                                                                                                                                                                                                 |
| No banned patterns: `localStorage` in shared code, raw `fetch` in components, business logic in `apps/*`, hand-written mocks, tenant-name conditionals (v4 §9) | **Partially met** | `localStorage` only in `packages/platform/src/storage.ts` façade. No raw `fetch` in `packages/app`. No tenant-name `if (tenant === …)`. API/worker still contain domain writes (idempotency, attention jobs). Contract tests hand-stub `fetch`.                                                                                                          |
| `packages/charts` and `packages/platform` façade, or N/A because native doesn’t exist (v4 §9)                                                                  | **Partially met** | `packages/platform` exists and is used. Native **does** exist, so charts façade is applicable. `packages/charts` is lint-reserved but missing; charts live in `packages/app/src/features/charts` and `@gymos/ui` `WeightChart`.                                                                                                                          |

### Defer-cost (Not met / weak Partial)

| Gap                                      | Cost if deferred                                                                                                          | Flag                                                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Org-unbound RBAC / IDOR on direct IDs    | Grows with every new route and every second tenant                                                                        | **Fix before P3/P4**                                                                                                                             |
| RLS not FORCE; table-owner bypass        | Same as above; defense-in-depth is currently theater                                                                      | **Fix before P3/P4** (can stay shared-schema; FORCE + non-owner role is the cheap hardening)                                                     |
| True database-per-tenant                 | Retrofit cost grows with tenant count and schema surface. Current `org_id` is an evolutionary seam, not the v4 invariant. | **Track, not urgent for single-pilot** if we accept ADR-0003 as current commercial constraint; **fix before selling tenant 2 as “own database”** |
| OpenAPI completeness + generated client  | Drift cost grows with every DTO; P4 client app will copy a stale hand-written client                                      | **Fix before P4**; cheap enough to do in P2                                                                                                      |
| `packages/charts` façade                 | Native already exists; every new chart in `packages/app` is another split implementation                                  | **Track, not urgent** if few charts remain; extract before P4 client charts proliferate                                                          |
| Cross-module table reads                 | Extraction later gets harder as joins accumulate                                                                          | **Track in P2** (move reads behind owning public functions, one module at a time)                                                                |
| Billing missing from core                | No money domain in DB yet                                                                                                 | **N/A until payments**                                                                                                                           |
| MFA / invite-only vs public coach signup | Product conflict (see FR-C1). Not an architecture retrofit tax.                                                           | **Human decision before P3**                                                                                                                     |

---

## 0.3 Design-reference scorecard

References: `gymos-components.jsx`, `gymos-prototype.jsx`, token tables in `CLAUDE.md`. Current system: Tamagui in `packages/ui`.

### Token overlap

Conceptual semantics overlap (`screenBg`≈canvas, `cardBg`≈surface, `color`/`textMuted`≈text, status families). **Brand does not overlap.** Current identity is green `#00A872` + muted blue `#2E7DA8`. Target is coach blue `#1D4ED8` / client coral `#E11D48` / amber milestone. No role dimension, no canvas tint, no weave/ring gradient stops, no milestone family distinct from `$warning`. Radius 8/16/999 exists coincidentally (`radiusControl`/`radiusCard`/pill). Spacing is Tamagui default, not the 2–64 scale as named tokens. Numeric face is JetBrains Mono, not Roboto Mono. Inter is already the UI face.

Do not treat green as “close enough.” P1 must extend `tamagui.config.ts` with the exact v5 values. Do not add a second theming system.

### Component match / gap

| Canonical                   | Current                                                                             | Verdict                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Avatar                      | `packages/ui/src/components/stat.tsx` `Avatar`                                      | Match (role: identity). Visual: brand fill, not zinc.                                                       |
| Badge                       | `packages/ui/src/components/badge.tsx`                                              | Match. Missing milestone tone; accent/primary currently share `$elevatedBg`.                                |
| Button                      | `PrimaryButton` / `AccentButton` / `GhostButton` / `OutlineButton` / `DangerButton` | Match. Shape is 48px / radius 8, not pill. Keep hit targets; restyle.                                       |
| IconButton                  | `packages/ui/src/components/icon-button.tsx`                                        | Match. Add active/accent wash.                                                                              |
| StatPill                    | `Stat` + `MetricHero` + home stat strip                                             | Partial. No compact bordered pill + count-up.                                                               |
| GoalTag                     | none (goal is plain text on roster)                                                 | Gap                                                                                                         |
| TextInput                   | `FormField`                                                                         | Match, stronger. Optional leading icon / xl radius only.                                                    |
| Toggle                      | `IosSwitch`                                                                         | Match. Keep controlled.                                                                                     |
| SegmentedControl            | `SegmentedControl` + `Tabs`                                                         | Match. Compact pill styling is P1.                                                                          |
| Skeleton                    | `Skeleton` / `SkeletonCircle` / `SkeletonRegion`                                    | Match. Pulse vs shimmer.                                                                                    |
| Card                        | `packages/ui/src/components/card.tsx`                                               | Match. Add default border + light elevation.                                                                |
| GradientRing                | `packages/app/src/features/charts/progress-ring.tsx`                                | Precursor (flat stroke). Enhance, do not hunt a missing component.                                          |
| DualRings                   | none                                                                                | **Net-new**                                                                                                 |
| WeaveLine                   | none                                                                                | **Net-new**                                                                                                 |
| NotificationRow             | notifications screen uses full `Card`                                               | Gap as a primitive                                                                                          |
| Modal                       | none reusable                                                                       | Gap (use Tamagui dialog, do not copy prototype DOM)                                                         |
| Sheet                       | Tamagui `Sheet` + one feature menu                                                  | Partial. Need shared GymOS shell.                                                                           |
| Toast                       | none                                                                                | Gap                                                                                                         |
| WebHeader                   | desktop **sidebar** in `app-shell.tsx`                                              | Different chrome. Sidebar is more complete than the prototype top header. Restyle; do not rip out IA in P1. |
| MobileHeader iOS/Android    | `PageHeader` + shared tab bar                                                       | Partial. No platform-split Android FAB.                                                                     |
| BottomNav / desktop sidebar | `MobileTabBar` + sidebar                                                            | Match as coach chrome. Client nav N/A until P4.                                                             |

**Net-new (do not search for equivalents):** WeaveLine, DualRings, pastel canvas tint, role-aware theme layer.

P1 implication from v5 §1.2: repo already uses Tamagui, so **extend** `packages/ui/src/tamagui.config.ts`. RN-primitives requirement is already met; do not bundle a “port to RN” sub-item into the re-skin.

---

## Coach FR snapshot (for later P3)

Confirm again before building. Canonical PRD is `GymOS-PRD.md` §6.1.

| FR                            | Current status                                                                                                                                                              |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-C1 Auth invite-only + MFA  | **Not met.** Public coach self-signup + email OTP (ADR-0006, `/v1/auth/signup/coach/*`). No login MFA. **Conflicts with ADR-0006.** Do not silently revert signup in P1/P2. |
| FR-C2 Roster attention-sorted | **Partially met.** Attention sort + badges + search/filters (`packages/app/src/features/roster`). Not FlashList-virtualized. 200-client / <1s not proven in CI.             |
| FR-C3 Client detail           | **Partially met.** Hub tabs Overview / Plan / History. No Journey or Messages tabs. Charts exist.                                                                           |
| FR-C4 Vitals time-series      | **Partially met.** Append-only vitals module exists. Offline mutation queue not found.                                                                                      |
| FR-C5 4-layer meal gen        | **Partially met.** ADR-0001 hybrid layers exist in `@gymos/core` + `@gymos/ai`. Layer 3 is local llama.cpp, not hosted-API-first (v4 §4/§11).                               |
| FR-C6 Edit/publish            | **Partially met.** Draft/publish/versioning exist. Live recalc budget and member-notify on publish need P3 confirmation (no member app yet).                                |
| FR-C7 Dietary visibility      | **Partially met.** `packages/modules/src/nutrition/dietary.ts` + UI. Severe-allergy undismissable treatment needs visual P1 + assertion tests in P3.                        |
| FR-C8 Notifications           | **Partially met.** Server list + unread query keys exist. Distinct dietary-change priority needs visual + test pass.                                                        |
| FR-C9 WhatsApp                | **Met** as a deep link: `packages/app/src/features/client-detail/client-hub-header.tsx` `https://wa.me/…`.                                                                  |

Member FR-M1–M7: **N/A** — no client app.

---

## 0.4 Scalability verdict

This monorepo **can support P1–P4 without a rewrite.** Feature code is already universal (Tamagui + Solito + `packages/app`). Backend is already a package-layered monolith with a real nutrition engine, sessions, and CI. The expensive mistake (web-only DOM, no mobile gate, no module packages) is not the current state.

What it is **not**: a finished v4 platform. Tenancy is shared-schema (ADR-0003), not database-per-tenant. RBAC is real but org-unbound on direct IDs. Contracts are half-generated. Charts are not behind a façade. Design tokens are a different brand.

`docs/roadmap.md` “Phase 0 complete, in production” is current-state narrative. Against v5/v4 it is a **pilot**, not aligned P0. Sequence in the roadmap (backend hardening → coach mobile → marketplace) is **not** the alignment P1–P4 sequence. This audit uses the alignment sequence.

### Proposed repo-specific P1–P4 ordering

Keep v5’s four-phase intent. Adjust contents:

**P1 — Re-skin (tokens + components, zero logic).** Not blocked by tenancy. Extend Tamagui tokens to exact v5 values; restyle existing primitives; add Weave / DualRings / canvas tint as new UI. Keep current sidebar + tab bar; restyle them. Do not introduce NativeWind. Do not change signup, RBAC, or routing. Snapshot/visual tests where missing.

**P2 — Directional alignment, small scale.** Do these **before** P3 feature work even though they are P2-sized, and mark PRs “P2, but blocking P3/P4”:

1. Bind `can()` / `authorize` to resource `orgId` (and pass `outletId` where outlet grants need it). Add GET/PATCH IDOR tests.
2. Non-owner API DB role + FORCE RLS + request GUCs.
3. OpenAPI: put auth routes on `app.openapi`; generate client; CI drift check.
4. Scope idempotency keys by principal (global unique key is a P2 bugfix, not a new FR).

Also in P2, not blocking: extract `packages/charts`; start moving cross-module table reads behind owning functions; Android `expo export` in CI if cheap.

**Do not** change the tenancy _model_ (shared schema → DB-per-tenant) in P2. That is a P3+ / commercial decision. Flag it; do not silently reclassify.

**P3 — Coach FR checklist.** After P1 tokens are stable and P2 isolation/contract holes are closed. Re-confirm each FR against code. **Stop and ask before FR-C1:** PRD wants invite-only + MFA; ADR-0006 shipped public coach self-signup. Alignment v5 says follow the PRD; this audit will not reverse ADR-0006 without an explicit go-ahead.

**P4 — Client/member app.** Greenfield `packages/app-client` + web/mobile shells, reusing auth/session/notifications/vitals/dietary modules. Precondition: P1 token system complete (Figma still out of scope unless reopened). Do not start P4 against the current green theme.

### Human decisions still required (not assumed)

1. Accept or amend this audit (blocks P1).
2. Before P3 FR-C1: keep ADR-0006 self-signup, or move to PRD invite-only + MFA.
3. Before selling a second tenant: stay on shared-schema (ADR-0003) or start DB-per-tenant.

---

## Consequences

- Phase 1 may start only after this ADR is accepted.
- Later PRs must name alignment phase + checklist item.
- ADR-0001 through ADR-0006 remain in force as _current_ decisions until a later ADR supersedes them.
