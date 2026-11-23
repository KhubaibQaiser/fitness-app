# GymOS UI/UX revamp: design research

Date of research: 2026-11-23. Repo read-only; nothing installed or run. Version and date facts for npm packages come from `registry.npmjs.org` (queried today) and GitHub API; other claims carry links in section 6. Anything I could not verify is marked **unverified**. Opinions are marked **[opinion]**. I did not critique current screens (another agent does that).

---

## 1. Current design layer facts

**Versions (from package.json files)**

| Thing                      | Version in repo                | Latest on npm today        | Note                                                                               |
| -------------------------- | ------------------------------ | -------------------------- | ---------------------------------------------------------------------------------- |
| tamagui / @tamagui/config  | ^2.7.2                         | 3.3.3 (2026-11-13)         | `packages/ui/package.json`. Dependabot PR targets 3.1.7, already two minors behind |
| react-native               | ^0.86.2 (mobile pinned 0.86.2) | n/a                        | Expo SDK 58 (2026-10-15) moves to RN 0.88                                          |
| expo / expo-router         | ~57.0.2 / ~57.0.12             | `@expo/ui` already at 58.x | `apps/mobile/package.json`                                                         |
| react-native-reanimated    | 4.5.1 (exact)                  | 4.8.0 (2026-11-19)         | Expo SDK 57's `bundledNativeModules.json` pins 4.5.1 + worklets 0.10.1             |
| @shopify/react-native-skia | 2.6.2 (exact)                  | 2.14.0                     |                                                                                    |
| expo-skia-charts           | ^0.5.0                         | 0.5.0 (2026-01-03)         | used only in `macro-donut.native.tsx`                                              |
| next                       | ^16.4.3                        | n/a                        | `apps/web`                                                                         |
| solito                     | ^5.0.0                         | n/a                        |                                                                                    |
| react-native-web           | ^0.21.2                        | n/a                        |                                                                                    |
| gesture-handler / screens  | ~2.32.0 / ~4.26.0              | n/a                        |                                                                                    |

**What `packages/ui` provides** (`packages/ui/src/components`, about 40 files): buttons, icon-button, card, badge, stat-pill, stat, goal-tag, form-field, date-field, ios-switch, segmented-control, pace-slider, gymos-sheet, gymos-modal, gymos-toast, alert-banner, skeleton, states, page-header, screen, sticky-form-footer, keyboard toolbar and focus-chain (form keyboard navigation), metric-hero, gradient-ring, dual-rings, weave-line, weight-chart (hand-written react-native-svg path math with unit tests), notification-row, stagger-item, fade-in, error-boundary. Icons: `@tamagui/lucide-icons-2`.

**Tokens** (`docs/design-system-reference.md`, `packages/ui/src/tamagui.config.ts`):

- Zinc neutrals plus blue (coach) and rose (client) roles. Semantic names: canvas, surface, border, textPrimary, textSecondary, textFaint, plus alert and milestone washes. Themes `light`, `dark`, `light_coach`, `dark_coach`, `light_client`, `dark_client`. A large `legacyAliases` block (primary, cardBg, screenBg ...) sits beside the new names, so two vocabularies coexist.
- Type: Inter (UI) plus Roboto Mono (numbers). Sizes 12/14/16/20/30, mono stats up to 36. Fontsource on web, `@expo-google-fonts` on native.
- Space 2 to 64, radius 8/12/16/24/full, two elevations (card, overlay).
- Fact check on contrast, computed today with the WCAG formula: `textFaint` zinc400 on white is **2.56:1**, and zinc600 on zinc900 (dark) is **2.29:1**. Both are below 4.5:1 for text. `textSecondary` zinc500 on white is 4.83:1 (passes narrowly). White on blue700 is 6.7:1.

**Per-tenant branding today is build-time, not runtime.** `tamagui.config.ts` does `import manifest from '../../../infra/tenants/pilot.json'` and sets `accentBg: brand.primary`. Only `primary` flows into the theme; `accent` and `radius: "soft"` from the manifest are not wired into tokens (from reading the config; I did not trace every consumer). Several role colors (accentText, gradients, weave strokes) are hard-coded blue. A second tenant with a different color would not recolor the app. This is the biggest gap against the stated requirement.

**Motion libraries present:**

- Reanimated 4.5.1 and Skia are installed, but I found no `useAnimatedStyle`, `withTiming` or `withSpring` calls in `packages/ui/src` or `packages/app/src`. Motion today is React Native core `Animated` (for example `stagger-item.tsx`: 240 ms opacity and 10 px translate, 40 ms per index, capped at 8) plus Tamagui `animation`/`enterStyle` props. Sheets use Tamagui transition token `medium` (`gymos-sheet-motion.ts`).
- The auth route slide (`use-auth-panel-slide.ts`, 400 ms) is hand-rolled DOM: it clones the old form node, absolutely positions it in a fixed clip box and animates CSS classes. It respects `prefers-reduced-motion`. It is web-only and cannot be reused for native or other routes.
- No haptics package (`expo-haptics` not in any package.json). No `startViewTransition` or Next `viewTransition` config. No Moti.

