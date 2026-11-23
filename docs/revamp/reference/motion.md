# GymOS motion report

Date: 2026-11-23. Status: **proposal**. Khubaib decides; open decisions are batched at the end, each with a recommendation.

Companion gallery: `report/motion.html`. It lets you try every proposal below at full speed or at 0.25×, with reduced motion on or off.

Inputs used:

- the audit report (`report/index.html`), `research.md` sections 2 and 5, and `critique.md` (per-screen ideals and section 9, the native findings);
- the repo, read-only;
- Impeccable 4.9.2: the `animate`, `delight`, `overdrive`, `craft-floor`, `ios` and `android` references;
- UI UX Pro Max (section 7, Animation, plus the chart and form rules).

Version-sensitive API claims carry a source at the end, or name the local file I checked. Two things are inference and are labelled where they appear: performance on a real low-end Android phone (not measured), and spring settle times (computed from the spring formula, not measured on a device).

---

## 0. What motion exists today (from the code)

| Where                                                                                   | What it does                                                                                                                                    | Problem                                                                                                                                             |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/ui/src/components/stagger-item.tsx`                                           | React Native core `Animated`: 240 ms fade plus a 10 px rise, 40 ms per item, capped at 8 items (320 ms)                                         | Old API. Replays on every mount, including when you come back to a tab.                                                                             |
| `fade-in.tsx`                                                                           | `Animated`, 220 ms fade plus an 8 px rise                                                                                                       | No reduced-motion check                                                                                                                             |
| `skeleton.tsx`                                                                          | `Animated` pulse loop, skipped under reduced motion                                                                                             | Fine. The reduced-motion hook is copied here.                                                                                                       |
| `weight-chart.tsx`                                                                      | 700 ms draw-in (`DRAW_MS`) with ease-out-cubic, driven by `requestAnimationFrame` plus `setState` every frame; reduced-motion check at line 231 | Re-renders the whole SVG on the JS thread every frame. This is the most likely place to drop frames on low-end Android _[inference, not measured]_. |
| `weave-line.tsx`                                                                        | 1,200 ms draw-in (also rAF plus `setState`) and a 900 ms pulse loop                                                                             | Same JS-thread pattern. The motif is unused in screens.                                                                                             |
| `gymos-sheet-motion.ts`                                                                 | Tamagui transition token `medium` and a scrim at 0.18                                                                                           | Tied to the Tamagui driver, which changes in Tamagui 3                                                                                              |
| `packages/app/src/features/auth/use-auth-panel-slide.ts` and `apps/web/app/globals.css` | Clones the old form node and slides it out: 320 ms `cubic-bezier(0.22,1,0.36,1)`, with a 400 ms cleanup timer                                   | Web only. Can't be reused for other routes.                                                                                                         |
| `apps/web/app/globals.css` (reduced-motion block)                                       | Under reduced motion, `*` gets `animation-duration` and `transition-duration` of 0.01 ms `!important`                                           | Also kills opacity and colour feedback that should stay.                                                                                            |
| `apps/mobile/app/_layout.tsx:41`                                                        | Root `Stack` with `animation: 'none'`, `headerShown: false`; the groups are `<Slot />`                                                          | Every route change is a hard cut, and there is no swipe-back (critique N4)                                                                          |
| Reduced-motion hook                                                                     | The same `AccessibilityInfo` subscription is pasted into 4 files                                                                                | Needs one shared hook                                                                                                                               |
| Haptics                                                                                 | `expo-haptics` is not installed                                                                                                                 | None anywhere                                                                                                                                       |
| Lists                                                                                   | No `FlatList`, `FlashList` or `RefreshControl` in `packages/app` or `packages/ui`; lists are `ScrollView` plus `map`                            | Layout animations are easy now. Re-check them if lists become virtualised.                                                                          |

There is no Reanimated call in `packages/ui/src` or `packages/app/src`, even though Reanimated 4.5.1 and Skia 2.6.2 are installed (`research.md` §1).

---

## 1. Principles

**What motion is for in GymOS.** The coach runs a weekly loop: find who needs them, check in, adjust, publish. Motion earns a place only when it does one of four jobs:

1. **Orientation.** Where did I go and how do I get back? Native push and swipe-back, direction-aware slides on web, sheets that rise over the client they belong to.
2. **Feedback.** Did that register? Press response within 80 ms, a check that draws itself, a number that rolls to its new value, haptics at the moments that matter.
3. **Continuity.** Same thing, new place: the client's avatar and name carry from the roster into the hub header, and a completed row moves into "Done today" instead of vanishing.
4. **Celebrating real progress.** Only real outcomes: a plan published (signed off), a goal milestone crossed, an intake signed. Never a routine save.

Anything that does none of these doesn't animate. Impeccable's rule for Operate surfaces applies: motion serves feedback, state and continuity, and the coach never waits through choreography.

**Personality: "Pressed, not bounced."** Direction D, Gym Floor Print, is a flat textured print world: warm paper, cobalt ink, ochre and olive plates. The motion borrows from the print shop:

- **Firm.** Things arrive with confident deceleration and stop. Routine UI never bounces: spring damping ratios are 0.88 or more, which means no visible overshoot.
- **Inked.** Lines draw like a pen stroke (chart, check marks, the weave). Fills pour like ink into a printed bar (macro bars, goal bar). Numbers roll like a numbering-machine stamp, one digit column at a time.
- **Registered.** Elements land exactly in place and stay there; alignment beats flourish. A roller-style cover wipe reveals results, the way a print pass reveals an image.
- **Quiet.** Most changes take 220 ms or less. Nothing loops except progress while real work runs. No glow, blur, glass, confetti or parallax.

**The one focal moment: the sign-off stamp.** When the coach publishes a plan, the status pill lands as a stamp reading "Published v2", with a success haptic and a toast. It is the product's sign-off act, it happens about once per client per week, and a neighbouring product could not use it unchanged.

The weight chart's draw-in is the one supporting authored entrance. It plays once per client per session.

**Rules everything follows:**

- **State first, motion second.** The new state is committed immediately. Animation only presents it, so it never waits on an `animationend` event (UI UX Pro Max `cancellable-state-transitions`).
- **Interruptible.** Every animation retargets from its current value. Input is never blocked.
- **Exit faster than enter**, at roughly 60–70% of the entrance.
- **Direction means hierarchy.** Deeper slides in from the trailing edge, back returns from the leading edge, and peers crossfade. RTL mirrors every horizontal motion; Urdu is planned (`research.md` §1).
- **Content is visible at rest.** No element waits at opacity 0 for a script to reveal it.

---

## 2. Budget

**Never animates**

- text while typing, and validation messages (they appear at once; colour carries the state);
- focus rings, keyboard row highlight (J/K, arrows), table sort and column resize;
- scroll position (no smooth-scroll hijacking);
- tab switches on native (the system owns them);
- anything during a scroll, except the scroll-linked client header;
- background refetches: a changed value gets at most a 900 ms wash that fades out, using colour only;
- waits under 300 ms: no spinner and no skeleton;
- decorative loops: there are none. The only loops are progress indicators for real work, and they stop when hidden or offscreen.

**Frequency limits**

- **Draw-ins** play once per client, per range, per app session. Revisits render static.
- **Number rolls** play only when the coach caused the change, never on refetch or navigation.
- **Stagger** applies to the first view of a list only, never on tab return.
- **Celebrations** (stamp, milestone pop, intake signed) happen once per action and never stack. A single action produces one haptic, apart from discrete steps (grams stepper, chart scrub), which tick per step and are throttled to 50 ms.

**Concurrency**

- One focal animation per view.
- At most two regions animating at once.
- At most two named shared elements per web route change.

**Frame rate**

- **60 fps floor** on the low-end Android test device; **120 fps** on ProMotion iPhones.
  - iPhone apps must opt in to frame rates above 60 Hz with the `CADisableMinimumFrameDurationOnPhone` Info.plist key (Apple guidance via MacRumors and iMore, sources §9). `apps/mobile/app.json` has no `infoPlist` entry today. Add it through `ios.infoPlist`, then check the built Info.plist, because forum reports show the key being lost in some builds.
  - iOS "Limit Frame Rate" and Low Power Mode cap the rate at 60 Hz. That is correct behaviour; don't fight it.
- **UI thread only on native.** Use Reanimated worklets and the CSS-style API, the native stack, native sheets and Skia. No React re-render per frame: retire the rAF-plus-`setState` loops in `weight-chart.tsx` and `weave-line.tsx`.
- **Compositor-friendly on web.** Animate `transform` and `opacity`. `clip-path` is allowed on small regions only. Use `will-change` only while an animation runs.

**Low-end Android (the pilot market)**

- No blur, no `backdrop-filter`, no animated shadow radius. For a lift, fade a pre-rendered shadow layer's opacity or change the tonal surface colour.
- Layout animations only on short lists. Above roughly 30 visible rows, fall back to a fade _[threshold is a starting guess; confirm by measurement]_.
- Textures (the print grain) stay static images. They never animate.
- One motion system everywhere; cut a specific animation only if measurement on the test device shows dropped frames (decision 5). Which device to test on is Khubaib's call (decision 6). I don't assume a model.

---

## 3. Tokens

One source of truth in `packages/ui/src/motion/tokens.ts`, mirrored as CSS custom properties for web. A unit test asserts the two match. The four base durations and two easings are the ones already in `research.md` §5 and the report's "Motion layer"; everything else is an addition.

### 3.1 Durations

| Token           | ms  | Use                                                                                                    | Exit pairing |
| --------------- | --- | ------------------------------------------------------------------------------------------------------ | ------------ |
| `instant`       | 80  | Press-in, hover colour, chip fill, toggle thumb                                                        | —            |
| `fast`          | 140 | Exits, tooltip, small-integer digit roll, crossfade out, focus-adjacent colour                         | —            |
| `base`          | 220 | State change, crossfade in, tab indicator, toast in, row collapse, scrim                               | `fast`       |
| `slow`          | 320 | Layout and overlays: side sheet, dialog, web route slide, shared morph, range morph, large-number roll | `base`       |
| `draw` _(new)_  | 600 | Authored entrances: chart draw-in, goal bar first fill, weave draw-in                                  | n/a          |
| `stamp` _(new)_ | 520 | The publish stamp only                                                                                 | n/a          |
| `reducedFade`   | 120 | The universal reduced-motion crossfade (matches `research.md`: "0 to 120 ms opacity only")             | 120          |

### 3.2 Easing

| Token          | Value                             | Use                                                                           |
| -------------- | --------------------------------- | ----------------------------------------------------------------------------- |
| `standard`     | `cubic-bezier(0.2, 0, 0, 1)`      | On-screen changes, layout moves, crossfades                                   |
| `emphasized`   | `cubic-bezier(0.3, 0, 0, 1)`      | Arrivals: sheets, dialogs, toasts, route enter, verdict                       |
| `exit` _(new)_ | `cubic-bezier(0.3, 0, 0.8, 0.15)` | Leaving the screen; accelerates away (Material's emphasized-accelerate curve) |
| `ink` _(new)_  | `cubic-bezier(0.16, 1, 0.3, 1)`   | Draws, fills, rolls: a fast start and a long settle, like ink spreading       |
| `linear`       | `linear`                          | Progress, sheen, anything that tracks a finger 1:1                            |

On native, Reanimated's `Easing.bezier(x1, y1, x2, y2)` takes the same four numbers.

### 3.3 Springs

These are for gestures and anything that may be interrupted mid-flight. Reanimated 4's `withSpring` defaults are `stiffness 900`, `damping 120`, `mass 4` (Reanimated docs, §9), so pass `mass` explicitly.

| Token    | Reanimated config                          | Damping ratio | Settles in _(computed, 4 / ζω)_ | Use                                                                                    |
| -------- | ------------------------------------------ | ------------- | ------------------------------- | -------------------------------------------------------------------------------------- |
| `snappy` | `{ stiffness: 520, damping: 40, mass: 1 }` | 0.88          | about 200 ms                    | Press release, stepper bump, small-control snaps, native segmented indicator           |
| `soft`   | `{ stiffness: 260, damping: 30, mass: 1 }` | 0.93          | about 270 ms                    | Custom sheets, drag release carrying the finger's velocity, shared avatar, header snap |

- **Web equivalents when there's no gesture:** `snappy` is 220 ms `emphasized`, and `soft` is 320 ms `emphasized`. Damping ratios this close to 1 overshoot by under 1%, so a curve is visually equivalent.
- **Web drag release** (bottom sheet) uses the real spring through a short integrator, so the finger's velocity carries into the motion. The gallery has one in about 20 lines.
- **Tuning:** both presets get tuned once on the test devices before anything else is built on them.

### 3.4 Stagger, distance and scale

| Token        | Value                                          | Notes                                                                                               |
| ------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `stagger`    | 30 ms per item, at most 5 steps (150 ms total) | Replaces 40 ms × 8. First view of a list only.                                                      |
| `nudge`      | 2 px                                           | Hover lift. Applied to a child element, never the hovered element itself (Impeccable `animate.md`). |
| `rise`       | 8 px                                           | Content entrance, toast                                                                             |
| `shift`      | 24 px                                          | In-screen step change (intake), lateral "Next client"                                               |
| `travel`     | 32 px                                          | Web route slide (enough to show direction without making the eye chase)                             |
| `pressScale` | 0.97 buttons, 0.98 cards                       | List rows get a background tint instead; scaling a full-width row looks wobbly                      |

### 3.5 Reduced motion and Reduce Transparency

**Detection.** iOS Reduce Motion, Android "Remove animations" and web `prefers-reduced-motion` all report as "reduced".

- React Native's `isReduceMotionEnabled` also returns true when Android's developer transition scale is off (React Native docs, §9).
- Reanimated's `useReducedMotion` reads the setting **at launch only** and doesn't re-render when it changes (Reanimated docs). The shared hook therefore keeps the `AccessibilityInfo` listener for live changes. React Native Web implements the same API through `matchMedia` _[verify in the spike]_.
- Reanimated animations default to `reduceMotion: ReduceMotion.System`. Keep that default and design the explicit fallbacks below so each one is chosen, not accidental.

| Normal                                      | Reduced                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Slides, pushes, shared morphs, sheet travel | 120 ms crossfade in place (native stack transitions are the system's own; iOS applies its own Reduce Motion behaviour, so don't override it)                      |
| Draw-ins, fills, stamp                      | The final state appears with a 120 ms fade                                                                                                                        |
| Number roll                                 | Instant swap plus the 900 ms ochre wash highlight (colour only, so "this changed" still reads)                                                                    |
| Springs and gesture release                 | Snap to the target. During the drag itself the element still tracks the finger, because direct manipulation is not decorative motion.                             |
| Stagger                                     | None. The list fades as one block.                                                                                                                                |
| Skeleton pulse or sheen                     | Static skeleton (`skeleton.tsx` already does this)                                                                                                                |
| Haptics                                     | **Unchanged.** Haptics are not motion. iOS silences them in Low Power Mode and when system haptics are off.                                                       |
| Web global CSS                              | Replace the `*` 0.01 ms nuke with per-token fallbacks: set `--travel`, `--rise`, `--shift` and `--nudge` to `0` and keep opacity and colour transitions at 120 ms |

**Reduce Transparency** (iOS `isReduceTransparencyEnabled` and the `reduceTransparencyChanged` event, both iOS-only; web `prefers-reduced-transparency` where supported). Direction D is flat, so there's little to change:

- Custom scrims go from 32% to 50% opacity.
- Sheet and bar surfaces are always opaque.
- System bars handle their own materials.
- Never use backdrop blur on Android or web.

### 3.6 Haptic pairings

These live behind a semantic wrapper in `packages/platform`: `haptic('select' | 'step' | 'bound' | 'success' | 'attention' | 'error' | 'lift' | 'drop')`. Web is a no-op, because `navigator.vibrate` doesn't exist in iOS Safari and buzzing a desktop is meaningless. On Android, `performAndroidHapticsAsync` is preferred over the Vibrator-based calls and needs no VIBRATE permission (Expo SDK 57 docs).

| Event           | Moments                                                                                  | iOS (`expo-haptics`)                                  | Android (`AndroidHaptics`)   |
| --------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------- | ---------------------------- |
| `select`        | Filter chip, segmented control, chart range switch, pace slider snapping to a named stop | `selectionAsync()`                                    | `Segment_Tick` (API 34+)     |
| `step`          | Grams stepper step, chart scrub crossing a weigh-in (throttled to 50 ms)                 | `selectionAsync()`                                    | `Segment_Frequent_Tick`      |
| `bound`         | Stepper hits min or max; pace crosses the safety floor                                   | `impactAsync(ImpactFeedbackStyle.Rigid)`              | `Reject` (API 30+)           |
| `success`       | Plan published, verdict HOLD, intake signed, goal milestone crossed                      | `notificationAsync(NotificationFeedbackType.Success)` | `Confirm` (API 30+)          |
| `attention`     | Verdict REFER_REVIEW, drift acknowledgement, destructive confirm                         | `notificationAsync(NotificationFeedbackType.Warning)` | `Reject`                     |
| `error`         | Submit failed                                                                            | `notificationAsync(NotificationFeedbackType.Error)`   | `Reject`                     |
| `lift` / `drop` | Reorder pick-up and drop (only if reorder ships)                                         | `impactAsync(Medium)` / `impactAsync(Light)`          | `Drag_Start` / `Gesture_End` |

- **Never:** plain taps, navigation, tab switches, scrolling, pull-to-refresh, toasts, sheet open or close, or warning-tone verdicts (ADJUST_TARGETS, ADHERENCE_FOCUS, PLATEAU_PROTOCOL). Those are normal coaching outcomes, not alarms. INSUFFICIENT_DATA gets none either.
- **Older Android:** the Android constants are API-gated. On older devices the call may produce nothing, and that is acceptable. Don't fall back to a vibrator buzz.

---

## 4. Screen transitions per platform

### 4.1 Native navigation (iOS and Android)

This depends on critique decision 10 (a native stack per tab plus native tabs, recommended there). The motion asks are:

| Transition                                                  | iOS                                                                                                                                                                                                                      | Android                                                                                                                             | API                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Push and pop                                                | System push with interactive edge swipe-back                                                                                                                                                                             | System default push; predictive Back                                                                                                | Expo Router `Stack`. Remove `animation: 'none'` and leave `animation` unset (`'default'`), which defers to each platform's own push.                                    |
| Sign-in → coach shell                                       | Crossfade at 220 ms. Signing in is not "going deeper".                                                                                                                                                                   | Same                                                                                                                                | Root stack `animation: 'fade'` for the `(auth)`/`(coach)` swap only                                                                                                     |
| Tabs                                                        | System tab bar; content switches with no animation (the iOS norm)                                                                                                                                                        | Material navigation bar; instant switch                                                                                             | SDK 57: `expo-router/unstable-native-tabs` (marked unstable). SDK 58: `expo-router/native-tabs`. Don't add custom tab animation.                                        |
| Task screens: check-in, vitals, goal, dietary, grams editor | **Form sheet with detents.** Check-in `[0.6, 1]`, vitals and goal `[1]`, grams editor `'fitToContents'`. Grabber visible. Swipe to dismiss, but `gestureEnabled: false` while edits are unsaved, which raises a confirm. | Long forms open as a full-screen modal sliding from the bottom; short picks open as a form sheet (Android allows at most 3 detents) | `presentation: 'formSheet'`, `sheetAllowedDetents`, `sheetGrabberVisible`, `sheetInitialDetentIndex` (Expo modals guide). Check `'fitToContents'` support in the spike. |
| Overflow menus                                              | System context menu                                                                                                                                                                                                      | Dropdown menu                                                                                                                       | Native menus; no custom motion                                                                                                                                          |
| Pull-to-refresh                                             | System `RefreshControl`, tinted cobalt                                                                                                                                                                                   | Same (SwipeRefreshLayout)                                                                                                           | No custom animation. Changed rows get the wash.                                                                                                                         |

**Choreography across a sheet.** Presenting a modal screen blurs the screen underneath. When the coach finishes a check-in and the sheet dismisses, Today regains focus (`useFocusEffect`) and only then plays its pending "row complete" animation (§5.1), so the two never overlap.

**Roster row → client hub (the shared element).** Options:

| Option                                                | What it gives                                                               | Constraints (sourced)                                                                                                                                                                                                                                                                                                           | Verdict                                                                                                                                                    |
| ----------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A. System push, plus a Reanimated shared avatar later | Familiar push; the avatar flies into the hub header while the screen slides | Shared transitions are on by default from Reanimated **4.8.0**; 4.2–4.7 have them behind `ENABLE_SHARED_ELEMENT_TRANSITIONS`. They need `react-native-screens` **4.28+** on Android (the repo has ~4.26). No web support. Default animation is 500 ms; tune it to `slow` 320 ms `standard` with the `SharedTransition` builder. | **Recommended.** Push now; add the avatar after the SDK 58 upgrade.                                                                                        |
| B. `Link.AppleZoom` (iOS zoom)                        | The row zooms into the hub, like Photos or App Store                        | **Alpha**, iOS 18+, SDK 55+, built-in `Stack` only. Docs advise against screens with headers (the hub has a nav bar). Open or dismiss can take about 1 s with rapid open and close, which is an upstream react-native-screens issue. No Android.                                                                                | Not for rows. Apple's zoom is the card-to-detail idiom, and a coach taps in and out of clients dozens of times a day. Revisit if a card grid ever appears. |
| C. Plain push only                                    | No continuity cue                                                           | None                                                                                                                                                                                                                                                                                                                            | Fallback if A's spike fails                                                                                                                                |

Android under option A reads like Material's container transform: the avatar carries over while the system push runs. Under reduced motion, there's no shared flight, only the system transition.

**Hub header on iOS.** The client name is the nav-bar title. The proposal is to use `headerLargeTitle` on the hub so the system collapses the large name to the inline title on scroll for free, at 120 Hz with no code. Status chip, allergy chip and **Start check-in** sit in the first content row and scroll away. The critique said "inline title"; this is a small change, so it's decision 3.

### 4.2 Web (Next.js 16 App Router)

**Verified locally:** the installed `next@16.4.3` bundles React `19.3.0-canary-278794d7-20261002`, whose build exports `ViewTransition`. Next's `dist/server` has no `viewTransition` config flag, and `Link` handles `transitionTypes`. This matches the current Next guide: "View transitions work in the App Router with no configuration." So the `research.md` note ("experimental, not production-recommended") is out of date for this version. The underlying React build is still a canary that Next bundles.

| Navigation                                        | Motion                                                                                                                                                                                                                                                     | Tokens                                                                   |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Forward, deeper (roster → hub, hub → plan editor) | Old content: 140 ms fade out with 32 px travel toward the leading edge. New content: 220 ms fade in after 140 ms, with 320 ms travel in from the trailing edge. The sidebar and app header are anchored with a `viewTransitionName` and `animation: none`. | `travel` 32 px, `slow` 320 `standard`, fade `base`/`fast`                |
| Back via an in-app back link                      | Mirror of forward                                                                                                                                                                                                                                          | Same                                                                     |
| Peer (sidebar: Today, Clients, Tools, Account)    | Content crossfade only, no slide                                                                                                                                                                                                                           | `base` 220 `standard`                                                    |
| Hub tabs (Overview, Progress, Plan, Profile)      | Content fade-through: old out over 80 ms, then new in over 220 ms, so text never overlaps text. The tab indicator slides as one element (transform plus `scaleX`).                                                                                         | indicator `base` 220 `emphasized`; content `instant` out, then `base` in |
| Shared element, roster row → hub                  | Avatar and name morph into the hub header: `<ViewTransition name={"client-" + id + "-avatar"} share="morph" default="none">`, plus the same for the name. Two named pairs, never more.                                                                     | `slow` 320 `standard`                                                    |
| Skeleton → content (Suspense)                     | Fallback exits in 140 ms; content fades in over 220 ms. No travel, because the skeleton matches the layout.                                                                                                                                                | `fast`/`base`                                                            |
| Browser Back and Forward, swipe history           | **No animation.** React skips view transitions on `popstate` to preserve scroll and form restoration (Next guide). Accepted.                                                                                                                               | —                                                                        |

**How to implement:**

- Wrap each participating `page.tsx`, not the layout, in `<ViewTransition enter={{ 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' }} exit={{…}} default="none">`.
- Tag links with `transitionTypes={['nav-forward']}`.
- Add `::view-transition { pointer-events: none }` so clicks during a transition aren't lost.
- **Solito check:** shared screens use Solito's `Link` and router. Check that they forward `transitionTypes`; otherwise add a small `TransitionLink` in `packages/platform` (web: `next/link`; native: the Expo Router `Link`). `AGENTS.md` forbids `Platform.OS` in `packages/app`.
- **Auth slide:** replace the clone-and-slide hook with the same mechanism. The auth links carry `nav-forward` or `nav-back`, and the existing `rememberPath` logic can supply the direction.

**Browser fallbacks.**

- Same-document view transitions are Baseline: Chrome and Edge 125, Safari 18, Firefox 144.
- Firefox 144 has no transition **types**, so it gets the default crossfade or a cut, never a wrong-direction slide.
- Some features need Safari 18.4.
- Without support, navigation is an instant cut, which is fine.

**Reduced motion on web.** Under `prefers-reduced-motion`, `::view-transition-old(*)` and `::view-transition-new(*)` drop the slide keyframes and keep a 120 ms fade, and `::view-transition-group(*)` animation goes to 0. Morphs become crossfades.

**Desktop overlays**

| Surface                                              | Enter                                                                                                             | Exit                                            | Notes                                                                                                                                                                                                                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Side sheet, about 480 px (task screens over the hub) | `translateX(100%) → 0` over 320 ms `emphasized`; scrim fades 0 → 0.32 over 220 ms                                 | 220 ms with `exit` easing, then `router.back()` | Give it a URL with parallel plus intercepting routes (an `@sheet` slot). Close, Esc and a scrim click play the exit, then navigate. Browser Back closes it without the exit animation (accepted, per the view-transition note above). Focus is trapped and returns to the trigger on close. |
| Centred dialog (destructive confirms)                | Scale 0.97 → 1 plus fade, 220 ms `emphasized`                                                                     | 140 ms fade                                     | `<dialog>` with `@starting-style` plus `transition-behavior: allow-discrete`, with a WAAPI fallback                                                                                                                                                                                         |
| ⌘K palette                                           | Fade plus scale 0.98 → 1, 140 ms `emphasized`                                                                     | 80 ms fade                                      | Opens instantly on the keystroke; results never animate while typing                                                                                                                                                                                                                        |
| Popover menus                                        | Fade plus 4 px, 140 ms                                                                                            | 80 ms                                           | —                                                                                                                                                                                                                                                                                           |
| Hover and focus                                      | Colour and background over 140 ms; quick actions on a row fade in over 140 ms after an 80 ms delay, on enter only | —                                               | Focus rings never transition. Hover never moves the hovered element itself; a child carries the motion.                                                                                                                                                                                     |

---

## 5. Catalogue: per screen and per widget

Format for each entry:

- **Trigger:** what starts it.
- **What moves:** the elements and properties.
- **Timing:** tokens.
- **Order:** the choreography.
- **Reduced:** the reduced-motion fallback.
- **API:** native / web.

Haptics follow §3.6.

### 5.1 Today queue

**Row complete → collapse**

- **Trigger:** the check-in for this client completes. This plays when Today regains focus after the sheet closes, or immediately in a desktop side-sheet flow.
- **What moves:** the leading status circle draws a check. The row tints with the olive wash. The row exits. Siblings below move up into the gap. The row reappears inside the collapsed "Done today" group.
- **Timing:** check 220 ms `ink`, with a 140 ms wash. Hold 80 ms so the eye registers it. Row exit 140 ms `exit` (opacity plus 8 px toward the leading edge). Siblings 220 ms `standard`.
- **Order:** 0 ms check and wash → 300 ms row exit → 440 ms siblings move and both counts roll → about 660 ms done.
- **Reduced:** the row fades out over 120 ms, siblings snap into place, and the counts swap with the wash.
- **API:**
  - _Native:_ Reanimated `exiting` (custom keyframe), `layout={LinearTransition.duration(220).easing(standard)}` on siblings, and the check path's `strokeDashoffset` driven by a CSS-style keyframe.
  - _Web:_ `startTransition` plus a `<ViewTransition>` keyed per row, which gives FLIP for siblings on the compositor. This avoids animating height.
- **No haptic here:** the verdict already gave one.

**Batch "Next client →"** (inside the check-in sheet)

- **Trigger:** "Next client →".
- **What moves:** the sheet stays open and its content moves laterally (shared axis X).
- **Timing:** out 140 ms with 24 px `exit`; in 220 ms with 24 px `emphasized`.
- **Order:** rows completed in the meantime collapse behind the sheet. The counts roll when the sheet closes.
- **Reduced:** 120 ms crossfade.
- **API:** the same Reanimated entering and exiting pair. Web uses the same pair through the shared component.

**Counts rolling** (summary sentence "5 check-ins overdue · 1 draft waiting", group headers, filter chip counts)

- **Trigger:** a coach-caused change. Never a refetch.
- **What moves:** each changed digit column rolls vertically, like a numbering machine. Columns are stacks of 0–9 translated by `-digit × lineHeight`.
- **Timing:** `base` 220 `ink` for small integers; `slow` 320 `ink` for kcal and grams.
- **Order:** rolls start together with the cause (row collapse, stepper press).
- **Reduced:** instant text swap plus the 900 ms ochre wash, using background opacity only.
- **API:** one `RollingNumber` primitive in `packages/ui` using Reanimated CSS transitions on `transform`, the same code on native and web.
  - Tabular figures: `fontVariant: ['tabular-nums']`.
  - Screen readers: the column stack is hidden from assistive tech, and one live text node holds the final value.

**Filter chips** (Overdue · Due this week · Drafts · All)

- **Trigger:** a tap.
- **What moves:** the chip fills and its check appears. The list crossfades ("same place, different content"). Rows present in both sets keep their position and move with FLIP.
- **Timing:** chip 80 ms; list 220 ms `standard`.
- **Reduced:** chip colour change only; the list swaps.
- **API:** Reanimated layout transitions on native, `<ViewTransition>` on web. `select` haptic.

**First load of the queue**

- **What moves:** skeleton → content crossfade (§5.10). Rows may stagger 30 ms × up to 5, on the **first** load in a session only.
- **Reduced:** one fade.

### 5.2 Client header

**Collapse on scroll**

- **iOS:** the system large title (client name) collapses to inline for free (decision 3). The chip row and Start check-in scroll away as ordinary content. No custom code.
- **Android:** a Material top app bar that lifts on scroll. Its surface colour changes to the next tonal level over 140 ms once scrolled; the title stays.
  - **API:** `useAnimatedScrollHandler` sets a scrolled flag, and a Reanimated CSS transition on `backgroundColor` does the rest.
- **Web (desktop and phone):** the identity block (avatar 48, name, chips, Start check-in) is ordinary scrolling content. A 48 px sticky compact bar shows a small avatar, the name, and a compact **Check-in** button once the large name passes under it.
  - **Timing:** compact bar title fades in with a 6 px rise over 220 ms `emphasized`, and its hairline fades in over 140 ms.
  - **Trigger:** an IntersectionObserver sentinel on the name toggles a class. It isn't scroll-linked, so it works in every browser with no layout thrash and no half-collapsed states.
  - **Reduced:** the compact title appears with a 120 ms fade and no rise.
- **Why not shrink a sticky header:** shrinking one changes its layout height and jolts the content. The "large block scrolls away, compact bar appears" pattern is what iOS does, and it costs nothing.

**Status chip change** (for example "Overdue · 109 days" → "On track")

- **Trigger:** the check-in completes.
- **What moves:** the chip background crossfades to the new tone; the old text rolls up and out while the new text rolls up and in by 6 px. The width change morphs.
- **Timing:** 220 ms `standard`.
- **Reduced:** colour and text swap over 120 ms; no roll.
- **API:** native Reanimated `layout` plus a CSS-style transition on `backgroundColor`; web `<ViewTransition name={"status-" + id}>`. No haptic.

### 5.3 Weight chart

The incumbent is `packages/ui/src/components/weight-chart.tsx` (react-native-svg with tested path math). Engine choice is decision 4.

**Draw-in on first view**

- **Trigger:** the chart is first visible for this client and range in this session, using the existing `dataKey` plus a session-seen set.
- **What moves:** the actual line draws left to right. The area under it is revealed by a clip that follows the line. Milestone dots (25/50/75%) and the Today marker each pop at the moment the line reaches them. The projected dashed line fades in last.
- **Static from frame 0:** the goal line and the expected line are reference elements.
- **Timing:** line 600 ms (`draw`) `ink`; markers 160 ms with the `snappy` feel (scale 0.6 → 1 plus opacity); projection 220 ms after the line ends.
- **Order:** total about 820 ms. Each marker's delay is computed so it pops exactly when the eased line passes its x position (the gallery does this).
- **Reduced:** the complete plot fades in over 120 ms.
- **API:**
  - _Native, step 1:_ react-native-svg `Path` with `strokeDasharray`. Drive `strokeDashoffset` with a Reanimated CSS-style keyframe or `useAnimatedProps`, so it runs on the UI thread with no re-render. `pathLength` normalisation avoids measuring the path.
  - _Native, step 2 (only if needed):_ a Skia `Path` with `end={progress}`. The `start` and `end` trim props are in [0, 1], and Skia takes Reanimated values directly as props.
  - _Web:_ SVG `pathLength="1"` plus a `stroke-dashoffset` animation, and `clip-path: inset()` on the area group.

**Scrub with haptic ticks**

- **Trigger:**
  - _Touch:_ a horizontal drag on the plot.
  - _Mouse:_ hover.
  - _Keyboard:_ focus the chart, then use the arrow keys.
- **What moves:** a vertical rule and a dot follow the pointer 1:1 (`linear`, no smoothing lag). The dot snaps to the nearest weigh-in. A readout **above** the chart, never under the finger, shows "12 Sep · 85.1 kg · −0.4 vs last week". Values change instantly, with no tween while scrubbing.
- **On release:** the rule fades out over 140 ms and the readout crossfades back to "latest" over 140 ms.
- **Haptic:** `step` each time the snapped weigh-in changes, throttled to 50 ms. Touch only; no haptics on web.
- **Reduced:** identical, because direct manipulation isn't decorative. Only the release fade becomes instant.
- **API:**
  - _Native:_ `Gesture.Pan().activeOffsetX([-8, 8]).failOffsetY([-12, 12])` so vertical scrolling still wins. The shared value drives the rule's `x` through animated props; `runOnJS` (or the worklets scheduling equivalent) fires the haptic.
  - _Web:_ pointer events on the SVG, and `aria-live="polite"` on the readout. The data-table fallback stays (report).

**Range switch morph** (1M · 3M · All)

- **Trigger:** a segment tap.
- **What moves:** the segment indicator slides. The line morphs from the old x-scale to the new one. Axis labels crossfade.
- **Timing:** indicator 220 ms `emphasized`; line morph 320 ms `standard`; labels out 140 ms, then in 220 ms.
- **How the morph works:** resample both point sets to 64 evenly spaced x positions, then interpolate the points. Both paths come from the same point list, so this is straightforward.
- **Reduced:** 120 ms crossfade between the two plots.
- **API:**
  - _Native:_ interpolate the resampled points in a worklet and build the path string (SVG), or use Skia `usePathInterpolation` if step 2 is taken.
  - _Web:_ a 320 ms requestAnimationFrame tween on 64 points (one path, cheap). CSS `d: path()` animation isn't in Safari.
- **Haptic:** `select`.

**Milestone markers**

- **During the draw-in:** they pop as the line passes.
- **When a new milestone is crossed** by a vitals save, that marker gets the celebration:
  - the ochre dot runs scale 0 → 1.2 → 1 (420 ms keyframes, `ink`);
  - the label rolls in;
  - a `success` haptic fires, replacing the ordinary save confirmation.
- **The new weigh-in itself:** the line extends from the previous point to the new one over 320 ms `ink` ("the new point eases into the chart", per the report).
- **Reduced:** the marker and segment appear with a fade; the haptic stays.

### 5.4 Progress and goal visuals

The report drops the 330 px goal ring. Goal progress becomes a horizontal bar with Start, Target and a Today tick, and the craft floor bans rings standing in for content.

**Goal bar**

- **Trigger:** first view in the session, or a value change.
- **What moves:** the fill grows as a transform, `scaleX` from the start edge (logical: it flips under RTL). The percentage and "goal ~24 Jan 2027" roll.
- **Timing:** first view 600 ms (`draw`) `ink`; changes 320 ms `standard`.
- **Reduced:** final state; the numbers get the wash.
- **API:** Reanimated CSS transition on `transform`; CSS `transform` transition on web.

**Pace slider** (goal form)

- **What moves:** the thumb tracks the finger 1:1. On release it snaps to the nearest named stop (Gentle · Standard · Faster) with the `snappy` spring and a `select` haptic.
- **Safety floor:** dragging past the labelled floor adds rubber-band resistance (0.3×), fires a `bound` haptic once at the crossing, and shifts the floor label's colour to danger over 140 ms. Nothing shakes.
- **Live outcome card:** kcal, kg per week and goal date roll over 220 ms.
- **Reduced:** the snap is instant; colour and haptic stay.
- **API:** Gesture Handler plus Reanimated on native; pointer events plus CSS on web.

### 5.5 Macro bars (and why not rings)

The "Day vs target" panel uses kcal, protein, carbs and fat bars with a target tick.

- **First view:** fills pour in over 480 ms `ink`, staggered 30 ms (4 bars, 90 ms in total), with numbers rolling in sync.
- **Change:** the same bars retarget over 320 ms `standard`, interruptibly.
- **Overflow:** the part beyond the target tick is a separate ochre segment. Colour carries the state, so a tween that crosses the target changes colour exactly at the crossing.
- **Reduced:** bars at their final width, with the numbers washed.
- **API:** `RollingNumber` plus `transform: scaleX` on fill segments, the same code on both platforms.

The existing `GradientRing` and `DualRings` retire from these views (future work: delete them once no screen uses them). The donut in `macro-donut.native.tsx` (expo-skia-charts) can go once bars ship. That is a dependency removal, not motion work, so it belongs in future work.

### 5.6 Check-in verdict reveal

- **Trigger:** Submit.
- **Pending:** nothing for the first 300 ms. After that, the button shows an inline progress line and "Analyzing…". It is truthful: it stops when the response arrives, and there is no minimum display time.
- **What moves:**
  1. The input fields compress into one read-only summary row ("84.5 kg · −0.6 · Adherence: mostly").
  2. The verdict card is revealed by a **cover wipe**: a surface-coloured cover scales `scaleX 1 → 0` from the trailing edge, like a print roller pass.
  3. The tone band lands.
  4. The title fades in.
  5. Up to three reasons stagger in.
  6. The recommended action button and "Next client →" rise into place.
- **Timing:** summary compress 220 ms `standard`; wipe 320 ms `emphasized`; title 140 ms at +120 ms; reasons 30 ms stagger from +200 ms; actions 220 ms with a 4 px rise at +420 ms. Done by about 640 ms.
- **Haptic** when the band lands (about +320 ms): HOLD `success`; REFER_REVIEW `attention`; warning-tone verdicts none (a normal outcome); INSUFFICIENT_DATA none.
- **REFER_REVIEW is different on purpose:** no wipe. The card appears with a firm 220 ms fade and the danger band, because a red flag doesn't get a flourish.
- **Accessibility:** focus moves to the verdict heading. The card is a polite live region. The verdict has its own URL (report), so a refresh shows it static.
- **Reduced:** 120 ms fade of the whole card; focus and haptic unchanged.
- **API:** the cover-scale trick is used on both platforms because it's a transform, unlike animating a clip or a width.
  - _Native:_ Reanimated keyframes (`entering` on the card, a CSS-style animation on the cover).
  - _Web:_ the same component through React Native Web; a CSS animation would be equivalent.

### 5.7 Plan editor

**Grams stepper**

- **Trigger:** − or +.
- **What moves:** the button scales to 0.94 on press and releases with the `snappy` spring. The value rolls over 140 ms `ink`.
- **Long press:** after 400 ms, repeats every 120 ms, accelerating to 60 ms. During auto-repeat the roll is **off** (values update instantly) so motion never lags the finger.
- **Haptics:** `step` per step, throttled; `bound` once at min or max, while the button shows its disabled state.
- **Reduced:** instant value change; haptics stay.
- **API:** `Pressable` plus Reanimated `withSpring`; `RollingNumber`.

**Totals tween**

- **What moves:** the meal kcal, the day totals and the macro bars (§5.5).
- **Timing:** 320 ms `standard`, retargeting from the current value on every step (Reanimated retargets natively; the web shares the code). The "Day vs target" delta chip crossfades tone at its thresholds over 140 ms.
- **Reduced:** instant values plus wash.

**Drift dots** (week rail: one dot per day)

- **States:** olive = within ±5% of target, ochre = drifting, outline = empty.
- **What moves:** when an edit changes a day's class, its dot crossfades colour over 220 ms and pulses once (scale 1 → 1.25 → 1 over 220 ms) to pull the eye to the week view. Once per change.
- **Reduced:** colour only.

**Regenerate meal**

- **Trigger:** "Regenerate meal".
- **While pending:** the meal card's items become skeleton lines with one sheen sweep (a gradient translating across, 1.2 s `linear`). It loops only while the request is pending and stops when offscreen.
- **On arrival:** a 220 ms crossfade. Rows that changed get the 900 ms ochre wash so the coach sees what's new.
- **On failure:** the old items come back with an inline error and **Retry**. Nothing is swallowed (the owner's fail-fast rule).
- **Reduced:** a static skeleton and the text "Regenerating…".
- **API:** native, a Reanimated CSS keyframe on `transform` of the sheen; web, a CSS keyframe.

**Publish success: the focal moment**

- **Trigger:** "Publish v2" in the Review & publish sheet succeeds on the server.
- **Sequence:**
  1. The button shows inline progress and keeps its width.
  2. On success, the sheet dismisses (system sheet on native; side sheet exit on web).
  3. The status pill becomes a **stamp**: "Published v2" lands with scale 1.15 → 0.96 → 1, a rotation of −4° → 0°, and opacity 0 → 1 over the first 30%.
  4. The print grain mask "absorbs" from 60% to 100% ink.
  5. A `success` haptic fires at impact (the 0.96 frame, about 35% in).
  6. The toast reads "Published v2 · Adnan sees it now", with a **View** action.
  7. The versions control updates.
- **Timing:** stamp 520 ms (`stamp`) with keyframes on `ink`; the toast enters at impact.
- **Never:** confetti, sound, or repeats. Once per publish.
- **Reduced:** the pill crossfades over 120 ms; the toast and haptic stay.
- **API:** Reanimated `Keyframe` (layout animation) or a CSS-style `animationName` keyframes object on native; WAAPI or CSS keyframes on web. The grain is a static texture, used as an image or mask.

### 5.8 Intake (five steps)

**Step rail and progress**

- **Desktop:** the rail's current-step indicator glides to the new step with the `soft` spring (web: 320 ms `emphasized`). Completed steps draw a check over 220 ms `ink`.
- **Phone:** the top progress bar fills (`scaleX`, 320 ms `standard`).
- **Step content:** shared axis X. Forward: out 140 ms with 24 px `exit`, in 220 ms with 24 px `emphasized`. Back mirrors it; RTL mirrors it too.
- **Reduced:** 120 ms crossfade, and the bar sets instantly.
- **API:** Reanimated entering and exiting with custom keyframes. Steps live inside one route, so this is not a navigation push.

**Live preview** ("2,261 kcal · goal ~24 Jan 2027")

- **Trigger:** input settles, 250 ms after typing stops. Never per keystroke.
- **What moves:** numbers and date tokens roll over 320 ms `ink`. A safety warning appearing expands over 220 ms (layout transition) in the warning tone. It never shakes.
- **Reduced:** swap plus wash.

**Signature**

- **What moves:** the stroke follows the finger with no smoothing lag. On native, gesture handler plus a Skia path on the UI thread (`signature-pad.native.tsx` exists); on web, pointer events with `getCoalescedEvents()`.
- **Clear:** strokes fade over 140 ms.
- **Accept:** the signature moves into the review document's signature slot (320 ms `standard`), a check draws over 220 ms, and a `success` haptic fires. An onboarded client is a real milestone. Once per intake.
- **Reduced:** the move becomes a crossfade.

### 5.9 Tabs inside the hub

Overview · Progress · Plan · Profile.

- **iOS:** a native segmented control (it animates itself).
- **Android:** M3 tabs with an indicator slide.
- **Web:** one indicator element sliding (`translateX` plus `scaleX`, 220 ms `emphasized`).
- **Content, all platforms:** fades through: old out over 80 ms, then new in over 220 ms. A simultaneous crossfade overlaps two blocks of text and reads as mud (seen in the gallery).
- **No swipe pager on web.**
- **Reduced:** the indicator jumps; content crossfades over 120 ms.

### 5.10 Skeleton → content

- **Rules:**
  - Show the skeleton only if loading passes 300 ms.
  - Once shown, keep it at least 300 ms, so it never flickers.
  - Skeletons match the final layout (`research.md`: structural skeletons), so the swap is a pure crossfade with no travel.
- **Timing:** content in 220 ms `standard`; skeleton out 140 ms.
- **Reduced:** the same crossfade at 120 ms. Opacity is allowed under reduced motion.
- **API:** native `entering={FadeIn.duration(220)}` and `exiting={FadeOut.duration(140)}`; web, `<ViewTransition>` around the Suspense fallback and content (Next guide pattern), with no slide.

### 5.11 Toasts and snackbars

| Platform    | Placement                                                                                                                  | Motion                                                                                                                                              |
| ----------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web desktop | Bottom right                                                                                                               | In: 8 px rise plus fade, 220 ms `emphasized`. Out: fade plus 4 px, 140 ms `exit`. New toasts push older ones up (layout 220 ms). At most 2 visible. |
| Web phone   | Above the bottom bar                                                                                                       | Same; swipe to dismiss (tracks the finger, flies out over 140 ms past 40% or on velocity)                                                           |
| Android     | Material Snackbar, with Undo where an undo exists                                                                          | Same tokens                                                                                                                                         |
| iOS         | In-place confirmation plus haptic (critique §9.5), not a toast. For example, the button briefly reads "Saved ✓" for 1.2 s. | Label crossfade 140 ms                                                                                                                              |

- **Timing out:** auto-dismiss after 4 s, or 6 s with an action. Pause on hover or focus.
- **Accessibility:** `aria-live="polite"`; never steals focus.
- **Reduced:** fades only.

### 5.12 Empty states with the auth illustration

- **What moves:** the textured print illustration crossfades in with its region (§5.10), and that's all. A static picture doesn't animate just because it exists.
- **Optional, only if the illustration is produced as separate colour plates:** a one-time "registration settle" on the very first Today, where the plates start 2 px off-register and settle into register over 600 ms `ink`. That needs extra asset work, so it's listed as future work, not planned here.

### 5.13 Pull-to-refresh

System `RefreshControl` on native, tinted cobalt, with no custom indicator and no haptic. Web has no pull-to-refresh: stale-while-revalidate plus a refresh button. After a refresh, changed values get the wash. Rows never re-stagger.

### 5.14 List reorder

There's no reorder feature in the app today (none found in `features/plan`). The spec below is ready if one ships, for example meal item order.

- **Lift:** long press of 300 ms. The item scales to 1.03 and its shadow layer's opacity goes 0 → 1 over 140 ms. `lift` haptic.
- **Drag:** the item tracks the finger 1:1. Siblings slide to open the gap with the `soft` spring.
- **Drop:** settles into its slot with the `snappy` spring. `drop` haptic.
- **Without dragging:** "Move up" and "Move down" in the row menu, and on web `Alt+↑/↓` with a 220 ms move plus an `aria-live` announcement ("Moved to 2 of 5"). WCAG 2.5.7 requires a non-drag path.
- **Reduced:** no lift scale, and the drop snaps.
- **API:** Gesture Handler (LongPress plus Pan) with Reanimated. Check list-library support first if the list is virtualised.

### 5.15 The WeaveLine motif: where it earns a place

The motif is two braided threads, coach and client. Today it is unused, and it animates on the JS thread.

- **Journey tab (Progress):** the weave becomes the timeline spine under the weight chart, on the **same time axis**. It draws in at the same pace as the chart line above it (600 ms `ink`, together), so the two read as one story.
- **Recolour for direction D:** coach thread cobalt, client thread ochre.
- **Overdue stretches:** the threads run straight and grey over the overdue period. This is the existing `lost-signal` mode, rendered as a **static state**, not an animation. It shows the relationship going slack where check-ins were missed: meaning, not decoration.
- **App launch:** the one-time `splash` draw-in, at most 1.2 s, only while real boot work runs.
- **Retire** the `loading` pulse loop. Loops are banned outside real progress, and skeletons do that job.
- **Not anywhere else:** not empty states, not the stamp, not headers.
- **Reduced:** the weave is drawn static.
- **API:** move it to a Reanimated CSS keyframe on `strokeDashoffset`, the same as the chart.

### 5.16 Press feedback (everywhere)

- **Buttons:** scale 0.97 in 80 ms, release with the `snappy` spring.
- **Android:** `android_ripple` with 12% cobalt. The critique noted there's no ripple today, and Material expects one.
- **iOS rows:** highlight tint in 80 ms.
- **Web:** `:active` scale on buttons, with background colour changes at 140 ms.
- **Reduced:** colour only.

---

## 6. Implementation plan

### 6.1 Libraries and APIs per platform

| Need                                        | Native (iOS and Android)                                                                                                                                                                                                                                                      | Web                                                                                                  |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Navigation transitions                      | Expo Router `Stack` (react-native-screens): push, `formSheet`, `fade`; native tabs                                                                                                                                                                                            | React `<ViewTransition>` plus `Link transitionTypes`, from the React canary bundled with Next 16.4.3 |
| Declarative state transitions and keyframes | **Reanimated 4 CSS-style API**: `transitionProperty`/`transitionDuration` and `animationName` keyframes (in Reanimated 4 since the stable release; the docs mark CSS animations Android, iOS and Web; react-native-svg components can be animated). Available on 4.5.1 today. | The same components through React Native Web, or plain CSS where the component is web-only           |
| Gestures, scroll-linked, retargeting        | Reanimated worklets plus Gesture Handler 2.32                                                                                                                                                                                                                                 | Pointer events; shared Reanimated code where it already runs                                         |
| Enter, exit and layout                      | Reanimated `entering`, `exiting`, `layout` (`LinearTransition`), `Keyframe`                                                                                                                                                                                                   | `<ViewTransition>` for list FLIP and route changes; WAAPI for one-offs                               |
| Shared element                              | Reanimated shared transitions (4.8+, so after the SDK 58 upgrade; Android also needs react-native-screens 4.28+)                                                                                                                                                              | `<ViewTransition name>` pairs                                                                        |
| Charts                                      | Step 1: react-native-svg with Reanimated animated props. Step 2 if measured janky: Skia `Path` with `end`, plus `usePathInterpolation` in a `weight-chart.native.tsx`                                                                                                         | SVG (`research.md`: Skia on web is heavy)                                                            |
| Haptics                                     | `expo-haptics`, the SDK 57-matched version via `npx expo install expo-haptics`                                                                                                                                                                                                | No-op                                                                                                |
| Hover and focus                             | n/a                                                                                                                                                                                                                                                                           | CSS only                                                                                             |
| Reduced motion                              | One `useReducedMotion` hook in `packages/ui` with a live `AccessibilityInfo` listener; Reanimated `ReduceMotion.System` default                                                                                                                                               | The same hook (React Native Web) plus CSS `prefers-reduced-motion` token overrides                   |

**What not to add:**

- **Moti:** the last release was January 2025 (report).
- **The Tamagui animation driver for new work:** it changes packaging in Tamagui 3 (`research.md`). Leave `gymos-sheet-motion.ts` alone until sheets move to native form sheets (native) or are rebuilt on Reanimated (web phone).
- **Any new animation library on web:** CSS, WAAPI and View Transitions cover everything above.

### 6.2 Shared motion package

```
packages/ui/src/motion/
  tokens.ts             durations, easings ([x1,y1,x2,y2]), springs, stagger, distances
  tokens.test.ts        asserts the web CSS variables equal tokens.ts
  use-reduced-motion.ts one hook; replaces the 4 pasted copies
  rolling-number.tsx    digit-column roll (counts, kcal, grams); accessible final value
  draw-path.tsx         stroke draw-in for check marks, chart line, weave
  reveal.tsx            cover wipe (verdict)
  stamp.tsx             the publish stamp
  press-scale.tsx       press feedback (scale on iOS/web, ripple on Android)
packages/platform/src/haptics.ts / haptics.native.ts   semantic haptic(); web no-op
apps/web/app/globals.css  --motion-* variables, view-transition CSS, reduced-motion overrides
```

`StaggerItem` and `FadeIn` get rewritten on Reanimated with the new tokens. Their callers stay the same.

The token file is small:

```ts
export const duration = {
  instant: 80,
  fast: 140,
  base: 220,
  slow: 320,
  draw: 600,
  stamp: 520,
  reducedFade: 120,
} as const;
export const easing = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.3, 0, 0, 1],
  exit: [0.3, 0, 0.8, 0.15],
  ink: [0.16, 1, 0.3, 1],
} as const;
export const spring = {
  snappy: { stiffness: 520, damping: 40, mass: 1 },
  soft: { stiffness: 260, damping: 30, mass: 1 },
} as const;
```

### 6.3 Performance rules

1. **Animate `transform` and `opacity`.** Fills are `scaleX`, wipes are a cover's `scaleX`, rolls are `translateY`. Height and width never animate directly. Use Reanimated layout transitions (native) or View Transitions or FLIP (web) instead.
2. **No React state per frame.** Shared values, CSS-style transitions or CSS only. This fixes `weight-chart.tsx` and `weave-line.tsx`.
3. **No blur, no animated shadows, no animated gradients on Android.** The sheen is a translated static gradient.
4. **Bound the work.** At most two concurrent regions; at most two view-transition names; `will-change` only during animation; loops stop when hidden (`IntersectionObserver` on web, focus and visibility on native).
5. **Measure; don't assume transform means fast.**
   - _Native:_ React Native's Perf Monitor (UI and JS fps), Android "Profile HWUI rendering" bars, Xcode Instruments "Animation Hitches".
   - _Web:_ the Chrome Performance panel with CPU throttling at 4×.
   - Record each measurement with the device name, the build type (release, not dev), and the scenario.
6. **JS-busy test.** Start a heavy JS task during a draw-in. UI-thread animations must keep running.

### 6.4 Testing

| What                        | How                                                                                                                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tokens                      | `tokens.test.ts` (CSS vs TS parity). Haptic mapping test: every semantic event maps on iOS and Android, and web is a no-op.                                                                                       |
| Reduced motion              | iOS Reduce Motion, Android Remove animations, web DevTools emulation. A Playwright context with `reducedMotion: 'reduce'` asserts that nothing is at opacity 0 200 ms after load and that no slide keyframes run. |
| Reduce Transparency         | iOS setting on: scrims opaque, nothing translucent                                                                                                                                                                |
| 120 Hz                      | A real ProMotion iPhone (Simulator can't show it) with the Info.plist key confirmed. Compare against "Limit Frame Rate" on.                                                                                       |
| Low-end Android             | A real device (decision 6), release build, Perf Monitor plus HWUI bars, on every focal and gesture animation                                                                                                      |
| Timing inspection           | iOS Simulator "Slow Animations", Android animator scale 5×, the gallery's 0.25×                                                                                                                                   |
| Web motion capture          | Impeccable `motion-capture` (normal and reduced) on Today, hub and plan editor routes, then the `impeccable-motion-reviewer` agent, at most two rounds (`animate.md`)                                             |
| Interruption                | Tap Replay or Next client during an animation; spam the stepper; switch range mid-morph. The end state must always be correct.                                                                                    |
| Dynamic Type and font scale | Rolling numbers and chips at the largest sizes (column heights follow line height)                                                                                                                                |

### 6.5 Build order

Each step is one small PR off main, per the harness rule, with the README checked.

0. **Prerequisites (separate streams, already proposed in the report):**
   - the native shell bug fixes (N1–N3);
   - the native navigation decision (critique 10, 11);
   - the Expo SDK 58 spike.
1. **Foundation:** `motion/tokens.ts`, `use-reduced-motion.ts` (delete the 4 copies), the web CSS variables plus the reduced-motion overrides replacing the `*` nuke, the haptics wrapper (install `expo-haptics`), and press feedback. Add `CADisableMinimumFrameDurationOnPhone`.
2. **Native navigation motion:** remove `animation: 'none'`, add a native stack per tab and form sheets for task screens. Mostly configuration once decision 10 lands.
3. **Web route transitions:** `<ViewTransition>` page wrappers, `transitionTypes`, the anchored header, then swap the auth slide over to the same mechanism.
4. **Feedback primitives:** `RollingNumber`, toasts, skeleton crossfade.
5. **Today queue:** row complete, counts, chips, first-load stagger.
6. **Charts:** weight chart draw-in on the UI thread, scrub plus haptics, range morph, milestones; then the goal bar and macro bars. Measure on the low-end device here, and take the Skia step only if needed.
7. **Check-in verdict reveal**, including batch "Next client →".
8. **Plan editor:** stepper, totals, drift dots, regenerate, then the publish stamp.
9. **Intake:** step transitions, live preview, signature.
10. **Shared elements** (after SDK 58): Reanimated avatar on native; `<ViewTransition>` avatar and name on web.
11. **Journey weave.**

Work deferred (goes to the README's future work, not code): the colour-plate registration settle, deleting `GradientRing`/`DualRings`/expo-skia-charts once bars ship, the reorder spec until reorder exists, and a zoom transition if a card grid ever appears.

---

## 7. Decisions for Khubaib (recommendation first)

1. **Motion personality and focal moment.**
   - (a) "Pressed, not bounced", with the publish stamp as the single focal moment. _Recommended: it's the product's sign-off act, it's rare, and it's specific to GymOS._
   - (b) Purely functional motion, with no authored moment.
   - (c) Make the chart draw-in the focal moment instead.
2. **Roster → hub on native.**
   - (a) System push now, plus a Reanimated shared avatar after SDK 58. _Recommended: native idiom, works on Android too, no alpha API._
   - (b) `Link.AppleZoom` on iOS. _Alpha; the docs warn against headers and note about 1 s delays with rapid open and close._
   - (c) Push only, forever.
3. **Hub header on iOS.**
   - (a) A native large title (client name) that collapses for free. _Recommended: zero code, 120 Hz, the iOS norm._
   - (b) An inline title, as the critique wrote it, with no collapse.
   - (c) A custom collapsing header. _Not recommended: it rebuilds what the system gives._
4. **Weight chart engine.**
   - (a) Keep react-native-svg plus Reanimated animated props; move native to Skia only if the low-end device drops frames. _Recommended: keeps the tested path math and the smallest change._
   - (b) Native Skia now.
5. **Low-end Android motion.**
   - (a) One motion system; cut only animations that measure badly. _Recommended._
   - (b) A separate "lite motion" tier from day one.
6. **Test device.** Which low-end Android phone? I don't want to assume a model; your pick, or the most common one among your pilot coaches if you know it.
7. **Haptic vocabulary** (§3.6): approve as written, or trim. _Recommended: approve. Nothing buzzes on ordinary taps, and warning-tone verdicts stay silent._
8. **Token additions:** `draw` 600, `stamp` 520, `exit` and `ink` easings, stagger changed to 30 ms × 5. _Recommended: approve. The four base durations and two easings from the report stay unchanged._

Once decided, these go into the design docs (an ADR for decisions 1, 2 and 4 written as `proposed`; spec notes for the rest) in a small docs PR, per the working agreement.

---

## 8. What I did not verify

- **Device performance:** no device measurements. Every performance statement here is design intent until it's measured on the test device.
- **React Native Web:** `isReduceMotionEnabled` on web, and Reanimated CSS transitions on web for `transform` on `Text` stacks. Check in the foundation PR.
- **Solito:** whether its `Link` forwards `transitionTypes`.
- **Expo Router:** `'fitToContents'` sheet detents in the SDK 57 version of Expo Router.
- **Reanimated 4.5.1:** the experimental shared-transition flag exists in 4.2–4.7 per the docs, but I'm not recommending it (wait for 4.8).

---

## 9. Sources

**Repo, local:**

- `packages/ui/src/components/{stagger-item,fade-in,skeleton,weight-chart,weave-line,gradient-ring,dual-rings,metric-hero,gymos-sheet-motion}.tsx/ts`
- `packages/app/src/features/auth/use-auth-panel-slide.ts`
- `packages/app/src/features/check-in/verdict-copy.ts`
- `apps/web/app/globals.css`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app.json`
- `apps/mobile/package.json`
- the installed `next@16.4.3`: `dist/compiled/react` reports version `19.3.0-canary-278794d7-20261002` and exports `ViewTransition`

**Reanimated:**

- [Shared element transitions overview](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview): on by default from 4.8.0, flag in 4.2–4.7, screens 4.28+ on Android, no web, 500 ms default
- [CSS animations: animationName](https://docs.swmansion.com/react-native-reanimated/docs/css-animations/animation-name): Android, iOS, Web; react-native-svg animatable
- [Reanimated 4 stable release](https://swmansion.com/blog/reanimated-4-stable-release-the-future-of-react-native-animations-ba68210c3713): CSS-compatible animations and transitions API
- [withSpring](https://docs.swmansion.com/react-native-reanimated/docs/animations/withSpring): R4 defaults stiffness 900, damping 120, mass 4; `reduceMotion` default `ReduceMotion.System`
- [useReducedMotion](https://docs.swmansion.com/react-native-reanimated/docs/device/useReducedMotion): value at launch, no re-render on change
- Changelogs [4.4.0](https://swmansion.com/changelog/reanimated-4-4-0/), [4.5.0](https://swmansion.com/changelog/reanimated-4-5-0/), [4.6.0](https://swmansion.com/changelog/reanimated-4-6-0/)

**Expo:**

- [Zoom transition](https://docs.expo.dev/router/advanced/zoom-transition/): alpha, iOS 18+, SDK 55+, Stack only, header caveat, about 1 s delay issue
- [Modals and form sheets](https://docs.expo.dev/router/advanced/modals.md): `presentation: 'formSheet'`, `sheetAllowedDetents`, `sheetGrabberVisible`
- [Web modals](https://docs.expo.dev/router/advanced/web-modals.md): detents apply under 768 px on web
- [React Native Screens 4.0](https://swmansion.com/blog/introducing-react-native-screens-4-0-0-1b833ff98a55): Android limited to 3 detents
- [Native tabs, SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/native-tabs.md) and [SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/router/native-tabs.md): `unstable-native-tabs` through SDK 57
- [Haptics, SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/haptics.md): functions, enums, `AndroidHaptics` list, iOS Low Power Mode note
- [Android HapticFeedbackConstants](https://developer.android.com/reference/android/view/HapticFeedbackConstants): CONFIRM and REJECT API 30, SEGMENT_TICK API 34

**React Native:**

- [AccessibilityInfo](https://reactnative.dev/docs/accessibilityinfo): `isReduceTransparencyEnabled` and `reduceTransparencyChanged` are iOS-only; `isReduceMotionEnabled` is true with the Android transition scale off

**Skia:**

- [Path](https://shopify.github.io/react-native-skia/docs/shapes/path): `start`/`end` trim in [0, 1]
- [Animations with Reanimated](https://shopify.github.io/react-native-skia/docs/animations/animations): shared values passed directly as props

**Web:**

- [Next.js: Designing view transitions](https://nextjs.org/docs/app/guides/view-transitions) (updated 2026-11-18): no configuration, React 19.3 `ViewTransition`, `transitionTypes`, popstate not animated, pointer-events, reduced motion
- [web.dev: same-document view transitions Baseline](https://web.dev/blog/same-document-view-transitions-are-now-baseline-newly-available): Chrome and Edge 125, Safari 18, Firefox 144 (no types)
- [Chrome: view transitions in 2025](https://developer.chrome.com/blog/view-transitions-in-2025): Safari 18.4 for the fuller feature set

**iOS 120 Hz:**

- [MacRumors](https://www.macrumors.com/2021/09/24/apple-promotion-third-party-app-support) and [iMore](https://imore.com/apple-clears-120hz-iphone-13-pro-confusion-developers): `CADisableMinimumFrameDurationOnPhone`
- [Apple Developer Forums thread](https://www.developer.apple.com/forums/thread/792011)

**Guidelines:**

- Impeccable 4.9.2 `reference/animate.md`, `delight.md`, `overdrive.md`, `craft-floor.md`, `ios.md`, `android.md`
- UI UX Pro Max `references/quick-reference.md` §7 Animation, §8 Forms & Feedback, and the chart rules
