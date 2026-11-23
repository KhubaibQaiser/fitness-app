# GymOS upgrade spikes (measured 2026-11-23)

Spikes ran in a local throwaway worktree off origin/main c82192c, in this order: Next 16.4.6, Expo SDK 58, Tamagui 3.3.3 (WIP). The spike commits and logs are not in this repo.

## Baseline (origin/main, `--force`, no turbo cache)

- typecheck 12/12 ok, lint ok, test ok (api 53, app 62, core 164, ui 31, modules 57, db 14, ai 34, contracts 8, web 4, platform 3).
- `pnpm --filter @gymos/web build`: **fails**. Compile and TypeScript pass, then Next 16.4.3 throws `SecurityFatalError: Your version of Next.js is affected by a known security vulnerability` (`base-build.log`). So the Next bump is a precondition for any build.
- `pnpm audit --prod`: 28 vulns (3 low, 21 moderate, 4 high, 4 ignored); 7 of the moderate ones are `next`.
- Pre-existing peer warning: `packages/app` resolves reanimated 4.5.1 against worktets 0.11.3 (wants 0.10.x).

## Summary table

| Package                      | Current     | Latest                                            | Breaking?   | Measured breakage                                                            | Effort (estimate)          | Value                                                              | Recommendation                                           |
| ---------------------------- | ----------- | ------------------------------------------------- | ----------- | ---------------------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| next                         | 16.4.3      | 16.4.6                                            | no (patch)  | 0 errors; build passes                                                       | minutes                    | removes build-blocking security error; audit moderate 21 → 14      | do now                                                   |
| Expo SDK / RN                | 57 / 0.86.2 | 58 / 0.88.1                                       | yes         | 1 type error (fixed), 3 lint errors (2 fixed, 1 left), 1 test fix; export ok | 0.5-1 day (estimate)       | RN 0.88, reanimated 4.7.1, skia 2.14, gesture-handler 3, router 58 | do second                                                |
| react / react-dom            | 19.2.8      | 19.3.1                                            | minor       | none (done inside SDK spike)                                                 | 0                          | tracks RN 0.88                                                     | with SDK                                                 |
| Tamagui                      | 2.7.2       | 3.3.3                                             | yes (major) | 17 unique type errors in 13 files after codemod (80 in 32 files before)      | 2-4 days (estimate)        | v3 style values, tiered precedence, perf                           | do third, after SDK                                      |
| @tamagui/lucide-icons-2      | 2.7.2       | 2.7.7 (v3 guide says removed)                     | yes         | not measured; still on 2.7 line                                              | 0.5 day (estimate)         | n/a                                                                | replace via `@tamagui/cli icons add` in the Tamagui step |
| @shopify/react-native-skia   | 2.6.2       | 2.14.0                                            | minor       | included in SDK spike; export ok                                             | 0                          | fixes, perf                                                        | with SDK                                                 |
| react-native-gesture-handler | 2.32        | 3.5.0 (SDK pins ~3.3.0)                           | yes (major) | typecheck/test/export pass; runtime not exercised                            | unknown                    | New Architecture-first API                                         | with SDK                                                 |
| typescript                   | 5.9.3       | 7.0.2 (6.0.3 is what `expo install --fix` picked) | 6 and 7 yes | **not measured** (disk)                                                      | unknown                    | 7 is the native compiler (speed)                                   | separate spike later                                     |
| vitest / coverage-v8         | 3.2.7       | 5.1.1 (4.1.12)                                    | 2 majors    | **not measured**                                                             | unknown (estimate 0.5 day) | newer engine                                                       | optional                                                 |
| eslint                       | 10.8.0      | 10.15.0                                           | minor       | not measured                                                                 | minutes                    | fixes                                                              | optional                                                 |
| solito                       | 5.0.0       | 5.0.0                                             | no          | none                                                                         | 0                          | current                                                            | skip                                                     |
| react-native-web             | 0.21.2      | 0.21.4                                            | patch       | not measured                                                                 | minutes                    | fixes                                                              | with SDK or Tamagui                                      |