**RTL and i18n:** I found no i18n library, no `I18nManager`, `dir=` or `forceRTL` usage in `apps/` or `packages/app/src` and `packages/ui/src` (searches matched only the word "direction" in chart/solver code). Tenant manifest declares `locales.enabled: ["en","ur"]`, so Urdu is planned but the UI is not RTL-ready. The font config has no Arabic-script family. Tamagui web source in `node_modules` has no RTL handling that I could find (**unverified** beyond that grep). React Native Web ships an `I18nManager` export, but one source says direction must be set manually on web (see section 6).

**Navigation shell:** `packages/app/src/features/shell/primary-nav.ts` has five destinations (Home, Clients, Tools, Alerts, Settings). Web is Next App Router route groups `(coach)` and `(public)`; mobile is Expo Router `(auth)` and `(coach)`. The `(public)/layout.tsx` stays mounted across auth routes (spec `docs/specs/public-auth-split-layout.md`).

**Auth pages as reference:** split layout at >=768 px with an illustration column, directional slide between forms (forward from the right, back from the left), reduced-motion cut. Good pattern, but its implementation does not generalize.

**Tamagui 3 migration evidence:** the 32 typecheck errors match the official guide: v3 drops V2 condition objects such as `hoverStyle` at runtime, removes `sizable-context`, restyles Avatar/Tabs/Group roots, and requires a Sheet-capable animation driver. The official codemod `@tamagui/codemod-flat-values` handles most conversions, but the guide says its report still flags many sites for manual review and cites 2,113 sites on a large codebase.

---

## 2. 2026-27 patterns for a coach operating tool

GymOS is used daily, mostly by one coach managing 10 to 200 clients, on a laptop and a phone. That favours "Operate" patterns (Linear, Things) over "Consume" patterns (Fitbod, Apple Fitness). Product behavior below is from general knowledge of those products; I did not re-verify each this session, so treat product names as references to go and look at, not citations of specific features (homepages in section 6).

| Pattern                                       | What it is                                                                                                                                                                                                | Good example                                                                     | Fit for GymOS                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Adaptive navigation                           | Desktop: left rail (collapsible, icons+labels, counts). Mobile: 4-5 item tab bar with a center action. One config drives both.                                                                            | Linear sidebar and mobile tabs; Trainerize and TrueCoach use sidebar on web      | **High.** `PRIMARY_NAV` already drives both. Add Today as the first destination and badge counts for Alerts. Use native tabs on mobile (Expo Router native tabs are stable in SDK 58, see section 5)                                                                                                              |
| Today / triage dashboard                      | Not a grid of KPIs. A prioritized worklist: who needs attention today, check-ins due, plans awaiting review, then 3 to 4 glance numbers.                                                                  | Things "Today", Linear "My issues", Everfit coach dashboard (to verify)          | **Highest value.** Backend already has "attention" rankings (README worker). Make the home screen the queue; widgets are secondary                                                                                                                                                                                |
| Client hub                                    | One client page: sticky header (avatar, goal, status, next action), tabs or a segmented bar (Overview, Journey, Plan, Check-ins, History), with a right-hand context column on desktop.                   | Linear issue page; Trainerize client profile                                     | **High.** Existing tabs map cleanly. Desktop two-column, mobile single column with sticky action bar                                                                                                                                                                                                              |
| Data-dense lists                              | Roster as table on desktop (sortable, sticky header, saved views, row hover, keyboard up/down, bulk select) and as cards with sparkline on mobile.                                                        | Linear lists; Things lists                                                       | **High.** Virtualize lists. Show weight trend sparkline and adherence ring inline per row                                                                                                                                                                                                                         |
| Multi-step intake with progressive disclosure | One decision group per step, 5 to 7 fields max, progress indicator, conditional follow-ups (only ask pregnancy/medical detail when relevant), autosave per field, resume later, review screen, sign step. | Typeform-style flows; Linear onboarding; Apple Health setup                      | **High priority** (owner asked). `client-onboarding` already has steps, `use-onboarding-draft.ts` (draft autosave) and `validate-step.ts`. The revamp is visual and structural: one question group per screen, big touch targets, inline validation, save-state chip ("Saved 2s ago"), focus chain already exists |
| Charts for weight and adherence               | Weight: smoothed trend line with raw dots, goal band, range switcher (1M/3M/All), scrub tooltip, annotation for milestones. Adherence: week strip of dots/bars, not pie charts.                           | MacroFactor (trend weight vs scale weight, to verify), Oura/Whoop (ring + trend) | **High.** `weight-chart.tsx` is custom SVG; keep, add scrub and range. Compare Victory Native XL in section 4. Provide a data-table fallback for accessibility                                                                                                                                                    |
| Bottom sheets                                 | Detents (peek/half/full), drag handle, scrim, focus trap on web, keyboard avoidance.                                                                                                                      | Apple Maps, Things quick entry                                                   | **Medium-high.** Use for quick actions (log weight, add note) on mobile; use right-side drawer or centered dialog on desktop. Sheet is the component most affected by the Tamagui 3 upgrade                                                                                                                       |
| Command palette (web)                         | Cmd/Ctrl+K opens fuzzy search across clients, actions, settings.                                                                                                                                          | Linear, Raycast, Vercel                                                          | **High on web, cheap, big "2026" signal.** Build on roster data already in TanStack Query. Add shortcut hints in menus. Not needed natively                                                                                                                                                                       |
| Screen and shared-element transitions         | Direction-aware push/pop; list avatar morphing into hub header; sheet over content.                                                                                                                       | iOS Photos zoom, Linear                                                          | **High for feel**, constrained by platform (section 5)                                                                                                                                                                                                                                                            |
| Micro-interactions                            | Press scale 0.97 in 80-120 ms, optimistic checkmark draw, number count-up on change, ring fill on mount, skeleton-to-content crossfade.                                                                   | Oura/Whoop ring fills; Things checkbox                                           | **High, but budget them.** Animate on state change and first view only, never on every re-render. Respect reduced motion                                                                                                                                                                                          |
| Haptics                                       | Light impact on toggles/steps, success notification on publish, warning on destructive confirm.                                                                                                           | Apple Fitness, Things                                                            | **Medium.** Native only (`expo-haptics` 58.0.8 on npm). Need an abstraction with a web no-op. Do not buzz on every tap                                                                                                                                                                                            |
| Dark mode                                     | Real dark theme with elevation by lighter surface, not shadow; same hue discipline; dark default for data views is a style choice.                                                                        | Linear, Whoop                                                                    | **Required**, exists already (light/dark themes). Revamp must verify contrast in both (current `textFaint` fails in both)                                                                                                                                                                                         |
| Skeletons and optimistic UI                   | Layout-matching skeletons, no spinners over content, stale-while-revalidate via TanStack Query.                                                                                                           | Linear, Vercel dashboards                                                        | **Required.** `skeleton.tsx` and `home-skeleton.tsx` exist; make them structural from the same layout config so there is no layout shift                                                                                                                                                                          |

