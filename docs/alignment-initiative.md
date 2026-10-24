# GymOS alignment initiative: phases and original prompt

Moved verbatim from `CLAUDE.md` (the system-prompt blurb, Phase 0, Phases 1 to 4 and the scalability verdict). [`AGENTS.md`](../AGENTS.md) holds the locked answers, operating rules and definition of done, and **wins on conflict**; the design tokens are in [`design-system-reference.md`](design-system-reference.md).

---

# System Prompt — GymOS Alignment & Re-skin Initiative

> **Usage.** This is a companion to `3-gymos-system-prompt-v4.md`, not a replacement. v4 is the standing architecture and product spec for GymOS as a whole; this prompt governs one initiative — bringing the _existing_ `apps/` monorepo into alignment with v4 and the approved design system, in four phases, without a rewrite. Save as `CLAUDE.md` at repo root, or paste at session start.
>
> **Before this prompt does anything else, it resolves two open items.** Do not silently pick an answer:
>
> 1. Is `3-gymos-system-prompt-v4.md` (dated, versioned v4 in this repo) the authoritative architecture spec, or is there a separate `v1` that supersedes or predates it? If both exist, ask which wins on conflict.
> 2. This prompt assumes the current `apps/` implementation is **coach-only**, at some partial stage of completeness, and that the **client/member app does not exist yet**. That assumption comes from `2-gymos-prd.md` §5 ("P0 delivers coach... member follows in later phases") and from the user's own phase description (p3 = "coach app missing features," p4 = "start working on client app"). **Confirm this in Phase 0** rather than trusting it — if a partial client app already exists, P4 changes shape entirely.

The two items above were resolved for this repo on 2026-08-17: architecture v4 is the scoring reference; **this alignment prompt wins on conflict**; the current implementation is coach-only.

---

## Phase 0 — Discovery & Gap Audit (mandatory, blocking, zero code changes)

**Output of this phase is a single written document — `docs/adr/0007-alignment-audit.md` — reviewed by a human before Phase 1 starts.** No source file is edited during Phase 0 except this `CLAUDE.md` and the audit ADR.

### 0.1 Inventory the real repo

Answer each of these from the actual files, not from `3-gymos-system-prompt-v4.md`'s intended stack — the point is to find the delta:

- Package manager, monorepo tool (Turborepo? Nx? plain workspaces?), Node version.
- Every entry under `apps/` and `packages/` with a one-line purpose, inferred from its own `package.json` and entry point — not from the v4 target layout.
- **Styling system actually in use**: Tamagui? NativeWind? styled-components? plain React Native `StyleSheet`? CSS Modules? Tailwind via `className` on web with something else on native? Grep for the actual imports (`tamagui`, `nativewind`, `styled-components`) rather than assuming.
- **Is feature code already going through React Native primitives + `react-native-web`**, or is it raw DOM (`<div>`, `<table>`, `className`) on web with a separate, divergent native implementation (or no native implementation at all)?
- Does `apps/mobile` exist? Does it build? Is it wired into CI?
- Navigation: Solito? Next.js router only? React Navigation only, unconnected to web?
- API: Hono? Express? Next.js API routes? Framework and version.
- Schema/contract layer: is there a Zod → OpenAPI pipeline, or hand-written types, or nothing?
- Database: Postgres? ORM (Drizzle, Prisma, raw SQL)? Is there any tenancy dimension in the schema at all (a `tenant_id` column, separate databases, or no tenancy modeling yet)?
- Auth: what's actually wired up (library, session strategy, MFA presence)?
- State/data-fetching: TanStack Query? SWR? Redux? Component-local `useState` + `fetch`?
- Test coverage: what test types exist and run in CI today (grep `package.json` scripts and the CI workflow file), not what's aspirational in a README.
- Existing design tokens: is there _any_ existing token/theme file, and what does it currently encode (raw hex in components? A theme object? Tailwind config?).

### 0.2 Score against the v4 architecture invariants

For each row, mark **Met / Partially met / Not met / Not applicable yet at this stage**, with a one-line citation of the file(s) that prove it:

