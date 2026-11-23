# ADR-0018: UI/UX revamp program and how agents deliver it

- **Status**: Accepted
- **Date**: 2026-11-23

## Context

The 2026-11-23 audit ([report](https://claude.ai/artifact/6kqJfdnEayt5dLkbgyKwUn), owner-only; evidence in `docs/revamp/reference/`) found that the coach app looks plain and, more importantly, contradicts itself: Home says everyone is on track while every client is overdue, the plan editor dead-ends at Publish, and the native app draws under the status bar with no native navigation. The owner chose a full revamp and treats the app as greenfield for UI purposes.

`AGENTS.md` describes a brownfield alignment project ("adapt, not replace"), locks `gym-app/files 2/gymos-components.jsx` and `gymos-prototype.jsx` as the canonical design, and limits restyles to "no change to fetch, routing or business conditionals". The revamp changes all three, so it needs its own track.

The owner also wants delivery by parallel agents, one per screen, each with a reviewer, coordinated by a parent agent that prevents conflicts.

## Decision

1. **A separate revamp track** governed by `docs/revamp/`. Inside that track:
   - The canonical design is the Floodlight token set (ADR-0019) and the approved per-screen mocks, not the `gym-app` prototype.
   - Revamp PRs may change routing, navigation structure and presentation logic when a `docs/revamp/` task spec calls for it. Nutrition safety rules (Layers 1–3, publish is always a human, allergen checks) are unchanged.
   - Every task names its spec section in the PR body, and updates the matching `docs/specs/` invariant when behaviour changes, as today.
2. **Order of work**:
   - Dependency upgrades (ADR-0021), and alongside them six small fixes for the truth and shell bugs that mislead coaches today, whatever the design (`docs/revamp/15-fixes.md`).
   - Then the shared foundation, mostly serial.
   - Then screens in parallel.
   - Then integration QA.

   Screens never start before the foundation tasks they depend on have merged.

3. **Roles**:
   - A **parent agent** owns sequencing, file ownership, the kit and contracts change lanes, rebases, merges and the status board (`docs/revamp/status.md`).
   - A **builder agent** (Opus) per task works in its own worktree and branch.
   - A **reviewer agent** (Sonnet) per task reviews against the spec and the done conditions without seeing the builder's reasoning.
4. **Mock gate**: every task that changes what a screen looks like delivers a mock first; the owner approves it before screen code starts.
5. **Merging**: the parent merges a revamp PR when its reviewer reports clean and CI is green, in dependency order, with merge commits. ADRs and mocks stay the owner's to approve. Nothing is pushed to `main` directly.

## Consequences

**Easier:** parallel delivery without agents editing the same files; one place (`docs/revamp/`) for every task's goal and done conditions; a clean audit trail per screen.

**Harder:** the foundation is a serial bottleneck; the parent must keep the ownership map current; mocks add a review step per screen.

**Revisit when:** the revamp completes (fold `docs/revamp/` rules back into `AGENTS.md` and retire the track), or if parallel work causes repeated conflicts in shared files (tighten the lanes).

## Alternatives considered

- **All screens in parallel from day one.** Rejected: every screen touches the theme, the kit, the motion package and the shell, so agents would collide on the same files.
- **Owner merges every PR.** Rejected by the owner for this track: 25–35 parallel PRs would go stale waiting.
- **No mocks, specs only.** Rejected: the owner's PR workflow requires an approved mockup before visual code.