Opinions **[opinion]**:

1. The current gap is less "missing widgets" than missing hierarchy: a coach opens the app wanting "who needs me now". A Today queue with 3 numbers beats 8 cards.
2. A signature motif already exists (weave-line, two threads for coach and client). Because the product is coach-only today, the client thread has no data source yet, so use it sparingly (splash, empty states) until a client app exists.
3. Urdu RTL is a product feature in this market, not a locale toggle. Plan it into the layout, not at the end (section 3 and 4).

---

## 3. Three visual directions

All three target an Operate-mode app. Each ships one set of semantic tokens (`canvas, surface, surfaceRaised, border, text, textSecondary, textFaint, primary, onPrimary, primaryText, primaryWash, success, warning, danger, track`). Contrast ratios were computed with the WCAG 2.x formula on the exact hex values shown. Brand slots in through the same recipe in all three (see "Tenant brand slot" below).

### Direction A: "Ledger" (calm precision)

- **Mood:** quiet, fast, trustworthy, content-first. A coach's spreadsheet grown up.
- **References:** Linear, Things 3, Stripe Dashboard, Apple Notes.
- **Color, light:** canvas `#F7F7F8`, surface `#FFFFFF`, border `#E4E5E9`, text `#0F1115`, textSecondary `#5B6170`, primary (tenant) default `#1D4ED8`, onPrimary `#FFFFFF`, primaryWash `#EEF3FF`.
  Ratios: text/surface 18.9, text/canvas 17.65, secondary/surface 6.2, secondary/canvas 5.79, onPrimary/primary 6.7, primaryText/surface 6.7, primaryText/wash 6.03. Border vs canvas is 1.18 (decorative separator only; use focus rings and row hover for interactive affordance).
- **Color, dark:** canvas `#0B0C0F`, surface `#14161A`, text `#F2F3F5`, textSecondary `#A0A6B3`, primary `#2F5FE0` with onPrimary `#FFFFFF`, primaryText `#8FB0FF`, wash `#16213F`.
  Ratios: text/surface 16.31, secondary/surface 7.42, secondary/canvas 8.01, onPrimary/primary 5.48, primaryText/surface 8.47, primaryText/wash 7.42.
