# Agent evals

Frozen tickets plus a **deterministic** scorer. No LLM-as-judge.

1. Pick a task in `agent-tasks/`.
2. Implement it on a worktree (or let an agent do it).
3. From repo root: `./scripts/eval-agent-diff.sh`
4. Record the run in `results/YYYY-MM-DD-<task-id>.md`

The scorer reuses merge gates already in the repo (lint, typecheck, tests) plus harness bans (raw `Date` in persistence packages, raw `fetch` in `packages/app`, `apps/api/src/app.ts` line budget).
