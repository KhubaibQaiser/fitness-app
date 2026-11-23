# AGENTS.md — GymOS agent contract

Read this before any edit. It is the single set of rules for every coding agent in this repo. Claude Code is the primary agent and Cursor is kept as a backup ([ADR-0017](docs/adr/0017-claude-code-primary-and-agent-guardrails.md)). `CLAUDE.md` only imports this file, so both tools get the same rules.

Phase sequencing: [`docs/alignment-initiative.md`](docs/alignment-initiative.md). UI revamp track (tasks, gates, file ownership): [`docs/revamp/`](docs/revamp/README.md), per ADR-0018. Design tokens and component inventory (read before UI work): [`docs/design-system-reference.md`](docs/design-system-reference.md). Architecture scorecard: [`docs/adr/0007-alignment-audit.md`](docs/adr/0007-alignment-audit.md). Nutrition safety: [`docs/adr/0001-hybrid-ai-nutrition.md`](docs/adr/0001-hybrid-ai-nutrition.md). Feature specs: [`docs/specs/`](docs/specs/).

`apps/web/AGENTS.md` is a short pointer back to this file plus a note to read Next.js's bundled docs. Do not treat it as this repo's harness. `agentRules: false` in `apps/web/next.config.mjs` stops `next dev` from rewriting it.

## Product alignment (locked answers: do not re-ask, do not silently reverse)

- This contract is the final alignment prompt and **wins on conflict** with architecture v4.
- Three sources live only on the author's machine, not in this repo: the architecture reference v4 (`gym-app/3-gymos-system-prompt-v4.md`, subordinate to this file), the PRD (`Downloads/GymOS-PRD.md`) and the design prototypes (`gym-app/files 2/gymos-components.jsx`, `gymos-prototype.jsx`). An agent without them works from this file, `docs/` and the token tables in [`docs/design-system-reference.md`](docs/design-system-reference.md), and asks instead of guessing what they say.
- Current product is **coach-only**. No client/member app yet. Phase 4 is greenfield.
- Canonical design: the Floodlight tokens (ADR-0019) and the owner-approved mocks of the UI revamp track (ADR-0018). They supersede the design prototypes listed above. Until revamp task F1 replaces [`docs/design-system-reference.md`](docs/design-system-reference.md), its token tables describe the current build. Figma is out of scope until reopened.
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

- One logical unit per PR. Name the alignment phase (from `docs/alignment-initiative.md`), this AI-native track, or the UI revamp task id (from `docs/revamp/`) in the PR body.
- Domain logic in `packages/core` or `packages/modules` public barrels only.
- Nutrition numbers: Layers 1–2 (`packages/core` solver / physiology) only. Layer-3 (`packages/ai`) names meals and writes prep notes. Never emit kcal or macros from an LLM. Layer-3 payloads pass `assertDeidentified` (no PII) and fail closed to `fallbackNarrative`. Plans stay DRAFT until a coach publishes.
- Restyle presentational UI without changing fetch, routing, or business conditionals (alignment P1 rule). Inside the UI revamp track, a PR may change routing, navigation and presentation logic when its `docs/revamp/` task spec says so (ADR-0018); nutrition safety rules don't change.

## Denied

- New routes appended to `apps/api/src/app.ts`. Register them in `apps/api/src/routes/`. Keep `app.ts` as a composition root (middleware, token issuance, health).
- Secrets, `.env`, tenant-name conditionals (`if (tenant === …)`), `Platform.OS` in `packages/app`, raw `fetch` in feature code, raw `<div>` in `packages/app`, `new Date()` in `packages/db` or `packages/modules` (Luxon only).
- Expanding scope into a later alignment phase (`docs/alignment-initiative.md`). Flag it; do not sneak it in.
- Drive-by refactors, renames or reformatting outside the task, and new dependencies without a reason in the PR body.
- Weakening an ESLint rule (module boundaries, banned patterns) to land a change.
- Editing `apps/web/CLAUDE.md`.

## Required outputs

1. Link a spec under `docs/specs/` or an ADR in the PR body.
2. A test that would have failed before the change.
3. Scoped verification: `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, and `pnpm test` for touched packages (full workspace when `packages/contracts` or shared types change), plus `pnpm --filter @gymos/web build` when web, app, ui or platform change. Say in the PR body which checks you skipped and why.
4. If the change touches UI (layout, styling, screens, or rendered content), the PR body includes screenshots of the affected states. Link each image with a direct `https://raw.githubusercontent.com/<owner>/<repo>/<branch>/...` URL or a GitHub-uploaded image. A relative path such as `docs/pr/shot.png` does not render on the pull request page.

## Definition of done

Testing, CI, and definition-of-done discipline from v4 §§15–17 still apply throughout — this initiative does not get a lighter bar because it's "just a re-skin." In particular: no infinite spinners, loading/empty/error states implemented, authorization enforced server-side with a negative test, zero tenant-name conditionals, accessible (labelled controls, ≥44pt targets, contrast pass, RTL correct where applicable).

## Context budget

Do not dump the whole monorepo. Start from the owning package `index.ts` plus its `*.test.ts`. Read the committed OpenAPI spec (`packages/contracts/openapi/openapi.v1.json`) instead of inventing routes. In Cursor the `gymos-openapi` MCP server exposes the same folder.

## Merge gates that exist

CI (`.github/workflows/ci.yml`): gitleaks, format, lint (module boundaries), typecheck, OpenAPI drift, unit/integration tests, web build, Playwright login smoke, prod audit, iOS Metro export.

Not CI-gated: Maestro (local device), Lighthouse, authenticated roster e2e (needs a running API). Do not claim those as merge gates.

## Human gate

The repo has one maintainer, so GitHub requires no approval and `CODEOWNERS` only records who owns `packages/core`, `packages/ai` and `infra/`. The human gate is the merge: agents open the pull request, a fresh-context review runs, CI must be green, and the owner decides to merge. Never merge without the owner's word in the session. In Claude Code, `gh pr merge` always asks.

## Agent hooks and permissions

- `.claude/settings.json` denies reading or writing secret files with Claude's file tools (`.env*` except `.env.example`, keys, Terraform state and variables except the committed `ci.auto.tfvars`) and asks before `gh pr merge` and before edits to hooks, Claude settings, workflows and `CODEOWNERS`. Cursor's copy of the hooks is `.cursor/hooks.json`.
- The guard (`scripts/agent-hooks/guard.mjs`) runs before shell commands and file tools. It blocks reading secrets, force-push, pushing to `main` and adding dependencies. When it blocks something, ask the user to run it. Do not retry it in another form.
- The stop hook runs `format:check`, `lint`, `typecheck` and `test` before you finish. Fix what it reports.
- Run the `reviewer` subagent on your diff before you open a PR, and put its last line (`BLOCKERS: <n>, NON-BLOCKING: <n>`) in the PR body.