- **Type:** Geist (variable, Latin) for UI and numbers via tabular figures. Urdu: Noto Naskh Arabic (variable) for UI text, because Naskh stays legible at 13 to 14 px; Noto Nastaliq Urdu only for display titles. Both on Google Fonts / Fontsource (OFL). Scale 12/13/14/16/20/28. Keep Roboto Mono only for a few numeric tables if needed.
- **Radius and density:** radius 8 controls, 12 cards. Compact density (row 40 to 44 px on web, 48 px touch on mobile). Hairline borders, almost no shadow.
- **Icons:** Lucide (already installed via `@tamagui/lucide-icons-2`), 1.5 px stroke.
- **Motion:** 120 to 180 ms ease-out (`cubic-bezier(0.2,0,0,1)`) for hover/press/menu; 240 ms for route and panel; sheets use spring (damping about 28, stiffness about 300). Animates: route push/pop, list reorder, skeleton crossfade. No decorative loops.
- **Charts:** thin 2 px line, raw dots at 40% opacity, single accent, goal band as a 6% wash, mono tick labels, scrub tooltip. Adherence as week-dot strip.
- **Strengths:** cheapest to build on the existing kit; highest density; neutral palette means tenant colors almost always look fine; best for desktop-heavy coaches.
- **Risks:** can read as "just another SaaS" and may not meet "boring, plain" complaint on its own. Needs excellent micro-interaction craft and one memorable moment (Today queue, command palette) to feel 2026.

### Direction B: "Pulse" (data-forward, dark-first)

- **Mood:** instrument panel, athletic, confident, glanceable rings and big numerals.
- **References:** Whoop, Oura, Apple Fitness, Strava.
- **Color, dark (default):** canvas `#07090D`, surface `#11151C`, surfaceRaised `#181E28`, text `#F4F6FA`, textSecondary `#9AA4B5`, primary `#2DD4A8` (mint), onPrimary `#04130F`, amber warning `#FBBF24`.
  Ratios: text/surface 16.91, text/raised 15.46, secondary/surface 7.28, secondary/raised 6.65, onPrimary/primary 10.04, primary/surface 9.67, amber/surface 10.96.
- **Color, light:** canvas `#F3F6F5`, surface `#FFFFFF`, text `#0B1512`, textSecondary `#4B5B57`, primary `#0F766E`, onPrimary `#FFFFFF`, wash `#E3F4F0`.
  Ratios: text/surface 18.58, secondary/surface 7.16, secondary/canvas 6.58, onPrimary/primary 5.47, primaryText/wash 4.81.
- **Type:** Bricolage Grotesque (variable, Latin display, slightly characterful) for headings and hero numbers; Geist for body; Noto Naskh Arabic for Urdu body and headings. Hero metrics 40 to 56 px with tabular figures.
- **Radius and density:** radius 16 cards, 24 hero tiles, pill chips. Medium density; fewer, larger tiles; strong tile hierarchy (one hero tile per screen).
- **Icons:** Phosphor (duotone for state) or Lucide for toolbar. Phosphor adds a second dependency; **[opinion]** stay on Lucide unless duotone is wanted.
- **Motion:** expressive. Ring/arc fills 600 to 900 ms ease-out on first view only; number count-up 400 ms; tile entrance stagger 40 ms (existing pattern); springs on press (scale 0.97) and sheets; shared-element hero from roster row to client hub on native. Needs Reanimated 4 and Skia (both already installed).
- **Charts:** gradient area under line (Skia), glow on the latest point, rings for adherence, color-coded zones (never color alone; add labels and shapes).
- **Strengths:** most visually "2026"; leverages Skia and Reanimated already in the dependency list; strong for mobile and for client-facing screens later.
- **Risks:** lowest density, so worse for roster-heavy desktop work; dark-first can look wrong on bright gym-office laptops; mint primary conflicts with arbitrary tenant colors (needs the stricter slot below); more motion means more reduced-motion and performance testing on low-end Android (relevant in Pakistan; **[opinion]**).

### Direction C: "Warm Studio" (human, local)

- **Mood:** warm paper, friendly, Pakistani-market-aware, less clinical. Closer to a coach's notebook than a dashboard.
- **References:** Apple Fitness+ (friendly cards), Headspace, Notion warm themes, Things 3 spacing.
- **Color, light:** canvas `#FAF6F0`, surface `#FFFDF9`, text `#1F1A14`, textSecondary `#6B6155`, primary `#B8431E` (terracotta), onPrimary `#FFFFFF`, wash `#FBEBE2`.
  Ratios: text/surface 17.0, text/canvas 16.04, secondary/surface 5.96, secondary/canvas 5.63, onPrimary/primary 5.44, primary/surface 5.36, primary/wash 4.69.
- **Color, dark:** canvas `#15110D`, surface `#1F1A15`, text `#F6EFE6`, textSecondary `#B3A798`, primary `#F59E6B`, onPrimary `#1A0F07`, wash `#3A2013`.
  Ratios: text/surface 15.13, secondary/surface 7.31, secondary/canvas 7.96, onPrimary/primary 8.95, primary/surface 8.21, primary/wash 7.15.
