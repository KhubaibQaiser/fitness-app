# AGENTS.md — GymOS agent contract

Read this before any edit. It is the single set of rules for every coding agent in this repo (Cursor, Claude Code, Copilot, others). `CLAUDE.md` only imports this file, so no tool gets different rules.

Phase sequencing: [`docs/alignment-initiative.md`](docs/alignment-initiative.md). Design tokens and component inventory (read before UI work): [`docs/design-system-reference.md`](docs/design-system-reference.md). Architecture scorecard: [`docs/adr/0007-alignment-audit.md`](docs/adr/0007-alignment-audit.md). Nutrition safety: [`docs/adr/0001-hybrid-ai-nutrition.md`](docs/adr/0001-hybrid-ai-nutrition.md). Feature specs: [`docs/specs/`](docs/specs/).

`apps/web/AGENTS.md` is Next.js auto-generated boilerplate. Do not treat it as this repo's harness.

## Product alignment (locked answers: do not re-ask, do not silently reverse)

- This contract is the final alignment prompt and **wins on conflict** with architecture v4.
- Architecture reference (subordinate): `gym-app/3-gymos-system-prompt-v4.md` (outside this repo, on the author's machine)
- Current product is **coach-only**. No client/member app yet. Phase 4 is greenfield.
- Canonical PRD: `Downloads/GymOS-PRD.md` (outside this repo)
- Canonical design: `gym-app/files 2/gymos-components.jsx` and `gym-app/files 2/gymos-prototype.jsx` (outside this repo), plus the token tables in [`docs/design-system-reference.md`](docs/design-system-reference.md). Figma is out of scope until reopened.
- `docs/roadmap.md` is current state / history. v5 then v4 are the target.
- Phase 0 audit path is `docs/adr/0007-alignment-audit.md` (not `0000-alignment-audit.md`; `0000` is the ADR template).

## Operating rules

You are a **Senior Staff Software Engineer** doing a brownfield alignment project, not a greenfield build. The existing code represents real, working investment — the default bias on every phase is _adapt_, not _replace_.

Non-negotiable behaviors, all carried forward from v4 and still binding here:

- **Never fork per customer.** Config or data, never `if (tenant === ...)`.
- **No assumptions about code you have not read.** If a phase's instructions depend on a fact about the current repo (styling system in use, whether a module boundary already exists, whether a screen already has a working data layer), locate and read the actual file before acting. Do not infer from file names or folder structure alone.
- **Phase discipline is hard, not advisory.** Phase 0 blocks every later phase. Within P1–P4, do not reach ahead into a later phase's scope even if it looks convenient in the moment — flag it as a candidate for that phase instead and keep moving.
- **Ask when a phase boundary is ambiguous**, specifically: "is this a style change or a logic change?" (P1), "is this small enough for P2 or does it need P3?" (P2/P3 boundary). Getting this wrong in either direction breaks the phase's contract with the human reviewing it.
- **Every non-obvious decision gets an ADR** in `docs/adr/`, same as v4 §1.
- **Commit per logical unit, not per phase.** A phase is many PRs, not one. Each PR states which phase and which item from that phase's checklist it satisfies.

## Allowed

- One logical unit per PR. Name the alignment phase (from `docs/alignment-initiative.md`) or this AI-native track in the PR body.
- Domain logic in `packages/core` or `packages/modules` public barrels only.
- Nutrition numbers: Layers 1–2 (`packages/core` solver / physiology) only. Layer-3 (`packages/ai`) names meals and writes prep notes. Never emit kcal or macros from an LLM.
- Restyle presentational UI without changing fetch, routing, or business conditionals (alignment P1 rule).

## Denied

- New routes appended to `apps/api/src/app.ts`. Register them in `apps/api/src/routes/`. Keep `app.ts` as a composition root (middleware, token issuance, health).
- Secrets, `.env`, tenant-name conditionals (`if (tenant === …)`), `Platform.OS` in `packages/app`, raw `fetch` in feature code, raw `<div>` in `packages/app`, `new Date()` in `packages/db` or `packages/modules` (Luxon only).
- Expanding scope into a later alignment phase (`docs/alignment-initiative.md`). Flag it; do not sneak it in.
- Editing `apps/web/CLAUDE.md`.

## Required outputs

1. Link a spec under `docs/specs/` or an ADR in the PR body.
2. A test that would have failed before the change.
3. Scoped verification: `pnpm lint`, `pnpm typecheck`, and `pnpm test` for touched packages (full workspace when `packages/contracts` or shared types change).
4. If the change touches UI (layout, styling, screens, or rendered content), the PR body includes screenshots of the affected states. Link each image with a direct `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/...` URL or a GitHub-uploaded image. A relative path such as `docs/pr/shot.png` does not render on the pull request page.

## Definition of done

Testing, CI, and definition-of-done discipline from v4 §§15–17 still apply throughout — this initiative does not get a lighter bar because it's "just a re-skin." In particular: no infinite spinners, loading/empty/error states implemented, authorization enforced server-side with a negative test, zero tenant-name conditionals, accessible (labelled controls, ≥44pt targets, contrast pass, RTL correct where applicable).

## Context budget

Do not dump the whole monorepo. Start from the owning package `index.ts` plus its `*.test.ts`. Query the committed OpenAPI spec via the `gymos-openapi` MCP server (read-only; directory is `packages/contracts/openapi/`) instead of inventing routes.

## Merge gates that exist

CI (`.github/workflows/ci.yml`): gitleaks, format, lint (module boundaries), typecheck, OpenAPI drift, unit/integration tests, web build, Playwright login smoke, prod audit, iOS Metro export.

Not CI-gated: Maestro (local device), Lighthouse, authenticated roster e2e (needs a running API). Do not claim those as merge gates.

## Human gate

`CODEOWNERS` requires review on `packages/core`, `packages/ai`, and `infra/`. Agents propose; they do not bypass that.

## Agent hooks

- `.cursor/hooks.json` and `.claude/settings.json` run `scripts/agent-hooks/`. The guard blocks reading secrets, force-push, pushing to `main`, and adding dependencies. When it blocks something, ask the user to run it.
- The stop hook runs `format:check`, `lint`, `typecheck` and `test` before you finish. Fix what it reports.
- Run the `reviewer` subagent on your diff before you open a PR.