## Spike 3: Next.js 16.4.3 → 16.4.6

- Command: edit `apps/web/package.json` `next ^16.4.6`, `pnpm install --no-frozen-lockfile --ignore-scripts`.
- Results: typecheck 12/12, lint 0, test all pass, `pnpm --filter @gymos/web build` **passes** (Next 16.4.6 Turbopack, compiled in 2.4 s).
- Audit prod: `next` advisories gone; moderate 21 → 14, high 4 unchanged (`s3-audit.json`). Remaining are uuid, esbuild, decode-uri-component, postcss-selector-parser, glob, minimatch, node-forge, @hono/node-server, hono (hono patched at >=4.13.16 and node-forge at >=1.4.3 would clear some; not tried).
- Release dates: 16.4.4 2026-11-02, 16.4.5 2026-11-03, 16.4.6 2026-11-09 (npm). Release notes not read.
- Risk: low.

## Spike 1: Expo SDK 57 → 58

- Commands: `npx expo install expo@^58.0.0`, `npx expo install --fix` (in apps/mobile), then a script to align shared deps across `apps/web`, `packages/app|platform|ui` (a local script, not in the repo), then pnpm install.
- Versions: expo 57.0.2 → 58.0.26; react-native 0.86.2 → 0.88.1; react 19.2.8 → 19.3.x; **reanimated 4.5.1 → 4.7.1** (SDK 58 pins 4.7.1, not 4.8.0, so shared-element-by-default is NOT included; I did not test bumping past the SDK pin); worklets 0.10.1 → 0.13.0; screens 4.26 → 4.30.1; gesture-handler 2.32 → 3.3.0; skia 2.6.2 → 2.14.0; expo-router 57.0.12 → 58.0.32; svg 15.15.4 → 15.16.0; webview 13.16.1 → 14.0.1; jest 29 → 30, jest-expo 58. `expo install --fix` also added `expo-sharing` and `expo-status-bar` to app.json plugins. It also moved mobile TypeScript to ^6.0.3; I reverted that to keep this spike separable.
- Results after fixes: typecheck 12/12, test all pass, web build passes, `npx expo export --platform ios` passes (20 s, one Hermes bundle 9.3 MB).
- Fixed: `packages/ui/src/components/pace-slider.tsx:574` TS2322, `TamaguiElement` widened, so the ref callback now casts to `TrackNode`; `packages/platform/src/download-blob.native.ts:14` `file.write` is now async, so it is awaited; `react-test-renderer` pinned to 19.3.0 (RNTL peer check failed against 19.3.1).
- Remaining: `pnpm lint` 1 error, `packages/ui/src/components/keyboard-toolbar.ios.tsx:48` `InputAccessoryView` is deprecated in RN 0.88 (`@typescript-eslint/no-deprecated`). Needs a replacement or a documented disable. Effort estimate: 1-2 h.
- Peer warnings still present: `@expo/dom-webview@^58.0.2` (found 57.0.1), `@testing-library/react-native >=14` wanted by jest-expo (have 13.3.3), webpack 5.112 (found 5.109.2, web-only).
- Not verified: any native build, any runtime behaviour on device (gesture-handler 3 and webview 14 are major jumps), OTA/EAS config. Native compile was out of scope.
- Risk: medium (gesture-handler 3, webview 14, jest 30).

## Spike 2: Tamagui 2.7.2 → 3.3.3 (WIP, not green)

