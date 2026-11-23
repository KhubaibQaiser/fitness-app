# AI-native workflow

How GymOS is built with coding agents: what is configured, what enforces it, and what has and has not been measured. Claude Code is the primary tool and Cursor is kept as a backup ([ADR-0017](adr/0017-claude-code-primary-and-agent-guardrails.md)). Everything here lives in the repo, except the repository settings, which live on GitHub and are listed at the end with commands to check them.

The idea behind all of it: **rules are advice; hooks and CI are enforcement.** Claude Code's docs say the same thing about instruction files: they are "context, not enforced configuration", and a `PreToolUse` hook is how you block an action whatever the model decides ([memory docs](https://code.claude.com/docs/en/memory)).

## 1. Instructions: short, one source, only what an agent cannot infer

- [`AGENTS.md`](../AGENTS.md) (77 lines) is the single contract for every agent: where code may live, the locked product answers and operating rules, what is denied, required outputs, the definition of done and the merge gates. Cursor reads it natively ([rules docs](https://cursor.com/docs/rules)). Claude Code reads `AGENTS.md` by itself only when a repo has no `CLAUDE.md`, so [`CLAUDE.md`](../CLAUDE.md) is five lines that import it with `@AGENTS.md`. No tool gets different rules.
- Two things moved out of the always-loaded files because they are reference data, not rules: the phase-by-phase plan ([`alignment-initiative.md`](alignment-initiative.md)) and the design token tables ([`design-system-reference.md`](design-system-reference.md)). `AGENTS.md` links to both. Imports do not reduce context cost, because imported files load with the file that imports them, so Claude Code now loads 5 + 77 = 82 lines at session start. Before this change it loaded 276 lines and never saw the execution contract.
- Four Cursor rules (56 lines in total, all always on, Cursor only): module boundaries, nutrition safety, verification, minimal diffs. The lines in them that `AGENTS.md` did not already say were copied into `AGENTS.md`, so Claude Code gets them too.
- The repo pins one skill (`archify`, locked by hash in `skills-lock.json`) for the architecture diagrams and one MCP server, for Cursor only (version pinned in `.cursor/mcp.json`), that gives read-only access to the OpenAPI folder. Claude Code reads the spec file directly. `.cursorignore` keeps `.env`, key files and Terraform state out of the editor's context.

Why short. Gloaguen et al. tested repository context files with coding agents and found that providing them "does not generally improve task success rates" and raises inference cost by over 20% on average. The files are useful for describing non-standard coding practices; repository overviews did not help ([arXiv:2602.11988](https://arxiv.org/abs/2602.11988)). Vercel's eval on Next.js 16 APIs that models do not know found that a compressed docs index in `AGENTS.md` passed 100% of the cases, against 53% for no docs and 79% for a skill that was told explicitly to run; the skill was never invoked in 56% of cases ([Vercel, 2026-01-27](https://vercel.com/blog/agents-md-outperforms-skills-in-our-agent-evals)). Both studies are on other codebases and tasks. They are the reason this repo lists what it does differently (boundaries, banned patterns, how to verify) and points to docs by path, instead of describing the architecture.

## 2. Hooks: enforcement while the agent works

Plain Node scripts with no dependencies, wired for both tools: [`.cursor/hooks.json`](../.cursor/hooks.json) and [`.claude/settings.json`](../.claude/settings.json). Cursor runs project hooks only in a trusted workspace ([hooks docs](https://cursor.com/docs/hooks)); Claude Code's hook reference is [here](https://code.claude.com/docs/en/hooks).

### Permission rules (Claude Code)

[`.claude/settings.json`](../.claude/settings.json) also holds permission rules, which Claude Code evaluates itself, so they hold even if a hook script breaks ([permissions docs](https://code.claude.com/docs/en/permissions)).

- **Denied:** reading `.env*` (except `.env.example`), key files (`*.pem`, `*.key`, `*.p12`, `*.pfx`), Terraform state and variables (except the committed `ci.auto.tfvars`), `backend.hcl` and `credentials*.json`. A `Read` deny also blocks `Edit` and `Write` on the same path. These rules cover Claude's file tools; shell commands are the guard's job.
- **Asks first:** `gh pr merge`, and edits to `scripts/agent-hooks/`, `.claude/`, `.github/workflows/` and `CODEOWNERS`, so an agent cannot quietly loosen its own guardrails or merge.

### Guard: [`scripts/agent-hooks/guard.mjs`](../scripts/agent-hooks/guard.mjs)

In Claude Code it runs before `Bash` and every file tool (`Read`, `Grep`, `Glob`, `Write`, `Edit`, `MultiEdit`, `NotebookEdit`), with `onFailure: block`, so a hook that cannot start or times out blocks the call instead of letting it through. In Cursor it runs before shell commands and file reads; Cursor has no hook before a file write.

It reads each command three ways: as written, with quote characters removed (so `"main"` reads as `main`), and with quoted strings blanked out (so a commit message or PR text that mentions a blocked command does not trip it). The script inside `sh -c '…'` or `bash -c "…"` is checked as a command of its own.

- **Denied:** reading `.env`, SSH or AWS keys, PEM files and Terraform state, in any letter case, also through quotes, `@file` arguments, a glob with a literal part (`.en*`, `*.pem`) or any glob inside `~/.ssh`, `~/.aws` or `~/.gnupg`; writing or searching those files with Claude Code's file tools; printing environment variables (`printenv`, a bare `env`, `export -p`, a bare `set`, `/proc/*/environ`, also behind `time`, `nohup`, `command`, `exec` or a path); force-push, also through a `+refspec`, combined flags (`-fu`) or git options in front (`git -C dir push -f`); any push to `main` or `master`, including a push with no branch name while `main` is checked out (in the hook's directory or the one `git -C` names) and `--all` or `--mirror`; skipping or turning off git hooks (`--no-verify` and its accepted prefixes, `commit -n`, `core.hooksPath` in any case, `LEFTHOOK=0`); piping a download or any text into a shell, or running one from a process substitution (`bash <(curl …)`); `chmod 777`; writing to a block device; recursive delete of root, home, or the current or parent directory; adding or upgrading a dependency by name (`npm`, `pnpm`, `yarn`, `bun`, `pip`, `uv`). Installs from a lockfile or a requirements file pass.
- **Asks first:** `git reset --hard`, `git clean`, discarding all changes, force-deleting a branch, `sudo`, publishing a package, CDK or Terraform apply and destroy, destructive AWS calls, `kubectl delete`, `docker` prune, deleting a repo or release, production deploys, SQL `DROP`, recursive delete outside build and cache folders, merging a pull request (also with `-R owner/repo`), other GitHub state changes (`gh api` with `POST`, `PUT`, `PATCH` or `DELETE`, a GraphQL `mergePullRequest`, secrets, variables, workflow runs, releases, aliases, repo settings), `eval`, upgrading everything to `--latest`, running a package from the registry (`npx`, `dlx`, `bunx`, `npm exec`; use `pnpm exec` for repo tools), recursive `grep` from the repo root and `rg -uu` or `--no-ignore` (both read ignored secret files), changing the hooks, agent settings, `lefthook.yml` or workflows through the shell, and a push with no branch name after a `cd` or branch change in the same command, or when the branch cannot be read.
- **Why dependency adds are denied.** Models invent package names. Spracklen et al. generated 576,000 code samples with 16 models and found at least 5.2% hallucinated packages for commercial models and 21.7% for open-source ones ([arXiv:2406.10279](https://arxiv.org/abs/2406.10279)). A human adds dependencies. `AGENT_GUARD_ALLOW_INSTALL=1` in the environment of the Cursor or Claude Code process turns the deny into a confirmation.
- **Limits.** It matches command text. It is a seatbelt, not a sandbox: a script that builds a file name or a branch name at run time (`cat .e${x}nv`, `HEAD:$(echo main)`), an interpreter (`python3 -c`, `node -e`), a bare `*` or `.*` glob, or deliberate quoting tricks can still get past it, and only a sandbox closes that. Changing the script through the shell asks first, and in Claude Code editing it asks too. Input that is not the shape a hook sends, or an internal error, makes it ask the human instead of deciding, so a failure is never silent and never a lockout; an unknown `--tool` exits 2. Cursor also imports Claude Code hooks, so in `--tool claude` mode the script stays silent for Cursor's own calls and nothing runs twice.

### Stop hook: [`scripts/agent-hooks/stop-check.mjs`](../scripts/agent-hooks/stop-check.mjs)

Runs when an agent says it is done. It runs `format:check`, `lint`, `typecheck` and `test` (change the list with `AGENT_STOP_STEPS`) and sends the failure output back to the agent. It skips docs-only changes, never rewrites files, and gives up after three failed attempts so a broken environment cannot trap an agent in a loop.

### Tests

38 `node:test` tests cover both scripts and the Claude Code settings (27 guard, 7 stop, 4 settings). The guard tests include every bypass found in the 2026-11-23 review and its re-review, a timing test for long globs, and commit messages that must not be blocked. `pnpm test:agent-hooks` runs them, and CI runs them in the "Agent hook tests" step.

## 3. Review: a second pair of eyes in a fresh context

[`reviewer`](../.cursor/agents/reviewer.md) subagents (one per tool, read-only) review the diff against `AGENTS.md` without the author's context. They report bugs, unmet requirements, missing tests, violations of the "Denied" list and the PR template's safety sections, and security issues, and end with `BLOCKERS: <n>, NON-BLOCKING: <n>`. Style opinions are out of scope. Subagent docs: [Cursor](https://cursor.com/docs/subagents), [Claude Code](https://code.claude.com/docs/en/sub-agents).

**The human gate is the merge.** The repo has one maintainer, so GitHub requires no approval and `CODEOWNERS` records ownership only. An agent opens the pull request, the reviewer runs, CI must be green, and the owner merges or tells the agent to merge in that session. Claude Code asks before every `gh pr merge`. Nothing on GitHub stops an admin from merging without reading, so this gate is only as good as the owner's review ([ADR-0017](adr/0017-claude-code-primary-and-agent-guardrails.md)).

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
| Claude Code instructions at session start | 276 lines (no contract) → 82 lines (with contract)                         | line counts                                                  |
| `AGENTS.md`, always loaded                | 41 → 77 lines (now includes the alignment rules)                           | line counts                                                  |
| Hook and settings tests                   | 38 pass, run in CI                                                         | `pnpm test:agent-hooks`                                      |
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

| Setting                                                                                                                                                                                                                                                                                                                                              | Check                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ruleset `MainBranch` on the default branch: pull request required, three required checks (`Format · lint · typecheck · test`, `Secret scan (gitleaks)`, `Mobile Metro bundle check`), conversation resolution, no deletion, no force-push, no required approvals (one maintainer, see ADR-0017). Repo admins can bypass through a pull request only. | `gh api repos/KhubaibQaiser/fitness-app/rulesets/21030958`                                                                                         |
| Secret scanning and push protection                                                                                                                                                                                                                                                                                                                  | `gh api repos/KhubaibQaiser/fitness-app --jq .security_and_analysis`                                                                               |
| Private vulnerability reporting                                                                                                                                                                                                                                                                                                                      | `gh api repos/KhubaibQaiser/fitness-app/private-vulnerability-reporting`                                                                           |
| Dependabot alerts and security updates                                                                                                                                                                                                                                                                                                               | `gh api -i repos/KhubaibQaiser/fitness-app/vulnerability-alerts` (204 means on), `gh api repos/KhubaibQaiser/fitness-app/automated-security-fixes` |

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