- **Type:** Fraunces (variable serif, Latin) for page titles only; Geist for UI. Urdu: Gulzar (Nastaliq, OFL) for titles and Noto Naskh Arabic for UI body. Nastaliq is tall and needs generous line height (Google notes Urdu-style scripts are "tall" and need extra line height; no exact ratio found, so test with real strings). Serif display plus Nastaliq is the one pairing here that matches in warmth across scripts.
- **Radius and density:** radius 20 cards, 14 controls, 999 chips. Comfortable density; wide gutters; soft shadows (two layers, 6 to 12% black).
- **Icons:** Lucide at 1.75 px stroke, rounded caps; or Phosphor "regular". Keep Lucide.
- **Motion:** soft springs (damping 22, stiffness 180) on cards and sheets, 280 to 360 ms; page crossfade plus 12 px rise; gentle ring fill. Fewer, larger motions than B.
- **Charts:** rounded line caps, pastel area wash, annotated milestones as small flags (matches existing milestone amber concept).
- **Strengths:** most differentiated from competitors and from the current blue/zinc look; flatters Urdu typography; tenant brand slots in naturally as the one saturated color on warm neutrals.
- **Risks:** serif and warm palette can feel less "tool-like" to coaches who expect Linear-grade crispness; lowest density of the three after B; several tenant brand colors (cool blues/greens) will clash with the warm canvas, so tenant theming must also be allowed to shift the neutral temperature, which adds complexity.

### Tenant brand slot (common to all three)

Proposal **[opinion]**, to be validated by a spike:

1. Store a single `brand.primary` hex per tenant (already in the manifest) plus `radius` preset.
2. At theme build time (or runtime on web via CSS variables), derive: `onPrimary` = white or near-black, whichever gives >= 4.5:1; `primaryText` = primary stepped lighter/darker in OKLCH until >= 4.5:1 on `surface` for each mode; `primaryWash` = primary mixed to 8 to 12% over `surface`. Reject or auto-adjust brand colors that cannot reach 3:1 against `canvas` for large UI.
3. Never let tenants override neutrals, semantic success/warning/danger, or chart category colors. Keep `warning` and `danger` fixed so a red tenant brand cannot be confused with an error.
4. Today the repo applies tenant color at build time through a JSON import. True per-tenant runtime theming needs either CSS variables on web plus a theme provider on native, or Tamagui's runtime theme APIs (`addTheme`/`updateTheme` exist in Tamagui core per my memory; **unverified** this session). Unistyles 3 documents runtime theme switching and converts theme colors to CSS variables on web (links in section 6).

---

## 4. Cross-platform UI library evaluation

Dates are npm "latest" publish dates queried 2026-11-23, plus GitHub last push where useful.

| Option                                          | Web via RN-web                                                                       | RTL                                                                                    | Runtime tenant theming                                     | Performance approach                                                 | Maturity / recent activity                                                                                                   | Licence                                   | Lock-in                                           | Migration cost from 40-component Tamagui kit                                                                                                                                                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tamagui 2.x (stay)**                          | Good; atomic CSS extraction via Next plugin; already running                         | Logical props supported by RN; **no Tamagui-specific RTL evidence found** (unverified) | Build-time today; runtime APIs exist (unverified)          | Optional compiler, atomic CSS                                        | v2.x line is what repo uses; project pushed 2026-11-22                                                                       | MIT                                       | High (Tamagui styled/theme APIs)                  | **None**, but upgrades stuck at 2.x. Upstream attention is on v3                                                                                                                                                        |
| **Tamagui 3 (upgrade)**                         | Same plus Tailwind syntax and React Strict DOM (blog 2026-07-10, details unverified) | Not mentioned in guide excerpt (unverified)                                            | Config v6 recipe API replaces dynamic v5 builders          | New native runtime and compiler (per blog title; details unverified) | 3.3.3 on npm 2026-11-13; beta since 2026-10; blog posts 2026-06 and 2026-07                                                  | MIT                                       | High                                              | **Medium.** 32 errors now; codemod exists but guide says manual review is large; Sheet needs capable animation driver; Avatar/Tabs/Group lose default styling; Config v6 changes scales (defer as separate design step) |
| **NativeWind v4 / v5 + react-native-reusables** | Good (Tailwind to CSS on web)                                                        | Tailwind logical utilities (`ms-`, `ps-`) plus `rtl:` variants                         | CSS variables, good fit for tenant colors                  | Compile-time class to style; v5 uses react-native-css                | v4.2.7 (2026-09-14); v5 at 5.0.0-rc.1 (2026-11-02), docs still say pre-release; reusables MIT, 8.7k stars, pushed 2026-11-17 | MIT                                       | Medium (Tailwind plus shadcn-style copied source) | **High.** Rewrite every styled component and all token usage; keep logic. Only sensible with a rewrite mandate                                                                                                          |
| **Gluestack UI v3 / v5**                        | Medium (NativeWind based)                                                            | Inherits NativeWind                                                                    | CSS variable theming (v5)                                  | NativeWind/Uniwind                                                   | v3 Sept 2025; v5 stable 2026-06-25 (npm 5.0.3), requires NativeWind v5 or Uniwind                                            | MIT (npm)                                 | Medium (copy-paste)                               | High; same as NativeWind plus a different component API. Adds nothing GymOS lacks                                                                                                                                       |
| **Unistyles 3**                                 | Good, own CSS parser, independent of RN-web                                          | Supports RTL via RN layout; (details unverified)                                       | Runtime theme switching without re-render; CSS vars on web | C++ (Nitro) style engine, no re-render                               | 3.8.2 (2026-11-16); very active                                                                                              | MIT (per npm; GitHub license field blank) | Medium. A styling engine only, **no components**  | Medium-high: replace Tamagui `styled`, tokens, themes in all 40 components, but no new component set to learn. Needs Nitro modules and `edge-to-edge`                                                                   |
| **HeroUI Native**                               | Native-first; web **unverified** (it targets RN, not web)                            | Unverified                                                                             | Theming via CSS variables (unverified)                     | Uniwind/Tailwind v4 (unverified)                                     | 1.1.1 (2026-11-19); v1.0.0 March 2026; Apache-2.0                                                                            | Apache-2.0                                | Medium                                            | High and mismatched: native-only means web needs a second library                                                                                                                                                       |
| **Expo UI (`@expo/ui`)**                        | None (native SwiftUI/Compose widgets; universal layer dispatches to them)            | Native platform handles it                                                             | Native theming only                                        | Real native views                                                    | 58.0.29 (2026-11-17); stable from SDK 56 (blog 2026-05-26)                                                                   | MIT                                       | High to Expo                                      | Not a replacement: no web story for a PWA product. Useful later for native-only affordances (pickers, menus, native tabs/sheets)                                                                                        |

