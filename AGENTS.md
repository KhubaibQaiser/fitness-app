# AGENTS.md — GymOS coding-agent contract

Read this before any edit. This is the **execution** contract (what an agent may do, and how). Product alignment, phase sequencing, and design tokens live in [`CLAUDE.md`](CLAUDE.md) and **win on conflict**.

Architecture scorecard: [`docs/adr/0007-alignment-audit.md`](docs/adr/0007-alignment-audit.md). Nutrition safety: [`docs/adr/0001-hybrid-ai-nutrition.md`](docs/adr/0001-hybrid-ai-nutrition.md). Feature specs: [`docs/specs/`](docs/specs/).

`apps/web/AGENTS.md` is Next.js auto-generated boilerplate. Do not treat it as this repo's harness.

## Allowed

- One logical unit per PR. Name the alignment phase (from `CLAUDE.md`) or this AI-native track in the PR body.
- Domain logic in `packages/core` or `packages/modules` public barrels only.
- Nutrition numbers: Layers 1–2 (`packages/core` solver / physiology) only. Layer-3 (`packages/ai`) names meals and writes prep notes. Never emit kcal or macros from an LLM.
- Restyle presentational UI without changing fetch, routing, or business conditionals (alignment P1 rule).

## Denied

- New routes appended to `apps/api/src/app.ts`. Register them in `apps/api/src/routes/` (after that split lands, keep `app.ts` as a composition root under ~250 lines).
- Secrets, `.env`, tenant-name conditionals (`if (tenant === …)`), `Platform.OS` in `packages/app`, raw `fetch` in feature code, raw `<div>` in `packages/app`, `new Date()` in `packages/db` or `packages/modules` (Luxon only).
- Expanding scope into a later `CLAUDE.md` alignment phase. Flag it; do not sneak it in.
- Editing `apps/web/CLAUDE.md`.

## Required outputs

1. Link a spec under `docs/specs/` or an ADR in the PR body.
2. A test that would have failed before the change.
3. Scoped verification: `pnpm lint`, `pnpm typecheck`, and `pnpm test` for touched packages (full workspace when `packages/contracts` or shared types change).

## Context budget

Do not dump the whole monorepo. Start from the owning package `index.ts` plus its `*.test.ts`. Query the committed OpenAPI spec via the `gymos-openapi` MCP server (read-only; directory is `packages/contracts/openapi/`) instead of inventing routes.

## Merge gates that exist

CI (`.github/workflows/ci.yml`): gitleaks, format, lint (module boundaries), typecheck, tests, web build, prod audit, iOS Metro export. Maestro and Lighthouse are **not** CI-gated. Playwright smoke is added only when that workflow job exists.

## Human gate

`CODEOWNERS` requires review on `packages/core`, `packages/ai`, and `infra/`. Agents propose; they do not bypass that.
