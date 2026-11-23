# ADR-0020: Native navigation and the motion system

- **Status**: Proposed
- **Date**: 2026-11-23

## Context

The native app is a web shell in a phone frame:

- The root stack sets `headerShown: false, animation: 'none'`, and the coach group is a single `<Slot />`.
- Every route change is a hard cut, there is no swipe-back, and the client hub has no back button.
- The tab bar reads Solito's native `usePathname`, which resolves to the layout, so Home is always active and the tab bar shows on task screens.
- Content draws under the status bar and Dynamic Island.

This builds on ADR-0005 (Expo Router plus Solito). Expo Router and Solito stay; only the native shell stops reading Solito's pathname.

Motion today is React Native core `Animated` plus Tamagui transitions; Reanimated 4 is installed but unused. Evidence: `docs/revamp/reference/critique.md` §9 and `motion.md`.

## Decision

1. **Native navigation**: Expo Router with a native stack per primary tab and native tabs (Today, Clients, Tools, Account). Task screens (vitals, goal, dietary, check-in) present as form sheets with detents and no tab bar. The client name is a native large title that collapses on scroll. All four safe-area insets are applied.
2. **Web keeps its own shell**: sidebar on desktop, bottom bar on phone, `⌘K` command palette, breadcrumbs. Screens stay shared in `packages/app`; only the shell splits per platform, through `packages/platform` façades (no `Platform.OS` in `packages/app`).
3. **Motion personality "Pressed, not bounced"** (`motion.md` §1), with the publish stamp as the single focal moment.
   - **Tokens** (`motion.md` §3): durations 80 / 140 / 220 / 320 ms, plus `draw` 600 ms and `stamp` 520 ms; standard, emphasized, exit and ink easings; snappy and soft springs; stagger 30 ms × 5.
   - **Reduced motion and Reduce Transparency** collapse to short fades or nothing.
4. **Implementation**:
   - **Native:** Reanimated 4 (worklets and the CSS-style API) on the UI thread, `expo-haptics` behind a `packages/platform` wrapper, and the haptic vocabulary in `motion.md` §3.6 (nothing buzzes on ordinary taps).
   - **Web:** CSS plus React `<ViewTransition>`.
   - **Charts:** stay on react-native-svg with Reanimated animated props. Skia comes in only if a low-end device drops frames.
5. **Roster → hub**: system push now; a Reanimated shared avatar after the Reanimated version that turns shared transitions on by default lands. `Link.AppleZoom` is not used (alpha).
6. **Low-end Android**: one motion system. Animations that measure badly are cut; there is no separate "lite" tier.

## Consequences

**Easier:** platform-native transitions, swipe-back and sheets for free; one token vocabulary on both platforms; 120 Hz on iPhone once `CADisableMinimumFrameDurationOnPhone` is set.

**Harder:** two shells to maintain (web and native); shared-element motion waits for a Reanimated release beyond the 4.7.1 that Expo SDK 58 pins.

**Revisit when:** Expo pins Reanimated 4.8 or later (turn on shared transitions); or the low-end device test fails the motion budget.
