# Phase 1: dependency upgrades

Serial. One PR each, in order, each rebased on the last. Measured breakage comes from the 2026-11-23 spikes ([`reference/upgrades.md`](reference/upgrades.md)); the spike commits sit unpushed in the `upgrade-wt` worktree and may be reused as a starting point.

**Global done conditions for every U task:**

- Full workspace `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm format:check` are green.
- `pnpm --filter @gymos/web build` and `npx expo export --platform ios` pass.
- `pnpm audit --prod --audit-level high` passes.
- CI green; no behaviour change visible to coaches, except where the task says so.
- The PR body lists the Dependabot PRs it supersedes (rulings O3).

---

## U1: Next.js 16.4.6

- **Why:** 16.4.3 has a known vulnerability, and `next build` stops with `SecurityFatalError` when an agent runs it.
- **Scope:** `apps/web/package.json` `next` to `^16.4.6`; lockfile.
- **Spike result:** typecheck, lint, tests and web build all pass; prod-audit moderate findings drop from 21 to 14.
- **Done when:** the global conditions hold; `next build` run by an agent completes without the security stop; `next dev` leaves `apps/web/AGENTS.md` untouched (PR #102 behaviour still holds).
- **Supersedes:** #98.

## U2: Patch and minor bumps

- **Scope:** the minor-and-patch group from #78, minus anything U3 moves, plus `hono` ≥ 4.13.16 and `@hono/node-server` ≥ 2.1.6 (#96, #97), plus any patch that clears a remaining prod-audit high.
- **Watch:** `react-test-renderer` must stay exactly on the React patch that `@testing-library/react-native` checks (it was pinned to `19.2.8` in #78 for that reason).
- **Done when:** the global conditions hold; the prod audit has no new findings; the API's integration tests pass.
- **Supersedes:** #78, #96, #97.

## U3: Expo SDK 58

- **Scope:**
  - `expo` 58, React Native 0.88.1, React and React DOM 19.3, Reanimated 4.7.1 (the SDK pin) with worklets 0.13.
  - react-native-screens 4.30, gesture-handler 3.3, Skia 2.14, expo-router 58, react-native-svg 15.16, react-native-webview 14.
  - jest 30 with jest-expo 58, `@testing-library/react-native` 14.
  - The `expo-sharing` and `expo-status-bar` plugins that `expo install --fix` adds.
- **Known fixes from the spike:**
  - `packages/ui/src/components/pace-slider.tsx:574`: the ref callback casts to `TrackNode`.
  - `packages/platform/src/download-blob.native.ts:14`: await `file.write`.
  - `react-test-renderer` pinned to `19.3.0`.
- **Remaining:** `packages/ui/src/components/keyboard-toolbar.ios.tsx:48` uses the deprecated `InputAccessoryView`. Replace it (React Native 0.88 keyboard toolbar or `react-native-keyboard-controller`, chosen in the PR with evidence) or add a documented, dated disable.
- **Test migration:** RNTL 14's `render` is async; await it in every mobile test (precedent: #79).
- **Native verification (required):**
  - An iOS debug build that runs on the simulator.
  - An Android release build and launch on the owner's other MacBook (`reference/android-kit/README.md` §2).
  - Smoke: sign in, open Clients, a client hub, a plan, a check-in.
  - Gesture-handler 3 and WebView 14 are major jumps: exercise the pace slider, sheets and the signature pad.
- **Done when:** the global conditions hold; native smoke passes on iOS and Android with screenshots in the PR; no peer warnings for packages in scope.
- **Supersedes:** #79, #81.
- **Note:** SDK 58 pins Reanimated 4.7.1, so shared-element transitions stay off (ADR-0020). Do not bump Reanimated past the SDK pin.

## U4: Tamagui 3.3 and a project icon set

- **Scope:**
  - `tamagui`, `@tamagui/config` (v6), `@tamagui/next-plugin`, `@tamagui/helpers-icon` and `@tamagui/react-native-svg` to 3.3.x.
  - Replace `@tamagui/lucide-icons-2`, which has no v3, with a per-file icon set (`@tamagui/cli icons add`, or per-icon Lucide imports) so Metro bundles only the icons used.
- **Steps:**
  1. `npx @tamagui/cli migrate --from v2`, then `npx @tamagui/codemod-flat-values --write` **per directory**. It crashes when pointed at `apps/web` as a whole.
  2. Fix the remaining errors (spike: 17 in 13 files):
     - `@tamagui/config/v4` is removed: move to config v6 with kebab-case theme keys.
     - `pressStyle`, `hoverStyle` and `unstyled` are no longer accepted as `styled()` options.
     - `focusStyle` typing in `form-field.tsx`.
     - Style-object typings in `date-field.tsx`, `pace-slider.tsx`, `client-hub-more-menu.tsx` and `auth-form-card.tsx`.
     - Named button sizes in `roster/index.tsx:92`.
  3. Runtime checks from the v3 notes:
     - Hover and press styles from helpers still apply.
     - `SafeAreaProvider` wraps `TamaguiProvider` on native.
     - Tabs activation mode.
     - `Sheet.Frame` becomes `Sheet.Container`.
     - Dialog, Popover, Select and Sheet behave as before.
- **Keep it a migration:** no visual redesign here. The current look stays (F1 replaces it).
- **Done when:**
  - The global conditions hold.
  - `tamagui check --strict` passes.
  - Screenshots of every route on web (1440, 390) and iOS match the pre-upgrade captures except for known, listed differences. Compare with the audit screenshots.
  - The iOS JS bundle drops by at least 1 MB (icons).
  - Native smoke on iOS and Android.
- **Supersedes:** #80.
- **Estimate (spike):** 2–4 days.

## Deferred (future work, not in this track)

- TypeScript 6 or 7 (7 is the native compiler), vitest 5, coverage-v8. Spike each separately later; they don't block the revamp.