**Motion**

| Lib                             | Status                                        | Fit                                                                                                                                                                        |
| ------------------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reanimated 4                    | 4.8.0 (2026-11-19). Already in repo at 4.5.1  | The engine for spring/gesture motion and shared elements. Web support exists for core animations; shared elements are **not** animated on web                              |
| Moti                            | Last npm release 0.30.0 on 2025-01-29 (stale) | Skip; Reanimated directly or Tamagui's reanimated driver                                                                                                                   |
| react-native-screen-transitions | 4.2.0 (2026-11-10), alpha 4.3                 | Custom gesture-driven screen transitions on top of react-navigation; consider only if native stack presets are insufficient (unverified compatibility with Expo Router 57) |
| Expo Router `Link.AppleZoom`    | alpha, iOS only                               | Cheap native shared-element for list-to-detail (section 5)                                                                                                                 |

**Charts**

| Lib                                               | Status                                                         | Fit                                                                                                                                                                 |
| ------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep custom SVG (`weight-chart.tsx` + math tests) | in repo                                                        | Full control; add scrub, range, a11y table. Lowest risk for a single chart type                                                                                     |
| Victory Native XL (`victory-native`)              | 43.1.0 (2026-11-16); Skia plus Reanimated plus gesture-handler | Best fit if more chart types are needed natively; **native only**: web needs separate path (react-native-web with Skia needs CanvasKit, which is heavy; unverified) |
| react-native-gifted-charts                        | 1.4.83 (2026-11-17)                                            | Quick line/bar/pie, react-native-svg; less polished motion                                                                                                          |
| expo-skia-charts                                  | 0.5.0, one release in 2026                                     | Already used for the donut; low activity, do not expand                                                                                                             |

**Recommendation [opinion; Khubaib decides]:**

**Stay on Tamagui 2.x for the revamp. Do the revamp as a token-and-component redesign inside the existing kit, then schedule Tamagui 3 as a separate, time-boxed migration after the new visual layer is stable.** Reasons: (1) every alternative except Tamagui 3 means rewriting all 40 components plus the theming system for no web-quality gain; (2) the visual change (tokens, type, spacing, motion) is independent of the library and lands the owner's goal faster; (3) doing a redesign and a styling-engine migration in one stream makes regressions impossible to attribute; (4) Tamagui 3's own guide advises doing the Config v6 design migration separately, which fits a revamp that redefines tokens anyway.
Add alongside: a Reanimated-based motion layer (not Moti), `expo-haptics` behind a platform abstraction, a command palette on web, and RTL readiness (logical props, Urdu font stack, `dir` on `<html>` and `I18nManager` on native).

**What would change this:** (a) a one-to-two-day Tamagui 3 spike on a branch gets typecheck clean via the codemod and Sheet, hover and variants render correctly, which would flip the order to "upgrade first, then revamp on v3"; (b) Tamagui RTL proves broken on Urdu layouts in a spike, which would favour Unistyles 3 (tokens and theming on a style engine) with components kept; (c) NativeWind v5 goes stable and the owner wants a shadcn-style copied-source kit, which would justify a rewrite, not a migration.