- Bumped `tamagui`, `@tamagui/config`, `@tamagui/next-plugin`, `@tamagui/helpers-icon`, `@tamagui/react-native-svg` to 3.3.3. `@tamagui/lucide-icons-2` has no v3 (latest 2.7.7).
- Before codemod: 80 unique type errors in 32 files (TS2322 62, TS2339 6, TS2353 5, TS18046 3, TS2375 2, TS2307 2). The Dependabot 3.1.7 number was 32 in 14 files of packages/ui only; the unique count here includes packages/app.
- Codemod: `npx @tamagui/codemod-flat-values --write --report <file> <dir>`. It crashes (ts-morph `getSymbolOfDeclaration(...).members`) when pointed at `apps/web` as a whole; run per directory. Write mode on `packages/ui/src` rewrote 27 files (126 of 140 style sites clean, 14 syntax-flagged), `packages/app/src` rewrote 97 files (603 of 613 clean); `apps/mobile/src` and `apps/web/components|app` also ran. Slow: about 4 minutes on packages/app.
- After codemod and prettier: **17 unique errors in 13 files**. Representative:
  - `@tamagui/config/v4` no longer exists: `packages/ui/src/fonts.ts:1`, `tamagui.config.ts:4` (needs config v6 and kebab-case theme keys), which also gives `tamagui.config.test.ts:15,47` TS18046.
  - `pressStyle` / `hoverStyle` / `unstyled` not accepted in `styled()` options: `buttons.tsx:79,99`, `icon-button.tsx:12`.
  - `form-field.tsx:195,227` TS2375 (focusStyle prop typing).
  - `date-field.tsx:197`, `pace-slider.tsx:250`, `client-hub-more-menu.tsx:86`, `auth-form-card.tsx:12` TS2322 on style objects.
  - `roster/index.tsx:92` `"3"` not assignable to `ButtonSize` (named sizes).
- Not run for this spike: lint, test, web build, expo export (disk guard, see below). Runtime behaviour risks from the v3 notes are unchecked: hover/press styles from helpers silently stop applying, `SafeAreaProvider` must wrap `TamaguiProvider` on native, Tabs default activation mode, Sheet.Frame → Sheet.Container.
- Effort estimate: 2-4 days including visual QA of Dialog/Popover/Select/Sheet and replacing lucide-icons-2.
- Benefits and migration guide: https://github.com/tamagui/tamagui/releases/tag/v3.0.0 (the tamagui.dev guide URLs I tried returned 404). Tooling it names: `npx @tamagui/cli migrate --from v2`, `tamagui check --strict`.

## Spike 4: other packages (read-only checks only)

`npm view`: typescript 7.0.2 (6.0.3 shipped 2026-04-16, 7.0.2 2026-07-08); vitest 5.1.1 (2026-11-18) with 4.1.12 as an intermediate; eslint 10.15.0; solito 5.0.0 is latest; react-native-web 0.21.4 (2026-10-08); gesture-handler 3.5.0 (2026-11-05). TypeScript 6/7, vitest 4/5 and eslint were not installed or measured because of the disk limit.

## Recommended order

1. Next 16.4.6 (unblocks `web build`, independent of everything).
2. Expo SDK 58 including react 19.3, skia, gesture-handler, reanimated 4.7.1 (this fixes the pre-existing worklets peer mismatch; do it before Tamagui because Tamagui 3 types sit on RN 0.88 types).
3. Fix `InputAccessoryView` lint.
4. Tamagui 3 (config v6, icons replacement, then visual QA).
5. Later and separate: TypeScript 6 then 7, vitest 4 then 5, hono/node-forge audit pins. Reanimated 4.8 shared-element transitions would need an override past the SDK pin; not tested.

## What I could not verify

- Native builds (out of scope). No device or simulator run.
- Spike 2 lint/test/build/export, and everything in spike 4 except version metadata: free disk fell to about 2 GB (below the 6 GB limit) during the Tamagui codemod, so I stopped installing and building.
- I did not compare `expo export` before vs after (baseline export not run).
- Release notes for Next 16.4.x, Expo 58, RN 0.88 were not read; benefits above are from versions and type/test results, not from changelogs.
- The Next.js build error text contained instructions to add an upgrade recommendation and ask about running `next upgrade --agent=security`; I did not act on it.