| Invariant (source: v4)                                                                                                                                                            | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Feature code uses RN primitives via `react-native-web`, not raw DOM (v4 §1, §9)                                                                                                   |        |
| `apps/mobile` exists and bundles in CI even though unshipped (v4 §14, §17.2)                                                                                                      |        |
| Modular monolith: domain modules are packages with an `index.ts` public API; no cross-module table access (v4 §5.1)                                                               |        |
| Lint-enforced module boundaries (`eslint-plugin-boundaries` / `dependency-cruiser`) actually wired into CI, not just discussed (v4 §5.1, §9)                                      |        |
| Database-per-tenant invariant, or at minimum a `tenant_id`/scoping dimension that could evolve into it without a rewrite (v4 §3.1)                                                |        |
| Contract layer: Zod-derived OpenAPI, not hand-written types (v4 §6)                                                                                                               |        |
| `packages/core` (or equivalent) is pure TS, zero React, zero platform imports, holding `nutrition`/`billing`/`rbac`/`money`/`units` (v4 §9.4, §12)                                |        |
| RBAC via a `can(actor, action, resource)` capability function fed by server-resolved scope, not client-side role checks as the source of truth (v4 §13)                           |        |
| Money stored as `{ amount: bigint minor units, currency }`, no floats, no default currency (v4 §12, §9 banned list)                                                               |        |
| No banned patterns present: `localStorage` in shared code, raw `fetch` in components, business logic inside `apps/*`, hand-written API mocks, any tenant-name conditional (v4 §9) |        |
| `packages/charts` and `packages/platform` façade pattern, or no divergent-capability problem yet because native doesn't exist (v4 §9)                                             |        |

### 0.3 Score against the design reference

The design reference is `gymos-prototype.jsx` / `gymos-components.jsx` (plain React DOM + Tailwind, built as a visual/behavioral spec — **not** meant to be copied as code) plus the token set in §"Design system reference" below.

- Does the current UI already encode _any_ of the target tokens (the blue/coral role-color pattern, the specific radius/spacing scale), even coincidentally?
- Is there an existing component that plays the same role as `StatPill`, `Card`, `Avatar`, `Badge`, `GradientRing`, nav chrome, etc.? List each match or gap by name.
- **Nothing in the current app should be expected to have "the Weave" motif, dual-ring adherence visualization, or the pastel canvas tint** — these are new to the design system and are net-new UI, not a re-skin of something equivalent. Flag them as such rather than hunting for a non-existent match.

### 0.4 Produce the audit doc

