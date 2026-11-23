# How agents deliver the revamp

Roles come from ADR-0018: a **parent** (the coordinator), one **builder** (Opus) per task and one **reviewer** (Sonnet) per task (R10). This file is the operating manual for all three. It adds to `AGENTS.md`; it never relaxes it.

## Parent

**Owns:**

- [`status.md`](status.md), the task order, file ownership ([README §6](README.md#6-file-ownership-and-change-lanes-conflict-prevention)), the kit and contracts lanes, rebases and merges.

**Each cycle:**

1. **Pick ready tasks.** A task is ready when:
   - its dependencies have merged;
   - its blocking rulings are answered;
   - for visual code, its mock is approved.

   At most four builders run at once, each with its reviewer (rulings O10). After the first wave of screens merges, report usage and rebase churn to the owner, who decides whether to raise it.

2. **Create one worktree and branch per task,** off the latest `main`. Worktrees sit outside the main checkout and outside `/tmp` (macOS clears `/private/tmp`), for example `<workspace>/fitness-app-wt/<task-id>`.

   Branch names use the owner's prefixes:

   | Task           | Branch prefix   |
   | -------------- | --------------- |
   | U              | `chore/`        |
   | B              | `fix/`          |
   | F, S           | `feature/`      |
   | Q0             | `chore/`        |
   | Kit lane       | `feature/kit-`  |
   | Contracts lane | `feature/data-` |
   | Docs           | `docs/`         |

3. **Brief the builder** with the template below. Fill in exact paths and merged SHAs; never "see above".
4. **Route mocks to the owner:**
   - One message per batch, with links.
   - Record approval or change requests in `status.md`, with the date.
   - A mock change that alters a spec also updates the spec, in a docs PR, the same day.
5. **When a builder reports "PR ready",** brief a fresh reviewer with the template below. The reviewer gets the diff and the spec, never the builder's reasoning.
6. **Pass the reviewer's findings back to the builder as a fix list.** Repeat with a fresh reviewer until it reports `BLOCKERS: 0` and no unaddressed non-blocking item. A finding is fixed unless the builder shows with evidence that it is wrong; the parent decides.
7. **Merge** when all of these hold:
   - The review is clean.
   - CI is green.
   - CODEOWNERS paths have the owner's approval.
   - Dependency order allows it.

   Use a merge commit. Then rebase every waiting branch that the merge affects and have its builder re-run verification. After a U task merges, close the Dependabot PRs it supersedes, with a comment naming it (rulings O3).

8. **Installs and questions.** A builder runs only the installs its task's "Install" line names. Under rulings O5 each one asks the owner to confirm and waits until they do, so batch installs and run them while the owner is at the app. Batch rulings questions for the owner. Never work around the agent guard.
9. **Update `status.md`** in a small `docs/revamp-status-<date>` PR, at most once a day. Only the parent edits it, so it never conflicts.

**Stop a builder when it:**

- edits a path it doesn't own (the only exceptions are the shared config files in README §6 and a one-time exception a spec grants by name, such as F2's direction-prop conversion);
- adds a dependency;
- changes a contract outside F7;
- reaches into another task's scope.

Revert the stray change, and route the need through the right lane.

## Builder brief (template)

```text
Task: <id> <title>. Spec: docs/revamp/<file>#<anchor> (read it in full first).
Read also: AGENTS.md, docs/revamp/README.md §6-§9, docs/revamp/agents.md (builder rules),
  docs/revamp/rulings.md, and for screens docs/revamp/screens/README.md.
Approved mock: <link> (visual tasks; build to it, list any difference).
Worktree: <path>. Branch: <branch>, off main at <sha>.
Merged dependencies you can rely on: <ids and SHAs>.
You own exactly: <paths>. You must not edit anything else. If you need to, stop and report.
Done conditions: <copied from the spec, plus README §8>.
Verification to run before reporting: <commands>, screenshots <list>, perf <harness command> if budgeted.
Local environment: local Docker Postgres (override DATABASE_URL to the local URL; the default .env points
  at a remote database), seeded demo data, test credentials from the project seed. Never print credentials.
Report back: PR number, what changed, the evidence for each done condition, anything you could not verify,
  questions for the owner. Do not merge.
```

**Builder rules:**

- **Test first:** a test that fails before the change.
- **Commits** are authored as the owner (`khubaibqaiser`, with the owner's commit email), with no `Co-Authored-By` trailer and no PR footer (owner's rule for this repo).
- **The PR body** follows `.github/pull_request_template.md`. Tick exactly one Track box: "UI revamp" for code, "Docs-only" for a docs PR (the PR-contract check from #101 counts them). Under "Spec / ADR" link `docs/adr/0018-ui-revamp-program.md` as well as the task's spec, because the check looks for a `docs/specs/` or `docs/adr/` path. Before merging, the parent pastes the last clean reviewer's `BLOCKERS: 0, NON-BLOCKING: <n>` line under "## Review". The body names:
  - the task id;
  - the spec section and the ADR;
  - the done conditions, each with its evidence;
  - the screenshots, linked by `raw.githubusercontent.com` URLs from the `screenshots` branch under `revamp/<task-id>/`.
- **Never** push to `main`, force-push, read `.env`, or run paid services (model API calls, cloud builds) without the owner's OK. CI is free here.
- **Native evidence:**
  - iOS from the simulator on this machine.
  - Android from the owner's other MacBook with the kit. When Android evidence is pending, say so in the PR and in the report; never claim it.

## Reviewer brief (template)

```text
Review PR <number> (branch <branch>) for task <id>. You did not write it.
Read: AGENTS.md, the spec section docs/revamp/<file>#<anchor>, docs/revamp/README.md §6-§9,
  docs/revamp/screens/README.md (screens), the approved mock <link> (visual tasks).
Inspect: git diff origin/main...<branch>. You may run tests, builds and the app to check claims; do not edit.
Report only:
  1. Bugs or regressions (file:line).
  2. Done conditions not met or not evidenced.
  3. New logic without a test that would have failed before.
  4. AGENTS.md Denied items, nutrition-safety rules, edits outside the owned paths.
  5. Security: secrets, auth, tenancy, injection.
  6. Accessibility, RTL and words-not-codes problems (screens README checklist).
  7. Performance budget not measured or not met.
  8. Mismatches with the approved mock that the PR does not list.
For each finding: severity (blocker or non-blocking), evidence, the fix you expect.
End with: BLOCKERS: <n>, NON-BLOCKING: <n>.
```

This extends the repo's own `reviewer` agent (`.claude/agents/reviewer.md`) with the revamp checks.

## Conflict protocol

- **Paths you don't own:** you need a shared component → kit lane; an API or contract change → contracts lane. Report it; don't edit.
- **Two branches conflict on rebase:** the parent rebases the later one in dependency order, and its builder re-verifies everything.
- **A spec is wrong or unclear:**
  - The builder stops and reports.
  - The parent decides if it's a mechanical fix.
  - Otherwise it asks the owner, with the options and a recommendation first.
  - The ruling lands in `rulings.md`, and the spec is fixed in a docs PR the same day.
- **A merged task broke something:** the parent opens a `fix/` PR owned by that task's paths, reviewed the same way, before any dependent task merges.

## When the track ends

Q5 folds the lasting rules into `AGENTS.md` and retires this folder's process sections (ADR-0018, "Revisit when"), except what L1 still needs (its spec section and status row) until L1 merges.
