# ADR-0021: Upgrade dependencies before the revamp

- **Status**: Proposed
- **Date**: 2026-11-23

## Context

The revamp rewrites the token system, the component kit and the motion layer. Doing that on Tamagui 2 and then migrating to Tamagui 3 would redo the same files twice. The spikes in `docs/revamp/reference/upgrades.md`, measured 2026-11-23, found:

- **Next.js 16.4.3** has a known vulnerability; `next build` stops with `SecurityFatalError` when run by an agent.
- **Expo SDK 58** (React Native 0.88.1, React 19.3, Reanimated 4.7.1): one lint error left after quick fixes.
- **Tamagui 3.3.3**: 17 type errors in 13 files after the codemod, estimated 2–4 days.
- **Icons:** `@tamagui/lucide-icons-2` has no v3, and it is 1.23 MB of the 6.5 MB iOS bundle.

Open Dependabot PRs overlap this work: #78, #79, #80, #81, #96, #97 and #98.

## Decision

1. Upgrade first, in this order, one PR each (specs in `docs/revamp/10-upgrades.md`):
   - U1: Next.js 16.4.6.
   - U2: patch and minor bumps, including hono and `@hono/node-server`.
   - U3: Expo SDK 58 with React Native 0.88, React 19.3, Reanimated 4.7.1, gesture-handler 3, Skia 2.14, jest 30 and RNTL 14.
   - U4: Tamagui 3.3.3 with config v6 and a project icon set that replaces `@tamagui/lucide-icons-2`.
2. TypeScript 6/7 and vitest 5 are deferred to future work; they don't block the revamp.
3. Each upgrade PR lists the Dependabot PRs it supersedes. After it merges, the parent closes them with a comment naming the upgrade PR (`docs/revamp/rulings.md`, O3).
4. Native builds (iOS and Android) are verified for U3 and U4 before the foundation starts. The other MacBook runs Android, per the owner.

## Consequences

**Easier:** the revamp is written once against current APIs, the security warning is gone, and the native bundle shrinks once icons are per-file.

**Harder:** about a week of upgrade work before any visible change; U3 and U4 carry runtime risk (gesture-handler 3, WebView 14, Tamagui hover/press semantics), so they need visual QA.

**Revisit when:** a newer Expo SDK pins Reanimated 4.8 or later (add it to the stream).