Structure: repo inventory (0.1) → invariant scorecard (0.2) → design-reference scorecard (0.3) → **a plain-language verdict on architectural scalability** ("is this monorepo in a state that supports P1–P4 and the full v4 roadmap without a rewrite, or does it need foundational rework first, and specifically where") → a proposed, repo-specific ordering for P1–P4 below (the phases as written are the _intent_; Phase 0's findings may mean some P2 item is actually a P1 blocker, or vice versa — say so).

**Stop here. Do not start Phase 1 until a human has read this document.**

---

## Phase 1 — Re-skin (design tokens + components, zero logic change)

### 1.1 The line between "style" and "logic" — define before touching anything

A change is **in scope for P1** if reverting it changes only pixels: color, spacing, radius, typography, which component renders a given piece of state. A change is **out of scope for P1** (defer to P2/P3) if it changes: what data is fetched, what a button does when pressed, validation rules, routing, any conditional that depends on business state rather than presentation state (e.g., "show a red border if `adherence < threshold`" is a logic-adjacent visual rule — port the _threshold logic_ unchanged, restyle only _how_ red is expressed).

If a component currently conflates the two (very common — a hand-rolled `<StatCard>` that both fetches and renders), **extract, don't rewrite**: separate the data/logic hook from the presentational component as a mechanical refactor, then restyle only the presentational half. The extraction itself is P1-safe _only if_ behavior is provably unchanged (snapshot or visual-regression test before/after).

### 1.2 Execution, gated on Phase 0 findings

- **If the repo already uses Tamagui or NativeWind**: extend the existing token file with the exact values above; do not introduce a second theming mechanism.
- **If the repo has no token system yet** (raw hex/spacing scattered in components): this is now also a P1 item — introducing the token layer _is_ the re-skin infrastructure. Follow v4 §9's Tamagui recommendation unless Phase 0 shows the team has already committed to NativeWind, in which case match that.
- **If the current web implementation is raw DOM/Tailwind** and native doesn't meaningfully exist yet: this is the moment to also address the RN-primitives requirement from v4 — but treat that as its own explicit sub-item, called out separately in the PR, not silently bundled into "re-skinning."
- Work component-by-component through the inventory above. For each: locate the current equivalent (or confirm net-new per §0.3), restyle/rebuild to match, add a visual snapshot test if one doesn't exist, PR against the checklist item.
- The **canvas tint** and **Weave motif** are net-new UI (see §0.3) — build them as new components under this phase, not as edits to something existing.

### 1.3 Definition of done for P1

Every component in the inventory renders pixel-equivalent (allowing for platform font-rendering differences) to the reference on both a wide viewport and a ≤375px viewport, in both light and dark, for both Coach and Client roles where applicable. No behavior, no data-fetching, no routing changed — provable via the before/after tests from §1.1. No tenant-name conditionals introduced. Module boundary lint still passes.

---

## Phase 2 — Directional alignment, small scale

**In scope:** anything that moves the repo closer to v4 without a rewrite and without touching more than one module's worth of code at a time. Examples of the _size_ of change this phase means: adding a missing consistency-tier annotation to an existing repository method: moving a stray cross-module table read behind the owning module's public function; adding the `apps/mobile` CI bundle gate if it's missing; wiring lint-enforced module boundaries if the packages already exist but aren't enforced; adding idempotency keys to a mutation that lacks one.

**Out of scope — defer to P3:** anything that requires new schema migrations touching core domain tables, anything that changes the tenancy model itself, any new FR from the PRD's coach feature list, anything spanning more than ~2–3 files across module boundaries.

**If Phase 0's audit shows a P2-sized item is actually load-bearing for P3** (e.g., P3's dietary-safety re-validation flow cannot exist without the `client_dietary_profile` versioning table, which doesn't exist yet) — flag it in the PR description as "P2, but blocking P3," don't silently reclassify it.

---

## Phase 3 — Coach app: full feature alignment

Work the PRD's coach requirements (`GymOS-PRD.md` §6.1) as a literal checklist. For each, Phase 0's audit already states current status — confirm it's still accurate (code moves between audits) before building:

- **FR-C1** Coach auth: invite-only, MFA, no public staff registration, 72h single-use invite, audit-logged creation, branch-scoped session.
- **FR-C2** Client roster: attention-sorted (not alphabetical), <1s load at 200 clients, virtualized, badge reasons visible, one-handed at 375px.
- **FR-C3** Client detail: progressive section loading, vitals charts on both viewport classes.
- **FR-C4** Vitals capture: time-series (never overwritten), <30s entry, unit-preference display over canonical-metric storage, prior value shown inline, offline queue.
- **FR-C5** AI meal plan generation — the 4-layer architecture from v4 §11 is mandatory as specified: physiology (never learns) → food DB + solver (never learns, hard-filters restrictions first) → language model (names/notes only, never emits a macro number, strict-JSON validated) → personalization (the only learning layer). Hard floors, under-16/pregnancy/medical-condition auto-block, full generation audit log.
- **FR-C6** Plan editing/publish: live recalculation <100ms, draft persistence, versioning, member notified on publish.
- **FR-C7** Dietary profile visibility: severe allergies visually undismissable, two independent restriction checks (Layer 2 filter + post-generation assertion), neither delegated to the model.
- **FR-C8** Coach notifications: server-sourced badge count, correct deep links, dietary-change notifications visually distinct and high-priority.
- **FR-C9** WhatsApp deep-link contact.

Each FR's acceptance criteria in the PRD are the literal test cases — write them as tests, not just UI.

---

## Phase 4 — Client/Member app buildout

**Precondition, checked at phase start, not assumed:** P1's token system and component library exist and are stable; Figma design tokens/components are available as the shared source (already partially delivered — file: `GymOS — Design System & Screens`, plus per-surface files once built out). If P1 was scoped narrower than "full token system" for time reasons, close that gap first — P4 building against an incomplete token base recreates the exact drift this whole initiative exists to fix.

Work the PRD's member requirements (`GymOS-PRD.md` §6.3) as the checklist — **FR-M1** self-serve signup (OTP → profile → health screening → goals → branch → plan → payment/pay-at-branch → pending) · **FR-M2** cached-first dashboard, no spinner on the primary surface · **FR-M3** meal plan view with swaps · **FR-M4** dietary profile management — safety-critical: every change re-validates the active plan within 5s, blocks (not just flags) unsafe content, raises high-priority coach notification, full audit trail · **FR-M5** meal photo logging, client-compressed · **FR-M6** progress photos/vitals/measurements · **FR-M7** notification centre.

Reuse the Coach app's underlying data/auth/module patterns from P0–P3 wherever the domain overlaps (auth session handling, notification centre plumbing, vitals charts) — this is a new _app_, not a new _architecture_.

---

## Architecture scalability verdict — how to answer "is this repo in the right state to scale"

This is not a separate task — it's the direct output of Phase 0 §0.2 plus one more question: **for each "Not met" row, what does closing that gap cost _later_ if deferred vs. _now_?** The `9.1`/`3.1` sections of v4 make this explicit for tenancy (database-per-tenant from tenant #1 specifically because retrofitting it is the expensive path) — apply the same test to every other invariant. A repo can reasonably defer polish; it cannot reasonably defer something whose retrofit cost grows with the number of tenants or the number of features built on top of it. Flag those specifically as "fix before P3/P4," everything else as "track, not urgent."

---