Also worth flagging: **Expo SDK 58 shipped 2026-10-15** (RN 0.88). Staying on SDK 57 means Reanimated 4.5.1, which lacks shared-element transitions that arrived as on-by-default in 4.8.0. Reanimated 4.8 docs also require `react-native-screens` 4.28 or newer on Android (repo has ~4.26). An SDK 58 upgrade is the likely route to shared elements and is a separate decision.

---

## 5. Transitions plan

**Principle:** one motion vocabulary (tokens), two implementations (web CSS/View Transitions, native Reanimated/native stack), and a clear rule about which transitions are allowed to differ per platform.

**Motion tokens** (shared TypeScript constants in `packages/ui`, consumed by both): `instant 80`, `fast 140`, `base 220`, `slow 320` ms; easing `standard cubic-bezier(0.2,0,0,1)`, `emphasized cubic-bezier(0.3,0,0,1)`; spring presets `snappy` and `soft`. Reduced motion: all collapse to 0 to 120 ms opacity only.

**Native (Expo Router, native stack)**

1. Use native stack transitions for push/pop (platform-default slide on iOS, fade/shared-axis on Android). These are the smoothest because they run on the UI thread and give the interactive swipe-back for free. Avoid JS stack or `Slot` for primary flows; Expo's link-preview docs say preview transitions look clunky with JS tabs or `Slot`.
2. Primary tabs: Expo Router native tabs (stable in SDK 58 per its changelog; in SDK 57 check availability, **unverified**).
3. Roster to client hub: `Link.AppleZoom` (SDK 55+, alpha, iOS only). Docs list known glitches with headers and a limit with `Link.Preview` (target must be a full-screen modal). Android falls back to the default transition. **[opinion]** treat as progressive enhancement.
4. In-screen shared elements (for example avatar to header): Reanimated shared transitions. They were experimental behind a flag in 4.2 to 4.7 and on by default in 4.8.0; requires the SDK upgrade noted above. Limitation: not supported on web.
5. Sheets: one `GymosSheet` with detents; on native consider the platform sheet presentation. Tamagui 3 changes the sheet driver requirement (guide), so keep sheet logic behind the existing wrapper.

**Web (Next.js 16 App Router)**

1. Route-level crossfade or directional slide with the **View Transitions API**. Next has `experimental.viewTransition` plus React's `<ViewTransition>` component, but Next marks it experimental and not production-recommended. Without browser support the app simply does not animate. Firefox supports same-document view transitions from 144 but not nested/scoped features (as of the Chrome 2025 post; 2026 status unverified).
2. Shared element on web (avatar morph, card to page): `view-transition-name` on the source and target, set dynamically per row id; keep to one or two named elements per navigation to avoid cost.
3. Replace the hand-rolled auth slide (clone-and-animate) with the same mechanism, driven by the history direction (`rememberPath` logic can be kept as the direction source). Keep `prefers-reduced-motion` handling.
4. Within a page (tab change in client hub): CSS transitions with the motion tokens, no route transition.
5. Hover/focus: CSS only, 140 ms.

**Where web and native will differ (accepted):** native gets interactive back-swipe and zoom; web gets crossfade/slide and optional view-transition shared elements. Reanimated shared transitions do nothing on web, so do not design a transition that depends on it for meaning.

**Known limitations to put in the plan**

- Reanimated 4.8 shared elements need SDK upgrade (4.5.1 pinned in SDK 57), a rebuilt dev client, and Android `react-native-screens` >= 4.28.
- `Link.AppleZoom` is alpha and iOS only.
- Next `viewTransition` is experimental; React's ViewTransition is canary-track in Next docs (**version status unverified**).
- Tamagui 3 changes the animation driver packaging: `animations-react-native` is native-only on v3; web must use CSS, motion, or reanimated drivers. A motion layer built on Reanimated plus CSS variables avoids tying to a Tamagui driver.
- Skia charts on web are heavy; keep web charts SVG.
- Performance on mid-range Android must be measured on a real device before claiming smoothness (not done here).

---

## 6. Sources

**Repo (local, read-only)**

- `README.md`, `docs/design-system-reference.md`, `docs/specs/public-auth-split-layout.md`
- `packages/ui/package.json`, `packages/ui/src/tamagui.config.ts`, `fonts.ts`, `fonts.web.css`, `components/*`
- `packages/app/package.json`, `apps/web/package.json`, `apps/mobile/package.json`, `node_modules/expo/bundledNativeModules.json`
- `packages/app/src/features/auth/use-auth-panel-slide.ts`, `features/shell/primary-nav.ts`, `features/client-onboarding/*`
- `infra/tenants/pilot.json`

**Tamagui**

- https://tamagui.dev/docs/guides/how-to-upgrade (v2 to v3 guide; page was truncated, so Sheet/RTL sections incomplete)
- https://tamagui.dev/blog (Tamagui 3 dated 2026-07-10; Tailwind 2026-06-20; Tamagui 2 2025-12-29)
- https://tamagui.dev/docs/core/config-v5

