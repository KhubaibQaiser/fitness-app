# AI-native workflow

How GymOS is built with coding agents: what is configured, what enforces it, and what has and has not been measured. Cursor is the primary tool and Claude Code the second. Everything here lives in the repo, except the repository settings, which live on GitHub and are listed at the end with commands to check them.

The idea behind all of it: **rules are advice; hooks and CI are enforcement.** Claude Code's docs say the same thing about instruction files: they are "context, not enforced configuration", and a `PreToolUse` hook is how you block an action whatever the model decides ([memory docs](https://code.claude.com/docs/en/memory)).

## 1. Instructions: short, one source, only what an agent cannot infer

- [`AGENTS.md`](../AGENTS.md) (47 lines) is the execution contract: where code may live, what is denied, required outputs, which merge gates exist. Cursor reads it natively ([rules docs](https://cursor.com/docs/rules)). Claude Code reads `AGENTS.md` by itself only when a repo has no `CLAUDE.md`, so [`CLAUDE.md`](../CLAUDE.md) starts with an `@AGENTS.md` import and both tools get the same contract.
- `CLAUDE.md` (150 lines, down from 276) keeps the product alignment rules and design tokens. The phase-by-phase plan moved to [`alignment-initiative.md`](alignment-initiative.md), which an agent reads when it works on a phase. Imports do not reduce context cost, because imported files load with the file that imports them, so the real figure for Claude Code is 150 + 47 = 197 lines at session start. Before this change it loaded 276 lines and never saw the contract.
- Four Cursor rules (56 lines in total, all always on): module boundaries, nutrition safety, verification, minimal diffs.
- The repo pins one skill (`archify`, locked by hash in `skills-lock.json`) for the architecture diagrams and one MCP server (version pinned in `.cursor/mcp.json`) that gives read-only access to the OpenAPI folder. `.cursorignore` keeps `.env`, key files and Terraform state out of the editor's context.

Why short. Gloaguen et al. tested repository context files with coding agents and found that providing them "does not generally improve task success rates" and raises inference cost by over 20% on average. The files are useful for describing non-standard coding practices; repository overviews did not help ([arXiv:2602.11988](https://arxiv.org/abs/2602.11988)). Vercel's eval on Next.js 16 APIs that models do not know found that a compressed docs index in `AGENTS.md` passed 100% of the cases, against 53% for no docs and 79% for a skill that was told explicitly to run; the skill was never invoked in 56% of cases ([Vercel, 2026-01-27](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)). Both studies are on other codebases and tasks. They are the reason this repo lists what it does differently (boundaries, banned patterns, how to verify) and points to docs by path, instead of describing the architecture.

## 2. Hooks: enforcement while the agent works

Plain Node scripts with no dependencies, wired for both tools: [`.cursor/hooks.json`](../.cursor/hooks.json) and [`.claude/settings.json`](../.claude/settings.json). Cursor runs project hooks only in a trusted workspace ([hooks docs](https://cursor.com/docs/hooks)); Claude Code's hook reference is [here](https://code.claude.com/docs/en/hooks).

### Guard: [`scripts/agent-hooks/guard.mjs`](../scripts/agent-hooks/guard.mjs)

Runs before every shell command and file read.

- **Denied:** reading `.env`, SSH or AWS keys, PEM files and Terraform state; force-push; any push to `main` or `master`; piping a download into a shell; `chmod 777`; writing to a block device; recursive delete of root, home, or the current or parent directory; adding a dependency (`npm`, `pnpm`, `yarn`, `bun`, `pip`, `uv`).
- **Asks first:** `git reset --hard`, `git clean`, discarding all changes, force-deleting a branch, `sudo`, publishing a package, CDK or Terraform apply and destroy, destructive AWS calls, `kubectl delete`, `docker` prune, deleting a repo or release, production deploys, SQL `DROP`, recursive delete outside build and cache folders.
- **Why dependency adds are denied.** Models invent package names. Spracklen et al. generated 576,000 code samples with 16 models and found at least 5.2% hallucinated packages for commercial models and 21.7% for open-source ones ([arXiv:2406.10279](https://arxiv.org/abs/2406.10279)). A human runs installs. `AGENT_GUARD_ALLOW_INSTALL=1` in the environment of the Cursor or Claude Code process turns the deny into a confirmation.
- **Limits.** It matches command strings; it is a seatbelt, not a sandbox, and an agent with shell access can edit the script. It fails open on internal errors, so a bug cannot lock anyone out of their tools. Cursor also imports Claude Code hooks, so in `--tool claude` mode the script stays silent for Cursor's own calls and nothing runs twice.

### Stop hook: [`scripts/agent-hooks/stop-check.mjs`](../scripts/agent-hooks/stop-check.mjs)

Runs when an agent says it is done. It runs `format:check`, `lint`, `typecheck` and `test` (change the list with `AGENT_STOP_STEPS`) and sends the failure output back to the agent. It skips docs-only changes, never rewrites files, and gives up after three failed attempts so a broken environment cannot trap an agent in a loop.

### Tests

16 `node:test` tests cover both scripts (9 guard, 7 stop). `pnpm test:agent-hooks` runs them, and CI runs them in the "Agent hook tests" step.

## 3. Review: a second pair of eyes in a fresh context

[`reviewer`](../.cursor/agents/reviewer.md) subagents (one per tool, read-only) review the diff against `AGENTS.md` without the author's context. They report bugs, unmet requirements, missing tests, violations of the "Denied" list and the PR template's safety sections, and security issues, and end with `BLOCKERS: <n>, NON-BLOCKING: <n>`. Style opinions are out of scope. Subagent docs: [Cursor](https://cursor.com/docs/subagents), [Claude Code](https://code.claude.com/docs/en/sub-agents).

## 4. CI and supply chain

- **Merge gates** (`.github/workflows/ci.yml`): gitleaks over the full history, format, lint with module boundaries, typecheck, OpenAPI drift, tests, hook tests, web build, Playwright login smoke, production dependency audit, iOS Metro export.
- **Actions are pinned to commit SHAs**, with the release tag in a comment, and every job has a `timeout-minutes`. Dependabot updates both the actions and npm dependencies monthly ([`dependabot.yml`](../.github/dependabot.yml)). Packages bound to the Expo SDK are left out on purpose: they move together with the SDK.
- **The production audit is a gate, not a report.** `pnpm audit --prod --audit-level high` fails CI. Transitive fixes are `overrides` in `pnpm-workspace.yaml` with the advisory ids; an advisory with no usable patch goes in `auditConfig.ignoreCves` with a reason and a removal condition. The gate earned its place on 2026-10-24: new advisories had turned it red on every PR, and [#67](https://github.com/KhubaibQaiser/fitness-app/pull/67) took the tree from 43 findings (5 critical, 16 high) to 13 (0 critical; the 4 high ones are ignored with reasons).
- **Secrets:** gitleaks runs pre-commit, pre-push and in CI. GitHub secret scanning with push protection is on as a second net.
- **Nightly AI eval** ([`ai-eval.yml`](../.github/workflows/ai-eval.yml)): the offline eval always runs. The live eval needs a reachable llama.cpp endpoint, so it runs only when the `AI_BASE_URL` secret is set and shows as skipped otherwise. A green run never claims a live check that did not happen.

## 5. Evals for agent work

[`docs/evals/`](evals/) holds frozen task tickets (three so far) and a deterministic scorer, [`scripts/eval-agent-diff.sh`](../scripts/eval-agent-diff.sh). It reuses the merge gates and adds bans: `new Date()` in persistence packages, raw `fetch` in `packages/app`, and a line budget for `apps/api/src/app.ts`. No LLM judge. One run is recorded so far (2026-08-19).

## What is measured, and what is not

Measured:

| What                                      | Number                                                                     | How                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Claude Code instructions at session start | 276 lines (no contract) → 197 lines (with contract)                        | line counts                                                  |
| Hook tests                                | 16 pass, run in CI                                                         | `pnpm test:agent-hooks`                                      |
| Stop hook, full gates on this repo        | 26 seconds                                                                 | one run on the author's laptop, warm caches                  |
| Production audit                          | 43 findings (5 critical, 16 high) → 13 (0 critical, 4 high, all 4 ignored) | `pnpm audit --prod --audit-level high`, before and after #67 |
| Third-party action references             | 29, all pinned to a commit                                                 | `grep uses: .github/workflows`                               |

Not measured:

- Whether the instruction files, the hooks or the reviewer raise agent success rate, lower token cost or improve review quality in this repo. There is no A/B run. The research cited above is on other codebases.
- What the stop hook costs across many sessions. It runs the whole gate set each time an agent finishes code work.
- The reviewer's precision and recall.
- Not present: accessibility end-to-end tests and mutation testing. Maestro, Lighthouse and authenticated e2e are not CI gates.

## Repository settings (on GitHub, not in git)

The intended configuration, with a command to check each:

| Setting                                                                                                                                                                                                                                                                                        | Check                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset `MainBranch` on the default branch: pull request required, three required checks (`Format · lint · typecheck · test`, `Secret scan (gitleaks)`, `Mobile Metro bundle check`), conversation resolution, no deletion, no force-push. Repo admins can bypass through a pull request only. | `gh api repos/KhubaibQaiser/fitness-app/rulesets/21030958`                                                                                         |
| Secret scanning and push protection                                                                                                                                                                                                                                                            | `gh api repos/KhubaibQaiser/fitness-app --jq .security_and_analysis`                                                                               |
| Private vulnerability reporting                                                                                                                                                                                                                                                                | `gh api repos/KhubaibQaiser/fitness-app/private-vulnerability-reporting`                                                                           |
| Dependabot alerts and security updates                                                                                                                                                                                                                                                         | `gh api -i repos/KhubaibQaiser/fitness-app/vulnerability-alerts` (204 means on), `gh api repos/KhubaibQaiser/fitness-app/automated-security-fixes` |

## Use it in another repo

1. Copy `scripts/agent-hooks/`, `.cursor/hooks.json` and `.claude/settings.json`. Set `AGENT_STOP_STEPS` to your own scripts, and edit the deny list in `guard.mjs` to match your stack.
2. Keep `AGENTS.md` short: boundaries, banned patterns, how to verify. Start `CLAUDE.md` with `@AGENTS.md` if you need one.
3. Copy `reviewer.md` into `.cursor/agents/` and `.claude/agents/`, and change the checklist to your own "Denied" list.
4. Add `pnpm test:agent-hooks` (or the `node --test` equivalent) to CI so the hooks cannot rot.

## Sources

- Gloaguen et al., [Evaluating AGENTS.md](https://arxiv.org/abs/2602.11988), arXiv:2602.11988.
- Spracklen et al., [We Have a Package for You!](https://arxiv.org/abs/2406.10279), USENIX Security 2025.
- Vercel, [AGENTS.md outperforms skills in our agent evals](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals), 2026-01-27.
- [AGENTS.md format](https://agents.md). Claude Code: [memory](https://code.claude.com/docs/en/memory), [hooks](https://code.claude.com/docs/en/hooks), [subagents](https://code.claude.com/docs/en/sub-agents). Cursor: [rules](https://cursor.com/docs/rules), [hooks](https://cursor.com/docs/hooks), [subagents](https://cursor.com/docs/subagents).
- GitHub: [Dependabot options](https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference), [secure use of Actions](https://docs.github.com/en/actions/reference/security/secure-use).

All links checked on 2026-10-24.
