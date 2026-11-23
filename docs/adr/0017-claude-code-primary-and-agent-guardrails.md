# ADR-0017: Claude Code as the primary agent, layered guardrails, and the merge as the human gate

- **Status**: Proposed
- **Date**: 2026-11-23

## Context

A review of the AI-native setup on 2026-11-23 found:

1. **Cursor was set up as the main tool**, with four always-on Cursor rules and a Cursor-only MCP server, while
   the owner now works in Claude Code. Claude Code saw the contract (`AGENTS.md`) but not the Cursor-only lines.
2. **The guard hook was the only layer in Claude Code.** `.claude/settings.json` had no permission rules, the
   hook ran on `Bash` and `Read` only, so `Write`, `Edit` and `Glob` were unguarded, and a crashed hook let the
   action through. Simple variants of blocked commands also passed (fixed in a separate pull request).
3. **The human gate was described but not enforced.** `AGENTS.md` said `CODEOWNERS` requires review on
   `packages/core`, `packages/ai` and `infra/`. The `MainBranch` ruleset requires 0 approvals and no code-owner
   review, and the owner is the only code owner, so GitHub could not enforce it. A solo maintainer cannot approve
   their own pull request.
4. **What actually happens:** an agent opens the pull request, a fresh-context reviewer runs, CI must be green,
   and the owner decides to merge.

A second reviewer account was considered. CODEOWNERS can name only users here (teams need an organisation), and
GitHub's terms allow one free personal account per person plus a machine account meant for automation, so a second
account the owner clicks "Approve" with is a poor fit. A second person was not available.

## Decision

1. **Claude Code is the primary agent; Cursor stays as a backup.** `AGENTS.md` stays the one contract and now
   carries the lines that were only in the Cursor rules (Layer-3 de-identification and fail-closed narration,
   DRAFT until publish, no drive-bys, no weakened lint rules, the full verification list). The Cursor rules, hooks,
   reviewer and MCP server stay as they are.
2. **Guardrails in layers, each covering the others' gaps:**
   - Claude Code permission rules in `.claude/settings.json`. Deny rules on secret files (`.env*` except
     `.env.example`, keys, Terraform state and variables, `backend.hcl`). Claude Code evaluates these itself, and a
     `Read` deny also blocks `Edit` and `Write` on the path. Ask rules on `gh pr merge` and on edits to the hooks,
     Claude settings, workflows and `CODEOWNERS`.
   - The guard hook on `Bash|Read|Grep|Glob|Write|Edit` with `onFailure: block`, so a hook that cannot start or
     times out blocks the call instead of letting it through.
   - The stop hook, then CI on every pull request.
3. **The merge is the human gate.** Agents never merge on their own. The owner merges, or tells the agent to merge
   in that session, after a clean review and green CI. `CODEOWNERS` stays as an ownership map. The docs say so
   plainly.
4. **Local agent transcripts stay out of git.** `.specstory/` and `CLAUDE.local.md` are ignored.

## Consequences

- Easier: one tool to configure and test. Secrets are protected by a layer that does not depend on a script. The
  docs match what GitHub enforces.
- Harder: Claude Code prompts before every merge and before edits to its own guardrails. Agents cannot read
  or edit real env files, key files or Terraform variables (including the committed `ci.auto.tfvars`), even when
  a task seems to need them. A human handles those.
- Cursor can drift from Claude Code because only Claude Code is exercised day to day.
- The human gate rests on the owner reading each pull request before merging. Nothing on GitHub stops an admin
  merge without review.

Revisit when:

- a second maintainer joins: turn on "require review from code owners" and one approval in `MainBranch`;
- Cursor is no longer needed: remove `.cursor/` in one pull request;
- the deny list blocks real work more than once a month: narrow it with `!` carve-outs in the same file.