**Reanimated, Expo, navigation**

- https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview
- https://github.com/software-mansion/react-native-reanimated/releases (4.8.0, 19 Nov; 4.7.x experimental)
- https://swmansion.com/blog/introducing-reanimated-4-2-0
- https://swmansion.com/changelog/reanimated-4-5-0/
- https://expo.dev/changelog/sdk-58.md (2026-10-15, RN 0.88, native tabs stable, Expo UI NavigationStack)
- https://docs.expo.dev/router/advanced/zoom-transition/
- https://expo.dev/blog/expo-router-v55-more-native-navigation-more-powerful-web
- https://docs.expo.dev/router/reference/link-preview/
- https://expo.dev/blog/expo-ui-stable-sdk-56 and https://docs.expo.dev/versions/v57.0.0/sdk/ui/
- https://reactnative.dev/docs/i18nmanager
- https://untitledui.com/react/docs/rtl (RTL in React Native Web context)

**Web transitions**

- https://nextjs.org/docs/app/api-reference/config/next-config-js/viewTransition
- https://nextjs.org/docs/app/guides/view-transitions
- https://developer.chrome.com/blog/view-transitions-in-2025

**UI libraries**

- https://github.com/nativewind/nativewind/discussions/1818 (NativeWind 5 plan)
- https://www.nativewind.dev/blog/v5-migration-guide
- https://github.com/founded-labs/react-native-reusables
- https://gluestack.io/blogs/gluestack-ui-v5-stable-release (2026-06-25) and https://gluestack.io/blogs/gluestack-v3-release (2025-09-03)
- https://expo.dev/blog/unistyles-3-0-beyond-react-native-stylesheet
- https://github.com/jpudysz/react-native-unistyles
- https://heroui.com/docs/native/releases
- npm registry (queried 2026-11-23): https://registry.npmjs.org/tamagui, /nativewind, /gluestack-ui, /react-native-unistyles, /heroui-native, /@expo/ui, /moti, /react-native-reanimated, /victory-native, /react-native-gifted-charts, /react-native-screen-transitions, /expo-haptics, /@shopify/react-native-skia, /expo-skia-charts, /react-native-css, /react-native-keyboard-controller
- GitHub API (queried 2026-11-23): https://api.github.com/repos/tamagui/tamagui, nativewind/nativewind, jpudysz/react-native-unistyles, heroui-inc/heroui-native, software-mansion/react-native-reanimated, gluestack/gluestack-ui

**Charts**

- https://socket.dev/npm/package/victory-native/overview/40.0.0-next.6 (older prerelease page; current 43.1.0 from npm registry)

**Fonts (availability)**

- https://fonts.google.com/noto/specimen/Noto+Nastaliq+Urdu, https://fonts.google.com/specimen/Gulzar, https://fonts.google.com/noto/specimen/Noto+Naskh+Arabic
- https://fonts.google.com/specimen/Geist, https://fonts.google.com/specimen/Bricolage+Grotesque, https://fonts.google.com/specimen/Fraunces
- https://api.fontsource.org/v1/fonts/ for `noto-nastaliq-urdu`, `gulzar`, `noto-naskh-arabic`, `geist`, `bricolage-grotesque`, `fraunces` (all OFL-1.1; the first three include the `arabic` subset)
- https://fonts.google.com/knowledge/using_type/language_support_in_fonts (tall scripts need extra line height)
- https://m2.material.io/design/typography/language-support.html
- https://www.w3.org/TR/2024/DNOTE-arab-ur-lreq-20240618/ (Urdu layout requirements)
- https://developers.googleblog.com/i-can-get-another-if-i-break-it-announcing-noto-nastaliq-urdu/

**Reference products (homepages, behavior described from general knowledge, not re-verified this session)**

- https://linear.app, https://culturedcode.com/things/, https://www.whoop.com, https://ouraring.com, https://macrofactorapp.com, https://www.apple.com/apple-fitness-plus/, https://www.trainerize.com, https://truecoach.co, https://everfit.io

**Design database**

- UI UX Pro Max (vendored, MIT): its "fitness/coaching dashboard" query returned "Enterprise Gateway" landing pattern, "Data-Dense Dashboard" style, Fira Code/Fira Sans type and a blue/amber palette. I used only its chart guidance (line chart for trends, show a data-table fallback, do not rely on hue alone, fewer than 4 points use a stat card) and its "show step progress" form rule; its first suggestion was a generic landing-page pattern and was not used.

**Not verified this session:** Tamagui 3 RTL behavior and runtime theme APIs; HeroUI Native web support and RTL; Unistyles RTL specifics; Firefox 2026 view-transition status; Expo SDK 57 native tabs availability; Noto/Gulzar exact vertical metrics; real device smoothness numbers; Urdu glyph coverage for each font (run a test with real Urdu strings before choosing).
