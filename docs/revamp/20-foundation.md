# Phase 2: foundation

Shared layers every screen builds on. Owned paths are in [README §6](README.md#6-file-ownership-and-change-lanes-conflict-prevention); a task never edits outside them. Each task also meets the global definition of done ([README §8](README.md#8-global-definition-of-done-every-task)).

Order: F1 first. Then F2, F3, F4 and F8 in parallel. F5 after F2–F4, F9 after F2 and F4, F6 after F5 and the F7.1 and F7.2 slices, F10 after F6 and F7.3. F7 runs from U2 onwards, one slice per PR.

"Install" lines name the only packages a task may add. Under rulings O5 the run allows those with a confirmation; any other dependency stops the builder, and the parent takes it to the owner.

---

## F1: Tokens, themes and runtime tenant theming

- **Goal:** one generated Floodlight token source for web and native, with the Sunflower brand derived at runtime from one hex per tenant.
- **Depends on:** U4.
- **Evidence:** ADR-0019; [`reference/tokens.md`](reference/tokens.md) §2, §4.3, §5.2, §6.3–6.4, §11; [`reference/tokens.floodlight.json`](reference/tokens.floodlight.json).
- **Also owns:** `packages/platform/src/theme-mode*` (follow system, three states) and the provider files the runtime theme needs: `packages/app/src/provider/**`, `apps/web/components/next-tamagui-provider*`, and the theme part of `apps/mobile/src/mobile-providers.tsx`. F2 edits the font part of that file after F1 merges.
- **Requirements:**
  1. **Three layers:**
     - Primitives in `tokens.color`.
     - Semantic keys per theme (`bg`, `fg`, `border`, `action`, `focus`, `status.*`, `accent.*`, `viz.*`, `scrim`, `glass.*`), flattened for Tamagui (`$bgCanvas`, `$statusDangerWashText`).
     - Component tokens. `tabBar.itemSelected` uses the wash-text tone on the wash pill, because the brand text on the wash is under 4.5:1 (F3's approved mock, O52).

     Values come from `tokens.floodlight.json`. No hand-typed hex outside the generated module.

  2. **Themes:**
     - `light` and `dark`.
     - `light_glass` and `dark_glass` sub-themes that override only `chromeBg`, `chromeBorder` and `sheetBg`.
     - Drop `light_client` and `dark_client` (T9).
     - Keep a `legacyAliases` block (old name → new name, `tokens.md` §2.2) for the length of the track; Q5 deletes it.
  3. **Theme mode:** follow the system by default; the stored override is System, Light or Dark (S11 builds the control). Dark is the reference design. Both modes pass the contrast test below.
  4. **Runtime tenant brand** (`tokens.md` §2.4, steps 1–8):
     - `deriveBrandTheme(hex)` returns action fill, on-colour, hover and pressed, text-safe per mode, wash and wash text per mode, the border flag and the collision report.
     - An invalid hex throws at the manifest boundary.
     - The red-brand policy (T5) switches actions to inverse neutrals.
     - Apply it at runtime: verify Tamagui 3's runtime theme API, or use CSS variables on web. Record which one, with a working spike, in the PR.
  5. **Guardrails** enforced in code and tested: a tenant cannot set `bg`, `fg`, `border`, `status`, `accent`, `viz`, `glass` or `scrim`.
  6. **Sunflower:**
     - `infra/tenants/pilot.json` brand changes from `#1D4ED8` to `#FACC15` (CODEOWNERS: owner review).
     - The GymOS default brand is also `#FACC15`.
     - A test asserts the derived values in ADR-0019: fill `#FACC15`, ink label at least 11:1, light text-safe at least 4.5:1, wash, border required on light. If the generated hex differs from the ADR, update the ADR in the same PR.
  7. **Rule D1:**
     - No semantic UI token resolves to a volt step; volt appears only under `viz.*`. The approved token sheet (rulings O52) drops the `accent.volt.*` keys, and the milestone highlight uses `accent.aqua.*`.
     - Warning fills use amber step 500 or darker. Approved (O52): `status.warning.solid` is amber.500 in both modes, with a 1px `status.warning.border` on light surfaces. The light warning wash stays amber.100: it is a pale wash under an icon and a word, not a fill.
     - A test fails on violations.
  8. **Elevation tokens:** light uses border plus soft shadow; dark uses surface steps and no shadows; iOS uses no card shadows (fixes N9 when F5 applies them).
  9. **Bundle:** import only the themes in use; `@tamagui/themes` (75 KB web) leaves the bundle if it's no longer needed.
  10. **Width ranges (rulings O8):** add tablet and desktop ranges to `packages/ui/src/breakpoints.ts` and the Tamagui media config, next to the existing `md` (kept until screens stop using it; Q5 removes it if unused). Approved with the token sheet (O52): phone below 744 px, tablet 744–1199 px, desktop 1200 px and up, so the iPad mini in portrait (744 pt) and the 11-inch iPad in landscape (1194 pt) both land in the tablet range. The owner approved these edges knowing their effects: web at 768–1199 px moves from today's desktop layout (`md` starts at 768 px today) to the tablet one, and the 12.9- and 13-inch iPads in landscape (1366 pt) get the desktop layout. The iPad Pro 11-inch (M4) in landscape (1210 pt) and a 1280 dp Android tablet in landscape get the desktop layout too.
  11. **Reference doc:** replace `docs/design-system-reference.md` with the Floodlight reference: layers, semantic table, usage rules (D1, glass where and where not, status never by colour alone), and how to add a tenant.
- **Mock:** token sheet. Scales; semantic swatches light and dark with contrast ratios; Sunflower action states; status chips; viz palette; one glass sample; the width ranges. Owner approves. Follow-up (rulings O53): the sheet adds the control-border pairs on raised and glass surfaces, and proposes a lighter border step for dark, where today's `border.control` is under 3:1 on `bg.raised`. The owner approves that line.
- **Done when:**
  - The global conditions hold.
  - A contrast test computes every text and background pair in `tokens.md` §6.3–6.4 for light and dark: body text at least 4.5:1; placeholders at least 4.5:1; large text and graphics at least 3:1; dark cards distinguishable from the canvas by surface step.
  - The `deriveBrandTheme` tests cover the sample tenants in `tokens.md` §2.4 (pilot, rose, sunflower, green, teal, blush, black, orange).
  - Screens still render through the legacy aliases (screenshot spot check of Home, hub and plan editor on web and iOS).
- **Reviewer focus:** hand-typed colours, tenant overrides leaking into reserved tokens, a missing throw on an invalid hex, theme mode not following the system.

## F2: Typography, RTL readiness and formatters

- **Goal:** one type system on every platform, layouts ready for right-to-left, and one formatter per fact so dates, units, adherence and status read the same everywhere.
- **Depends on:** F1.
- **Evidence:** `tokens.md` §10; critique §6 (RTL, locale), bugs 3, 4, 7, 13, 16 and 18, N7 and N8.
- **Install:** Archivo static instances (width 112 and 125, weight 700) for native, Noto Nastaliq Urdu, Noto Naskh Arabic. Inter is already present.
- **Requirements:**
  1. **Faces:**
     - Inter: UI and numbers, with tabular figures on every number.
     - Archivo expanded: display and hero numbers.
     - Noto Nastaliq Urdu: Urdu reading and headings.
     - Noto Naskh Arabic: dense Urdu UI.
     - Roboto Mono is removed (T8).
     - The Urdu fonts load only when the Urdu locale is active, so English users pay no bundle cost (web `unicode-range`; native on-demand load).
  2. **Scale:** the role scale in `tokens.md` §10.3, per platform: web desktop and phone, iOS text styles with Dynamic Type, Android sp. Phone web inputs are 16 px, so iOS Safari doesn't zoom. Per-locale line height: Nastaliq reading 2.0×, headings 1.8×, Naskh UI 1.6×, chips 1.5×.
  3. **Font gate (N8):** the first native screen renders in Inter. The splash holds until fonts load; a font load failure is logged and visible, not silent.
  4. **Label fit (N7):** text components never break mid-word. Controls that can't fit a label on one line at the default size switch layout (F5 handles segmented controls).
  5. **RTL-ready:**
     - `<html lang dir>` on web, from the locale.
     - A lint rule in `eslint.config.mjs` (F2 owns that edit) bans physical direction props in `packages/app` and `packages/ui`: `marginLeft`/`Right`, `paddingLeft`/`Right`, `left`, `right`, `borderLeft*`/`borderRight*` and the corner radii. `textAlign` values are outside the rule (one `textAlign="right"` exists in `nutrition-criteria/criteria-row.tsx:39`); Q3's RTL smoke checks text alignment.
     - Convert the existing uses: 36 in 15 files, measured on 2026-11-23 (`pace-slider.tsx` 10; `weight-chart-layout.ts` 4; `app-shell.tsx` 4; 2 each in `weight-chart.tsx`, `notification-row.tsx`, `gymos-sheet.tsx`, `form-field.tsx`, `client-hub-more-menu.tsx` and `auth-hero-column.tsx`; 1 each in `pace-slider-math.ts`, `vitals-entry-skeleton.tsx`, `client-journey-map.tsx`, `client-hub-skeleton.tsx`, `check-in-detail-skeleton.tsx` and `auth-form-column.tsx`). Re-count at the start; the PR lists every file.
     - **One-time ownership exception:** F2 may edit those files, and only their direction props. No other task is active in them while F2 runs (F3, F4 and F8 own none of them), and their later owners (F5, F6, F9, F10, S01, S04, S05, S07, S09) start after F2 merges.
     - Directional icons get a mirror flag, which F5 applies.
     - Digits stay Western (T7).
  6. **Formatters** in `packages/app/src/lib/format/` (new), with hoisted `Intl` instances and locale en-PK:
     - **Dates.**
       - Formats: "6 Aug", "Thu 30 Jul", "6 Aug · 109 d ago", "10:48 pm" and relative time.
       - Date-only values (`YYYY-MM-DD`) are calendar dates with no time-zone shift (bug 4).
       - No ISO dates and no `toLocaleString()` defaults in the UI (bug 18).
     - **Units.**
       - Weight kg or lb, height cm or ft-in, circumference cm or in, from the coach's preferences (`unit-prefs.ts`).
       - Storage stays metric. The formatter takes the stored metric value and the preference.
     - **Adherence:** the engine's 1–5 in words: Off plan · A few days · About half · Most days · Every day. Never a percentage or "/10" (bug 3, A8).
     - **Phone.**
       - International display through libphonenumber-js "min" metadata (perf: 148 KB web).
       - An unparseable number shows raw with a visible "Check number" note and a log line, not a silent fallback (bug 16).
     - **Status words.** One exhaustive mapping from every engine enum to label, icon and tone: client status, check-in verdict, plan status, notification kind. Unknown values throw.
       - Examples: "Check-in 109 d overdue", "Not enough data yet", "On track", "Draft v2", "Needs review".
       - A client with no weigh-ins since the start reads "No weigh-ins since 6 Aug", not "Needs focus" (bug 13).
     - **Pace.** One label source for a goal's pace (Gentle · Standard · Faster · Custom) and its kg/week display, built on `lib/goal-pace.ts` and `lib/pace-control.ts`. The goal form, the Plan tab, intake and Tools all read it. Find why one client reads "Custom pace" on the goal form and "Standard · 0.51 kg/wk" on the Plan tab (bug 9) and fix the cause here; S09 and S06 switch their screens to this formatter.
- **Mock:** type sheet. Scale on web, iOS and Android; Latin and Urdu samples with line heights; tabular numbers; label-fit examples at large Dynamic Type.
- **Done when:**
  - The global conditions hold.
  - Formatter unit tests run under `TZ=Asia/Karachi` and `TZ=UTC`, with exhaustive enum tests.
  - A pace test: the bug-9 client's goal gives the same label from every entry point.
  - The physical-props lint passes with zero exceptions for the props it covers.
  - The iOS login screenshot shows Inter.
  - Font files are not in the English web bundle (bundle report).
- **Reviewer focus:** any new `toLocaleString`/ISO display, units still hard-coded, percent adherence, enum text reaching the UI, a time-zone shift on date-only values.

## F3: Glass chrome

- **Goal:** chrome-only glass on iOS, web and Android with honest fallbacks (R2).
- **Depends on:** F1.
- **Evidence:** ADR-0019 §6; `tokens.md` §9.
- **Install:** `expo-blur`, `expo-glass-effect` (SDK 58 versions via `npx expo install`).
- **Requirements:**
  1. **`GlassSurface` and `GlassTarget`:**
     - **iOS:** system materials through `expo-blur`; `GlassView` from `expo-glass-effect` on iOS 26 when `isLiquidGlassAvailable()`.
     - **Web:** `backdrop-filter` plus `-webkit-backdrop-filter`, the noise texture, and an `@supports not (backdrop-filter: blur(1px))` rule that switches to the solid fallback.
     - **Android:** API 31 and up uses blur with `BlurTargetView` (`dimezisBlurViewSdk31Plus`); below API 31 uses the solid `glass.fallback`, never an unblurred tint.
  2. **Allowed surfaces:** top bar, tab bar, sticky client header, sheets, command-palette scrim. Never on tables, lists, forms, data cards or status chips; chips inside glass sit on an opaque pill.
  3. **Budget:** at most two glass layers per viewport; blur at most 20 px on phones; never on a scrolling list.
  4. **Accessibility:**
     - Reduce Transparency (iOS, with a live listener) switches to solid.
     - So do `prefers-reduced-transparency`, `prefers-contrast: more`, iOS darker system colours and Android high text contrast.
     - So does the "Solid bars" preference, stored through `packages/platform` storage; S11 builds the toggle.
     - Focus rings on glass get a 2 px surface halo.
- **Mock:** glass sample sheet. Top bar, tab bar, sticky header and a sheet over busy content; light and dark; each fallback.
- **Done when:**
  - The global conditions hold.
  - A legibility test computes worst-case contrast at the token alphas over the `tokens.md` §9.3 backdrops: chrome `fg.primary` at least 7:1, sheet text at least 4.5:1.
  - Playwright screenshots exist with `backdrop-filter` disabled and with reduced transparency emulated.
  - iOS screenshots exist with Reduce Transparency on and off.
  - Android API 31+ and below-31 screenshots are added when the owner runs the kit (the Android checklist, #139).
  - The Android baseline-device (Pixel 6, rulings O11) pass is a release gate in Q4, not a merge gate.
- **Reviewer focus:** glass on content surfaces, secondary text on chrome glass, a missing fallback path.

## F4: Motion package, haptics and feedback primitives

- **Goal:** the "Pressed, not bounced" motion system as tokens and primitives, one reduced-motion path, and the semantic haptic wrapper.
- **Depends on:** F1.
- **Evidence:** ADR-0020; [`reference/motion.md`](reference/motion.md) §1–§3 and §6.
- **Install:** `expo-haptics` (SDK 58 version).
- **Requirements:**
  1. **`packages/ui/src/motion/tokens.ts`:**
     - Durations: `instant` 80, `fast` 140, `base` 220, `slow` 320, `draw` 600, `stamp` 520, `reducedFade` 120 (names and uses in `motion.md` §3.1).
     - Easings: standard, emphasized, exit, ink, linear.
     - Springs: `snappy` and `soft`, with explicit `mass`.
     - Stagger 30 ms × 5; distances `nudge` 2, `rise` 8, `shift` 24, `travel` 32; press scale 0.97 for buttons and 0.98 for cards.

     These are mirrored as `--motion-*` CSS variables in `apps/web/app/globals.css`, with a parity test.

  2. **Reduced motion:**
     - `use-reduced-motion.ts` keeps a live `AccessibilityInfo` listener, because Reanimated's hook reads the setting at launch only.
     - Replace the copies in files this task owns. List the remaining copies in the PR; their owners (F9, S01) remove them.
     - Web: replace the global `*` 0.01 ms rule with per-token overrides.
  3. **Primitives:**
     - `rolling-number` (accessible final value), `draw-path`, `reveal`, `stamp`.
     - `press-scale`: scale on iOS and web, ripple on Android.
     - Rewrite `fade-in` and `stagger-item` on Reanimated; callers stay unchanged.
     - Skeleton crossfades to content.
     - `gymos-toast`: toast and snackbar with Undo. Bottom-right on desktop, above the tab bar on phone, snackbar on Android.
  4. **Reduced-motion highlight:** propose the "this changed" wash colour in the demo. Not volt (D1) and not the brand; owner approves.
  5. **Haptics:** `haptic('select' | 'step' | 'bound' | 'success' | 'attention' | 'error' | 'lift' | 'drop')` in `packages/platform`, mapped per `motion.md` §3.6. Web is a no-op. Never on taps, navigation, tabs, scrolling, toasts or sheets.
  6. **120 Hz on iPhone:** `CADisableMinimumFrameDurationOnPhone` in `app.json`.
  7. **Not used:** no Moti, and no Tamagui animation driver for new work.
- **Mock:** motion demo. Screen recordings (iOS simulator and web) of each primitive in normal and reduced motion. Owner approves before any caller adopts them.
- **Done when:**
  - The global conditions hold.
  - The token parity test and the haptic mapping test pass.
  - A Playwright reduced-motion test passes: nothing at opacity 0 200 ms after load, and no slide keyframes.
  - Interruption tests pass for `rolling-number`.
  - A native JS-busy check is recorded: a draw-in keeps running during heavy JS work.
- **Reviewer focus:** React state updated per frame, animated width or height, haptics on ordinary taps, reduced motion that only shortens a slide.

## F5: Component kit

- **Goal:** rebuild `packages/ui` components on Floodlight tokens, the type system, glass and motion, with the accessibility floor built in.
- **Depends on:** F2, F3, F4.
- **Evidence:** critique §3 (per-screen ideals), §6, §9.5 (platform differences); `research.md` §2.
- **Install:** none expected. **Remove:** `react-native-ui-datepicker`, which pulls dayjs, tailwind-merge and lodash (about 113 KB web).
- **Components:**

  | Component          | Requirements                                                                                                                                                                                                |
  | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Buttons            | Primary uses the Sunflower fill, ink label and a 1px border on light surfaces. Secondary, ghost and destructive variants. Sizes. A loading state. Never pre-disabled (show what to fix instead).            |
  | Form field         | Visible label; error and helper text; unit suffix placed with logical properties; 16 px on phone; placeholder contrast from F1.                                                                             |
  | Segmented control  | Unmistakable selected state; selected looks raised in dark mode, not recessed (N11). On native it becomes a list or menu picker when there are 4–5 options or a label doesn't fit (N7).                     |
  | Chips              | Filter chips. Status chips with icon plus word. Checkbox chips with fill, check icon, bold label and `aria-pressed`/`aria-checked`, because colour alone is never the selection signal (critique, dietary). |
  | Card               | Surface steps in dark mode; no card shadows on iOS (N9).                                                                                                                                                    |
  | Banner             | At most a 1px rail, with text that meets AA.                                                                                                                                                                |
  | Rows               | Queue row (64 px desktop, 72 px phone; avatar, title, reason line, trailing action, whole row a link); list row with chevron; notification row.                                                             |
  | Data table (web)   | Sticky header; sortable with `aria-sort`; built so S03 can virtualise it; static styles.                                                                                                                    |
  | Sheets and dialogs | Web side sheet (480 px) and bottom sheet; confirm dialog. Native task sheets come from F10.                                                                                                                 |
  | Menus              | Popover on desktop, bottom sheet on phone web, system context menu on iOS, dropdown on Android.                                                                                                             |
  | Stepper            | Grams ±10 with a typed value allowed; `step` and `bound` haptics.                                                                                                                                           |
  | Date field         | Platform date input on web, native picker on mobile.                                                                                                                                                        |
  | Phone field        | Moved from `client-onboarding`.                                                                                                                                                                             |
  | Height field       | Moved from `packages/app/src/features/height-fields.tsx` (used by intake and the Tools calculators); unit-aware through F2.                                                                                 |
  | Signature pad      | Moved from `client-onboarding`; large, with Clear.                                                                                                                                                          |
  | Avatar             | Initials; colour from a fixed set keyed by client id, never the brand.                                                                                                                                      |
  | Icon               | Project icon set (U4) with a mirror-in-RTL flag.                                                                                                                                                            |
  | Switch             | iOS switch on iOS, Material switch on Android and web.                                                                                                                                                      |
  | Pace slider        | Labelled stops (Gentle · Standard · Faster) and a labelled floor marker; `select` and `bound` haptics.                                                                                                      |
  | States             | Empty state with an F8 illustration slot; error with retry (`role="alert"`); loading (`role="status"`).                                                                                                     |

- **Kit-wide requirements:**
  - On web, `accessibilityLabel` and `accessibilityRole` reach the DOM as `aria-label` and `role` (bug 19).
  - 44 pt targets; visible 2 px focus ring.
  - List and row components use static styles, so Tamagui doesn't resolve styles per row at runtime (perf). Check whether the optimizing compiler runs under Turbopack after U4, and record the result.
- **Mock:** kit sheet. Every component in every state, light and dark, web 1440 and 390, iOS and Android chrome variants. Owner approves.
- **Done when:**
  - The global conditions hold.
  - Every component has render, role and label tests and state tests.
  - A web test renders the kit with React's console watched: no unknown-prop warnings.
  - The roster CPU profile is recorded before and after on the 170-client synthetic data (Q0 harness), and `@tamagui/web`'s share of roster script time is below the 55% baseline. The screen budget itself is enforced in S03.
  - The date picker dependency is gone from the bundle.
- **Reviewer focus:** pre-disabled buttons, colour-only states, physical props, missing web ARIA mapping, per-render style objects in rows.

## F6: Navigation shells

- **Goal:** the Today · Clients · Tools · Account IA (A6) as a real native app on iOS and Android, and a fast, keyboard-friendly web shell. Screens stay shared; only the shell splits (ADR-0020).
- **Depends on:** F5; F7.1 (the bell reads the pulse) and F7.2 (`⌘K` client search); the B4 pathname façade.
- **Evidence:** critique §4, §9.1, §9.3 (N1, N3, N4, N10, N12) and §9.5; `motion.md` §4.
- **Install:** none expected. The native tabs and stacks ship with Expo Router. If phones can only be held in portrait by a runtime lock (item 6), `expo-screen-orientation` (rulings O5).
- **Requirements:**
  1. **Web desktop:**
     - Sidebar with Today, Clients and Tools; Account in the footer with the coach's avatar.
     - Glass top bar with the `⌘K` command palette (client search; actions such as "Check-in Adnan" and "New client") and `/` to focus search.
     - A bell with the unread count opening the inbox (S12).
     - Breadcrumbs ("Clients / Adnan / Check-in") and a skip link.
  2. **Web phone:** bottom bar with 4 items (glass) and safe-area insets when installed. The bell sits in the Today header.
  3. **Web transitions:** React `<ViewTransition>` route crossfade or slide per `motion.md` §4.2, degrading to none.
  4. **Native:**
     - Expo Router native tabs (Today, Clients, Tools, Account) with SF Symbols on iOS and Material icons on Android, and one native stack per tab.
     - Verify the native-tabs API is stable in SDK 58 before relying on it. If not, use JS tabs over native stacks, and record which one in the PR.
     - Large titles that collapse.
     - All four safe-area insets, plus IME insets on Android.
     - Remove `animation: 'none'`, `headerShown: false` and the `<Slot />` groups, so pushes, pops and edge-swipe back work.
     - Android predictive Back (`predictiveBackGestureEnabled`) and correct system Back from deep screens.
     - Remove B4's interim safe-area padding on the shell's content column. It shows the shell background as a thin band below task-screen footers and above the client hub header (rulings O18). Native headers and footers own their insets.
  5. **Routes:**
     - Move mobile routes into the per-tab stacks, keeping each route file's content (screens edit them later).
     - Alerts leaves primary navigation; `/notifications` stays reachable from the bell.
     - Settings is labelled Account; the URL `/settings` stays.
     - Every existing URL still resolves (redirects where needed).
  6. **Orientation and tablets (rulings O8):**
     - Phones stay portrait. iPad and Android tablets rotate between portrait and landscape.
     - Keep `supportsTablet: true`. Verify in SDK 58 whether config alone can lock phones and free tablets; if it can't, lock phones at runtime with `expo-screen-orientation`. Record which, in the PR.
     - Tablet shells, chosen by the F1 tablet width range: the mock proposes the navigation for tablet portrait and landscape (for example tabs in portrait and a sidebar in landscape).
     - Rotating keeps the route, scroll position and form input.
  7. **Remove Solito's pathname from the native shell** (use the B4 façade or the router).
- **Mock:** shells on web 1440 and 390, iOS and Android (Material), and tablet in portrait and landscape, light and dark, with the correct active tab.
- **Done when:**
  - The global conditions hold.
  - Navigation config tests pass (items, active state per path).
  - A route-map test proves every pre-revamp URL resolves.
  - The Playwright login smoke passes.
  - iOS screenshots show each tab root and a pushed screen with its back button.
  - iPad simulator screenshots show the tablet shell in portrait and landscape, and a test proves the shell switches at the tablet range's edges.
  - Rotating an iPad on a form keeps the typed input (screen recording).
  - A screen recording shows edge-swipe back.
  - iOS screenshots show no band of shell colour below task-screen footers or above the client hub header (O18).
  - Android evidence is added when the owner runs the kit.
- **Reviewer focus:** `Platform.OS` in `packages/app`, task routes showing the tab bar, a lost deep link, haptics on navigation.

## F7: Data lane

The parent owns this lane. Each slice is its own small PR (`feature/data-<slice>`) against `apps/api`, `packages/modules`, `packages/contracts`, `packages/app/src/api` and `apps/web/lib/prefetch-*`. Screens consume merged contracts and never edit them.

**Every slice:**

- Routes registered in `apps/api/src/routes/`, never appended to `app.ts`.
- The committed OpenAPI spec updated (CI drift check).
- Contract tests, plus an authorization negative test (another coach's client returns 404 or 403).
- Luxon only in `packages/modules`, never `new Date()`.
- Read the existing module functions first, and reuse rather than duplicate.
- Any change under `packages/core` needs the owner's review (CODEOWNERS).
- **Additive only.** A slice adds endpoints or optional fields and never removes or changes a shape that live screens still read (today's roster, Home, `prefetch-coach.ts` and the shell read `/v1/clients`, the due check-ins and the unread count). Once the last consumer has migrated, the parent removes the old shape in its own `feature/data-` PR. Q5 lists any old shape still left. **One exception:** F7.8 makes check-in fields required (rulings O9).
- **B tasks first.** B2 (publish handler) and B6 (notification serializer and contract) edit files in this lane. A slice that touches the same file waits for that B task to merge, or rebases on it.
- **Call sites belong to the screen.** A slice delivers hooks and prefetch helpers. The task that owns a route file wires them in, after the slice merges:
  - F6: `(coach)/layout.tsx` (the bell and palette data);
  - F10: `clients/[clientId]/layout.tsx` (the client record for the header);
  - S02: Today; S03: Clients; S04–S06: the hub tab routes.
- **Public config.** F7.3 caches `/v1/config/public` at the API (ETag and `Cache-Control`). If it is also inlined into the HTML, F6 wires that in `apps/web/app/layout.tsx`.

| Slice                                            | What                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | For                                                                                                                                                                                                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **F7.1 Today queue and pulse**                   | `GET /v1/today` returns the grouped queue and the counts from one source: red flags, plans blocked (NEEDS_REVIEW), overdue (sorted by days), due today, drafts awaiting publish, and intake drafts once F7.9 lands. Each item carries a reason in data (kind, days overdue, last weight date) for the UI to phrase. `GET /v1/pulse` returns the unread count, the Today counts and an ETag; it answers `304` to `If-None-Match`. The client hook polls with backoff (30 s active, 2 min idle, paused in background) and invalidates queries when the ETag changes. Consumers (F6 bell, S02, S12) switch to it and drop the old pollers; the old endpoints stay (additive rule). Scope (rulings O35): the queue, the pulse counts and the Attention counts default to the signed-in coach's own clients; `scope=mine                                                                                                                                                                                                                                                                                                                                                                                                                                                               | all`, through one shared resolver that F7.2 and the coach-scope fix (O33) reuse. It defaults to mine with a coach profile and to all for an admin or outlet manager without one; a COACH-only coach never widens; the counts use the same selector. | S02, S12, F6 bell |
| **F7.2 Roster v2**                               | Keyset pagination (50 per page), server-side search, status filter and sort. Row fields: status reason (same rule as F7.1), last check-in date, next due date, current weight and change since start (metric), plan status and version, last adherence (1–5). Today's `/v1/clients` shape stays until S03 and F6 have moved off it. It takes the same scope as F7.1 (O35), so the roster's counts match Today's.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | S03, F6 palette search                                                                                                                                                                                                                              |
| **F7.3 Prefetch and public config**              | Server prefetch helpers for the hub, Progress, Plan and Profile routes in the pattern of `apps/web/lib/prefetch-coach.ts`; S04, S05 and S06 call them from their route files. `/v1/config/public` served with the HTML or cached (ETag and `Cache-Control`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | S04, S05, S06                                                                                                                                                                                                                                       |
| **F7.4 Progress series**                         | Check-ins with weight, change and adherence on one time axis with vitals and plan events. Date-only fields cross the API as `YYYY-MM-DD`. Find the cause of the one-day shift between History and Journey (bug 4), fix it at its source, and test it. A measurement date on vitals entries so a reading can be back-dated, if the contract lacks one.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | S05, S09                                                                                                                                                                                                                                            |
| **F7.5 Plan versions and review data**           | All versions with status (live, draft, needs review, superseded); per-day drift against target; the allergen check result before and after solving (FR-C7); enough data for a diff against the live version (or proof that the client can compute it from two payloads); discarding a draft, if no endpoint exists. Generate on an empty draft replaces that draft instead of leaving a second empty DRAFT (rulings O17). Per-day drift counts a day with no items as off target, so publish needs the acknowledgement for it; the server enforces this, with a negative test (O17). The plan's meal pattern (the generation's `mealCount`) on `PlanSummary`, so the editor and `regenerateMeal` stop inferring it (found in B2).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | S06                                                                                                                                                                                                                                                 |
| **F7.6 Dietary impact preview**                  | A dry run of a dietary profile change that reports which live plans would flip to NEEDS_REVIEW, without writing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | S09                                                                                                                                                                                                                                                 |
| **F7.7 Signature later**                         | A "collect signature" endpoint for an existing unsigned client that stores the signed intake exactly as onboarding does. Not blocked.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | S04                                                                                                                                                                                                                                                 |
| **F7.8 Check-in validation and verdict reasons** | Rulings O9: `vitals` with `vitals.weightKg`, and `adherenceRating`, become required in `completeCheckInBody` (`apps/api/src/schemas.ts:166`, used by `POST /v1/clients/{clientId}/check-ins` and `PATCH /v1/check-ins/{id}`) and in the module's `CompleteCheckInInput`. A missing one returns 422 whose title is a sentence ("Enter today's weight and the week's adherence"): the pre-revamp form prints `code: title` (`ApiError`, `packages/contracts/src/client.ts:22`) until S07 lands, and the default validation hook (`apps/api/src/app.ts:101`) would only say "Request validation failed", so use a route-level hook or an explicit check. Add a 422 test for each missing field; update `checkins.test.ts:58`, which calls `updateAndRerunCheckIn` with adherence only; regenerate the OpenAPI spec and the client types. Accepted gap: the native app isn't published (its EAS project id is a placeholder), so no old builds post check-ins; the deployed web form shows the 422 message until S07. This is the one slice that changes a live shape. Verdict reasons cross as structured data (code plus parameters) so the UI phrases them, fixing "have 3 over 0.04" (bug 8). If the reason text comes from `packages/core`, the change needs the owner's review. | S07                                                                                                                                                                                                                                                 |
| **F7.9 Intake drafts**                           | Rulings O7: server-side draft save, resume, list and discard, scoped to the coach, deleted on create or after 30 days.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | S08, S02 (via F7.1)                                                                                                                                                                                                                                 |

- **Done when (per slice):** the global conditions hold, plus the tests above; the API p50 stays in the baseline range on the synthetic data (Q0 harness); for F7.2, the roster response size at 170 clients is recorded before and after.

## F8: Illustrations and images

- **Goal:** lighter images, and one illustration slot per use, filled with interim art until L1 redraws it after the track (rulings O6).
- **Depends on:** F1.
- **Requirements:**
  1. Export an auth hero component from `packages/ui/src/illustrations/` that shows the current art (`apps/web/public/auth/hero.jpg`) at sized AVIF and WebP (item 3).
  2. Export an empty-state illustration component per slot, each showing interim art (a kit icon on a token-tinted disc, light and dark). The slots:
     - First run (no clients)
     - No search matches
     - No plan yet
     - Inbox clear
     - 404
     - Generic error
  3. Prefer theme-aware SVG. Where raster is needed, deliver AVIF or WebP at responsive sizes for web and optimised PNG for native. F8 ships the sized variants as files (for the login hero, 435 KB today: AVIF and WebP at the widths S01's layout uses, under `apps/web/public/auth/`). The screen that shows an image chooses where: S01 replaces the image at `auth-hero-column.tsx:8` with F8's hero component and adds no image files itself.
  4. Re-export the 512×512 app icon (`apps/web/app/icon.png`, 385 KB, fetched on every page; and `apps/mobile/assets/icon.png`) with the same artwork, optimised.
- **Mock:** the interim slots and the sized hero on light and dark surfaces next to the Floodlight UI.
- **Done when:**
  - The global conditions hold.
  - Byte sizes before and after are in the PR, for every image F8 replaces.
  - Lighthouse's "modern image formats" and "properly size images" audits no longer flag the app icon on Today. The login hero is S01's done condition.
  - Every illustration has empty `alt` or an accessible label, as fits its role.
  - Each slot's export name and props are fixed by a test, so L1 can swap the art without touching a screen.

## F9: Charts

- **Goal:** a truthful, fast, animated weight chart, plus the goal and macro visuals that replace rings.
- **Depends on:** F2, F4.
- **Evidence:** critique 13–15 and 22; bugs 5 and 13; `motion.md` §5.3–5.5 and §5.15; perf (hub hotspots).
- **Requirements:**
  1. **Weight chart:**
     - A labelled "Today" marker.
     - The projection dashed and labelled "projection", with the goal date at its end ("80 kg ~24 Jan 2027").
     - The visible window includes the projection end (bug 5).
     - A table toggle as the accessible fallback.
     - Scrubbing with the `step` haptic, and a range switch with a morph.
     - Draw-in on the UI thread (Reanimated animated props on react-native-svg, M4); reduced motion shows the final state.
  2. **Chart colours:** fixed `viz.*` tokens, never the brand. Volt only for marks (D1). Lines at least 3:1 on both themes (today's dark line is 2.64:1).
  3. **States:**
     - Single weigh-in: "1 weigh-in so far. Log weight at each check-in to draw the trend," with the projection only.
     - No goal.
     - Loading.
     - Error.
  4. **Perf:**
     - Hoist the date formatter (`weight-chart.tsx:70` builds one per label, 200 ms on the hub).
     - No `getBoundingClientRect` during render (61 ms).
     - Use the F2 date formatters.
  5. **Goal progress and macros:**
     - Goal progress becomes one line ("43% · 4.5 kg to go · on pace for 24 Jan 2027").
     - Macro bars (`packages/ui/src/components/macro-bar.tsx`, new; F9 is the only owner) show value against target with the tolerance band, fiber included.
     - Build the WeaveLine for the Progress tab (A20, `motion.md` §5.15).
     - Leave the old ring and donut components in place for their callers; Q5 deletes them once unused.
- **Mock:** chart states (normal, single weigh-in, no goal, scrub, table view) in light and dark, plus the WeaveLine.
- **Done when:**
  - The global conditions hold.
  - The existing path and layout tests still pass, with new tests for the window and the states.
  - The hub CPU profile shows neither hotspot, and its longest task is 200 ms or less at 4× CPU (Q0 harness).
  - The Android baseline-device (Pixel 6, rulings O11) frame check is recorded in Q4.

## F10: Client shell

- **Goal:** the client is never lost. The same header sits on every client route, with the loop's actions in reach. The hub has four tabs, and task screens open as sheets over it.
- **Depends on:** F6; F7.3 (client prefetch helper for the layout).
- **Evidence:** critique top-10 #4 and #5, screens 13–15, §4, §9.5; A9, A18, M3.
- **Requirements:**
  1. **Header:**
     - Avatar, name, and the status chip in words (F2).
     - A fact line ("34 y · 175 cm · Lose 88 → 80 kg · Plan: none · Last check-in 6 Aug").
     - The severe-allergy chip: danger tone, icon and words, never tinted by brand or glass.
     - A labelled **WhatsApp** button.
     - Primary **Start check-in**, secondary **Log vitals**, and an overflow "…" (Edit goal, Dietary profile, Intake PDF). The hamburger goes.
     - Present on every client route, including tasks and the plan editor.
     - **Data:** the client layout (`[clientId]/layout.tsx` on web, the client stack layout on native) reads the client record through the existing `useClientDetail` hook and F7.3's prefetch helper. Screens below it read the same query, so the record is fetched once.
     - **Hub composition:** F10 rewrites `packages/app/src/features/client-detail/index.tsx` to the four tabs and the new header; it owns that file until it merges, then S04 does.
     - Glass when sticky on web.
  2. **Native header:**
     - The client name is the native large title, collapsing on scroll.
     - The chips sit in the first content row.
     - On iOS the trailing "…" opens a system menu.
     - On Android: a top app bar with overflow, and an extended FAB "Check-in" on the hub.
  3. **Hub tabs:**
     - Overview · Progress · Plan · Profile: tabs on web, a segmented control on iOS, top tabs on Android.
     - Create the `progress` and `profile` route files on web and native. Until S05 and S04 replace them, Progress renders the existing Journey and Profile renders the hub's existing identity and contact facts. Turn the `journey` and `history` route files into redirects to `progress`. F10 owns these route files until it merges; then S05 owns Progress and S04 owns Profile.
  4. **Task presentation** (vitals, goal, dietary, check-in, check-in detail):
     - **Desktop:** a 480 px side sheet over the hub, with the URL changing. A direct load renders the full page with the header (for example Next parallel and intercepting routes; record the choice).
     - **Phone web:** a full-screen route with the header and no tab bar.
     - **Native:** form sheets with detents (medium for check-in, large for vitals, goal and dietary), with Cancel and Save in the sheet bar.
     - **Unsaved changes:** a dirty-state guard confirms before dismissing.
- **Mock:** header, tabs and sheet presentation on all platforms; overdue, allergic and empty clients. This is the highest-leverage mock (critique §8 #2).
- **Done when:**
  - The global conditions hold.
  - A screenshot matrix shows the header on every client route.
  - Redirect tests pass.
  - The deep-link test passes: a direct URL renders the full page; in-app navigation opens the sheet.
  - The unsaved-guard test passes.
  - Native sheet screenshots show no tab bar.
