# GymOS web UI/UX critique, ahead of the redesign

Date: 2026-11-23. Scope: the coach web app, every route captured on 1440x900 desktop and 390x844 phone (light), plus 6 key screens in dark mode. The native iOS and Android screenshots are not in yet (`screens/ios/` and `screens/android/` are empty), so this document covers web only.

> **Update (same day):** native iOS findings are in **section 9**, rewritten from a second, valid capture set (the first set never left the Home screen). Sections 1–8 are unchanged apart from cross-reference notes.

**Method.** `⚠️ DEGRADED: single-context`. Impeccable's critique playbook wants Assessment A (design review) and Assessment B (detector plus browser overlay) to run in two isolated sub-agents. Instead, I did the design review first in this agent and ran the detector afterwards, also here. Two reasons: the owner's notes say a helper agent's shell prompts can stall for hours, and the brief allows no running servers, so the live-browser overlay could not run. The detector (`impeccable detect --json packages/app/src packages/ui/src`) returned `[]`. That is **not** a clean bill of health: the detector reads web markup and CSS classes, and this codebase styles through Tamagui props, so the detector very likely cannot see them (inferred). Every finding below comes from the screenshots, the source code, or a contrast ratio computed from the tokens in `packages/ui/src/tamagui.config.ts`.

**Evidence keys.** `D/` = `screens/web-desktop/`, `M/` = `screens/web-mobile/`, `DD/` = `screens/web-desktop-dark/`, `MD/` = `screens/web-mobile-dark/`. Code paths are relative to the repo root (`packages/app/src/...` is shortened to `app/...`, `packages/ui/src/...` to `ui/...`).

**Severity.** critical = P0, blocks the task or misleads on safety or status. high = P1, real difficulty, WCAG AA failure, or a wrong number. medium = P2, an annoyance with a workaround. low = P3, polish.

**Labels.** _[inferred]_ marks a conclusion I drew rather than saw. _[opinion]_ marks taste. Nothing here picks a palette, a font or a UI library; a separate agent owns that.

---

## 1. Product understanding

**Who uses it.** One coach (later, many coaches inside a gym org) managing a roster of clients. It is coach-only today; there is no client app (README "The product today is coach-only", AGENTS.md "Current product is coach-only"). The pilot is in Pakistan: the login footer says "Pilot build · Pakistan region" (`D/01-login.png`), phone numbers use the +92 format, the intake contact step says "WhatsApp preferred" (`app/features/client-onboarding/onboarding-types.ts`), and the greeting formats dates as `en-PK` (`app/features/home/coach-greeting.ts`).

**The weekly loop** (README "What it does", roadmap Phase 0 exit criteria):

1. Onboard a client: identity, body, goal, medical gates, diet, then an e-signature.
2. Record vitals as a time series. History is never overwritten.
3. Set a goal with a pace inside the safety floors (Layer 1, physiology).
4. Generate a **DRAFT** 7-day meal plan. A deterministic solver picks the foods and grams (Layer 2). A local language model only names the meals (Layer 3) and never emits numbers.
5. Edit the plan: swap foods, change grams. Totals recompute from `per100g × grams`.
6. **Publish explicitly** (`reviewed: true`; off-target totals also need `acknowledgeDrift`). Nothing auto-publishes (spec FR-C6).
7. Run the weekly check-in. The engine returns a deterministic verdict: HOLD, ADJUST_TARGETS, ADHERENCE_FOCUS, PLATEAU_PROTOCOL, REFER_REVIEW or INSUFFICIENT_DATA. The coach can apply adjusted targets, which re-solves a new draft, which goes back to step 6.
8. Overnight, a worker rolls attention flags, rankings and cleanup.

The product promise is "Nutrition numbers are code. Language is optional. Publish is always a human." So the UI's job is to make three things visible: **where a number came from, what the coach still has to review, and who needs the coach this week.** The severe-allergy rule (spec FR-C7) means allergy state must stay visible wherever food is decided. The README route table even says "severe allergies stay visible".

**Use scene** _[inferred]_: between sessions on the gym floor on a phone (hence the Expo app and the phone tab bar), and at a desk for plan editing and intake. During intake and signature, the coach's screen faces the client across the desk. That is a client-facing moment inside an operator tool.

**What each screen is for, in my words**

| Key   | Route                             | Purpose                                                                                                                                |
| ----- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| 01–03 | /login, /signup, /forgot-password | Get the coach in. Signup and reset use an email OTP.                                                                                   |
| 10    | /                                 | "Who needs me today?": the start of the weekly loop.                                                                                   |
| 11    | /clients                          | Find a client and see the caseload's health at a glance.                                                                               |
| 12    | /clients/new                      | Intake wizard: capture everything the engine needs, then sign.                                                                         |
| 13–15 | /clients/[id]                     | Client hub: one person's status, trend and next action.                                                                                |
| 16    | …/vitals/new                      | Append a measurement set.                                                                                                              |
| 17    | …/goal/new                        | Set or edit the goal, pace and calorie target.                                                                                         |
| 18    | …/check-in                        | Weekly check-in, then the verdict, then optionally apply new targets.                                                                  |
| 19    | …/check-ins/[id]                  | Review or correct a past check-in.                                                                                                     |
| 20    | …/dietary                         | Allergies, lifestyle rules, preferred foods. Saving re-validates the live plan.                                                        |
| 21    | …/history                         | Past check-ins.                                                                                                                        |
| 22    | …/journey                         | Timeline: start, check-ins, "you are here", projected milestones.                                                                      |
| 23    | …/meal-plan                       | Hub Plan tab: goal, dietary profile, current plan summary.                                                                             |
| 24    | …/plan                            | Plan editor: versions, day totals, meals, publish.                                                                                     |
| 25    | …/meal-plan (no plan)             | Empty Plan tab with "Generate draft plan".                                                                                             |
| 26    | /notifications                    | Alerts (check-in due or overdue, red flags, plan blocks).                                                                              |
| 27    | /settings                         | Units, appearance, account.                                                                                                            |
| 28    | /settings/meal-planner            | The coach's instructions to the meal-naming model.                                                                                     |
| 29    | /settings/nutrition               | Legacy route: redirects to /tools/targets (confirmed in `index.json` finalUrl and `apps/web/app/(coach)/settings/nutrition/page.tsx`). |
| 30    | /tools                            | Calculators (TDEE, BMI, macro split) and links to the explainers.                                                                      |
| 31    | /tools/meals                      | "How meals are planned": the solver's templates explained.                                                                             |
| 32    | /tools/targets                    | "How targets work": the physiology explained.                                                                                          |
| 99    | unknown route                     | 404.                                                                                                                                   |

---

## 2. Overall verdict

**Gut reaction.** The app is tidy, consistent in spacing, and built on a real component kit: 44px targets, focus rings, skeletons and error states all exist. But it reads as category-default SaaS: white rounded cards on a pale canvas, small grey labels, one blue. That plainness is the smaller problem. **The bigger one is that the screens do not tell the truth consistently.** Home says "All clients are on track today" above five rows that are 91 to 109 days overdue. The same adherence value appears in four different formats on four screens. The plan editor's only prominent action on an empty draft is "Publish plan". A re-skin would ship all of this in nicer colours. The redesign has to fix information architecture, status truth and states first; the visual world goes on top.

**Design specificity verdict.** Category-interchangeable. Swap the nouns and this could be any CRM. The design reference names a signature motif, the WeaveLine (two threads, coach and client, braided to show relationship health; `docs/design-system-reference.md`). It is implemented in `ui/components/weave-line.tsx` and **used on zero screens** (grep across `packages/app/src` finds no import). The most product-specific idea in the codebase is the Journey timeline ("You are here" plus projected milestones), and it sits on a secondary tab.

**Deterministic scan.** `impeccable detect` found 0 issues across `packages/app/src` and `packages/ui/src`. Treat that as "not applicable" (Tamagui props are invisible to it), not as clean. No browser overlay ran, because servers were out of scope.

### Heuristic scores (Nielsen's 10, Impeccable rubric 0–4; Operate mode, so all 10 apply)

| #         | Heuristic                       | Score     | Key issue                                                                                                                                                                                                                                                               |
| --------- | ------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Visibility of system status     | 2         | Pending labels and skeletons exist ("Analyzing…", "Generating…"), but the core status is wrong: Home says on track while every client is overdue (`D/10-home.png`). No success feedback after publish or goal save. A toast component exists, but no screen imports it. |
| 2         | Match system / real world       | 2         | Engine and developer language leaks: "Capture → verdict → optional apply", "INSUFFICIENT_DATA", "Layer 1", "re-run the engine", "have 3 over 0.04", ISO dates. The explainers in Tools are genuinely plain.                                                             |
| 3         | User control and freedom        | 2         | Forms have Cancel. But intake has no exit on step 1 and loses all 8 steps on refresh, a past check-in opens straight into edit mode, and "How it works" on the goal form navigates away from unsaved edits.                                                             |
| 4         | Consistency and standards       | 1         | Adherence appears as %, as a ring, as "~%" and as "/10". Verdicts use 3 vocabularies. Units ignore preferences on 4 screens. Journey dates are a day off from History's. The nav says "Alerts" but the page says "Notifications".                                       |
| 5         | Error prevention                | 1         | "Publish plan" is offered on a 0 kcal draft. An empty check-in can be submitted. Sex defaults to Male. Age is silently assumed to be 30. No unsaved-changes guard anywhere.                                                                                             |
| 6         | Recognition rather than recall  | 2         | Vitals shows last values (good). Every task screen drops the client's name, and the loop's actions hide behind a hamburger icon.                                                                                                                                        |
| 7         | Flexibility and efficiency      | 1         | No keyboard shortcuts, no global search or command palette, no batch check-in, no sortable roster. Form focus-chaining exists (`ui/use-focus-chain.tsx`).                                                                                                               |
| 8         | Aesthetic and minimalist design | 2         | Clean but flat. Data is duplicated (a goal-progress card plus a giant goal-progress ring). The roster's Progress column is dead. Every block is the same card.                                                                                                          |
| 9         | Error recovery                  | 2         | `ErrorState` with retry exists (10 screens import it), but most mutations print a raw `error.message` under the form, and engine reasons are shown as raw strings.                                                                                                      |
| 10        | Help and documentation          | 2         | Strong explainers ("How targets work", "How meals are planned"), but they are buried in Tools and not contextual. The goal form's help link leaves the form.                                                                                                            |
| **Total** |                                 | **17/40** | **Poor (12–19)**. Driven by status truth and consistency more than by visual polish.                                                                                                                                                                                    |

### Audit dimensions (Impeccable `audit.md`, web)

| #         | Dimension                | Score          | Key finding                                                                                                                                                                                                                                                                                                                                   |
| --------- | ------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Accessibility            | 2              | The kit has 44px targets and focus rings. But status chips and banner titles fail contrast (amber text on its wash is 2.07:1), on the web the accessibility labels are passed as unknown DOM props, dietary selection is shown by colour only, and there is no RTL support.                                                                   |
| 2         | Performance              | n/a            | Not assessed. Nothing ran, and I won't state numbers nobody can check.                                                                                                                                                                                                                                                                        |
| 3         | Theming                  | 2              | Tokens and dark mode exist. But the success green `#0EA600` is off the design-system palette, the charts use raw hex (`app/features/charts/progress-ring.tsx`, `macro-donut.native.tsx`), and in dark mode zinc cards sit on a blue-tinted canvas at 1.06:1, so they barely separate.                                                         |
| 4         | Responsive               | 3              | Works at 390 with a bottom tab bar and no horizontal scroll seen. Problems: ISO dates wrap mid-token (`M/10-home--tall.png`), desktop inputs stretch to about 1110px, 6 tabs crowd the phone width (`M/31-tools-meals.png`), and inputs use 15px text, which makes iOS Safari zoom on focus (`ui/components/form-field.tsx` `fontSize={15}`). |
| 5         | Implementation integrity | 1              | Systemic drift: 4 adherence formats, raw enums, hard-coded units, the signature motif unused, the toast component unused, a placeholder column shipped.                                                                                                                                                                                       |
| **Total** |                          | **8/16 (50%)** | **Acceptable, low end.**                                                                                                                                                                                                                                                                                                                      |

**Cognitive load:** 3 of 8 checklist items fail (moderate): visual hierarchy (Home and hub lead with four equal stat cards), working memory (task screens drop client context; check-in does not show the last weight), single focus (the hub shows two banners, four stats, a chart and a ring, with no primary action). Decision points with more than 4 options: the goal form (5 activity levels, 4 goals, then a slider) and the hub's overflow menu (6 actions plus Cancel).

**Emotional journey.** The high-stakes peak is publishing a plan a real person will eat from with a severe peanut allergy. Right now it is a full-width blue button under an empty day (`D/24-plan.png`). The confirmation copy is fine ("I reviewed this plan. Publish", `app/features/plan/plan-publish-confirm.tsx`), but nothing shows the coach what the client will receive or that allergens were checked twice, and after publishing the only sign is a badge flipping. The valley is the check-in verdict: a raw enum badge and "confidence 72%". Home's false "All clients are on track today" is the worst moment: unearned reassurance.

### Top 10 cross-cutting problems, ranked by impact

> Cross-reference: the native iOS evidence (section 9.6) leaves this ranking unchanged for the shared screens, where every problem reproduces on iOS. It adds six native-app items, N1 to N6, covering status-bar overlap, the hub header hiding content, a frozen tab bar, missing native navigation, "Invalid Date" in Alerts, and the login masking every error as "wrong password".

1. **[critical] The status the coach relies on is wrong.** Home: "All clients are on track today", Needs attention 0, On track 5, and directly below it five clients 91 to 109 days overdue (`D/10-home.png`, `DD/10-home.png`). Roster: "On track" badges and "Attention 0" (`D/11-clients.png`). Alerts lists no overdue items (`D/26-notifications.png`). Cause, confirmed in code: attention counts only `OFF_TRACK` or `RED_FLAG` (`app/features/home/index.tsx:53`, `app/features/roster/roster-row.tsx:11-12`), so `CHECKIN_OVERDUE` never counts. The first question of the weekly loop gets a false answer.
2. **[critical] The plan editor is a dead end that offers Publish.** Draft v2 for "xyz" shows 0/1890 kcal, 0/209 g protein, "-100.0%", no meals, "Matches daily template", "Apply this day to all days", and a full-width **Publish plan** (`D/24-plan.png`, `M/24-plan.png`). Code: meal sections come from existing items, so an empty draft renders no "Add food" (`app/features/plan/plan-editor.tsx:133-135`). Regenerate only renders when status is not DRAFT (`plan-editor.tsx:215`). The coach cannot add food, cannot regenerate, and can only publish. The server will demand a drift acknowledgement, but the UI walks them right up to it.
3. **[high] One fact, many faces.** Adherence is a 0–100 % input (`D/18-check-in.png`), a red "20%" ring (`D/19-check-in-detail.png`), "~100%" text (`D/21-history--tall.png`) and "10/10" circles (`D/22-journey--tall.png`). The engine stores a 1–5 rating (`app/features/check-in/adherence.ts`), so a coach who types 61% sees "~80%" afterwards. Verdicts read "HOLD" in History, "On track" in Journey and "On track. Hold the course" after submit; INSUFFICIENT_DATA shows as "INSUFFICIENT_DATA", "INSUFFICIENT DATA", "Need more data" and "Not enough data yet".
4. **[high] Task screens lose the client.** Record vitals, Edit goal, Weekly check-in, Check-in detail, Dietary profile and the plan editor show no client name, avatar or breadcrumb (`D/16`…`D/20`, `D/24`). With 30 clients, logging a weight against the wrong person is easy, and the severe-allergy chip disappears exactly where food is edited.
5. **[high] The loop's actions are hidden.** The hub has no primary action. "Log check-in", "Log vitals", "Edit goal", "Edit dietary profile", "Open plan" and "Download Client Intake PDF" all sit behind a hamburger (three-line) icon at the top right (`D/13-client-hub-rich.png`, `app/features/client-detail/client-hub-more-menu.tsx`). A hamburger means "navigation menu" by convention; it is not where anyone looks for "start check-in".
6. **[high] Raw system language reaches the coach.** Enums: "INSUFFICIENT_DATA", "CHECKIN OVERDUE", "HOLD", "DUE", "DRAFT". An engine string: "need ≥4 weigh-ins over ≥10 days; have 3 over 0.04", where the unit is missing (`D/19`). Developer subtitles: "Capture → verdict → optional apply" (`D/18`), "Edit inputs and re-run the engine" (`D/19`), "Layer 1" and "Layer 2" badges (`D/29`, `D/31`), "PDF matches the locked diet-plan template (Breakfast/Lunch options, Dinner list)" (`D/24`). Dates are ISO ("2026-08-06") or US with seconds ("8/6/2026, 10:48:39 PM", `D/26`), while the greeting uses en-PK.
7. **[high] Dates, windows and units disagree across screens.** History lists check-ins on 2026-07-30, 07-23 and so on, while Journey shows the same series as Jul 31, Jul 24 and so on, every date one day later (`D/21-history--tall.png` vs `D/22-journey--tall.png`; timezone bug, inferred). The Overview chart's window ends "Oct 4" (`D/13`), but Journey projects the goal for **Jan 24, 2027**. For the same client, the goal form shows "Custom pace" (`D/17`) and the Plan tab says "Standard · 0.51 kg/wk" (`D/25`). Settings says measurements are in inches and height in ft/in (`D/27-settings--tall.png`), but Record vitals hard-codes cm and kg (`app/features/vitals-entry/index.tsx:41-58`), and check-in, check-in detail, roster and Home also hard-code kg.
8. **[medium] Flat hierarchy, duplicated numbers, dead space.** Home and hub both open with the "hero metric" strip of equal cards. The hub shows "Goal progress 43.4%" as a card **and** as a ring taking half the fold (`D/13`). The TDEE result repeats the target (`D/30-tools--tall.png`). The roster ships a placeholder "Progress" column of dashes (`D/11`; code comment "Progress placeholder — fixed 100" in `roster-row.tsx:134`). The pace card has about 200px of empty space (`D/17`). Most of the "plain and dated" feeling comes from this sameness, not from the colours _[opinion]_.
9. **[high] Forms are stretched, unguarded and inconsistent.** Desktop inputs run about 1110px wide for 3-digit numbers (`D/16`, `D/18`). Vitals repeats the last value as both placeholder and helper ("Last: 84.53" and "Previous: 84.53 kg"). Submit buttons are pre-disabled at 1.97:1 contrast (`D/01`, `D/16`). The intake draft lives in `useState` only (`app/features/client-onboarding/use-onboarding-draft.ts`), so a refresh loses all 8 steps. Sex defaults to Male (`onboarding-types.ts` `sex: 'M'`). A check-in can be submitted with every field empty (`app/features/check-in/index.tsx`, weight and adherence optional).
10. **[high] The accessibility floor has gaps.** Status chip and banner text fails AA: amber on its wash 2.07:1, green 2.94:1, red 3.44:1. Dietary selection is colour-only (`D/20`). On the web, `accessibilityLabel` and `accessibilityRole` reach the DOM as unknown props: React warns on all 30 authenticated captures (`index.json`), so those labels probably never reach screen readers _[inferred]_. There is zero RTL or i18n readiness for Urdu (section 6).

---

## 3. Screen by screen

Each screen covers purpose, what works, problems, phone differences, states, and the ideal. "States seen" means visible in a capture or present in code; missing states are named.

### 01–03 Auth (login, signup, forgot password): the quality reference

- **Works.** The only screens with a world: a textured, flat illustration of gym kit in ochre, cobalt and olive (`D/01-login.png`). A calm single column, visible labels, required markers, a helper line under phone ("Used to prevent duplicate accounts", `D/02`), and an honest reset copy ("We will email a verification code if the account exists", `D/03`). Per the spec, the illustration stays mounted across routes and the form slides, with a reduced-motion cut (`docs/specs/public-auth-split-layout.md`).
- **Problems.**
  - [medium] Submit buttons are pre-disabled at white on pale blue, 1.97:1 (computed). That fails AA and breaks the "keep submit enabled, show what to fix" rule (`submit-not-pre-disabled`).
  - [low] No show/hide toggle on password fields (`app/features/login/index.tsx` uses `secureTextEntry` only).
  - [low] On desktop the form floats without a card; on phone it sits in a card (`M/01-login.png`). Harmless.
  - [low] The login sub-label "COACH" uses the tracked-uppercase eyebrow pattern Impeccable bans.
- **States.** The OTP flows were not captured; the code has errors and lockout handling (spec FR-C1).
- **How the rest should match, then surpass.** The app shell should feel like the same product the coach just signed into. Today, signing in drops you from a warm, crafted world into an anonymous admin template. Carry the auth world's palette relationship (warm neutrals with a confident cobalt) and its illustration language into the empty states, the 404 and first-run screens, and keep its calm, single focus per screen. Surpass it on states: enabled submit buttons with inline errors, password reveal, paste-friendly OTP.

### 10 Home (`D/10-home.png`, `M/10-home--tall.png`, `DD/10-home.png`)

- **Purpose.** Answer "who needs me today, and what do I do first?"
- **Works.** A personal greeting with the date. A "Due today" list with overdue chips and chevrons. A skeleton exists (`app/features/home/home-skeleton.tsx`).
- **Problems.**
  - [critical] The summary contradicts the list (problem 1).
  - [high] The "Due today" heading sits over items that are 91 to 109 days overdue, and the "5 pending" chip is amber at 2.15:1.
  - [high] There is no action from the row except opening the client. "Start check-in" is the obvious verb and it is missing.
  - [medium] The 4-stat strip (Needs attention 0, Total 5, On track 5, High alerts 0) takes the first fold and duplicates the list, with numbers that can't be trusted.
  - [medium] ISO dates ("Weekly check-in · 2026-08-06").
  - [low] The eyebrow "MONDAY, 23 NOVEMBER".
- **Phone.** The 2x2 stats push the first client row down to about 455 CSS px, more than halfway down the first screen (`M/10-home--tall.png`). Dates wrap mid-token ("2026-" then "08-06").
- **States.** Seen: populated, and an "all clear" message ("No clients need attention."), which is falsely shown here. Missing: a zero-client first run, an error state on the home query (not checked), and a "nothing due until <date>" state.
- **Ideal.** Rename to **Today** and make it a work queue, not a dashboard.
  - **Top line, one sentence, computed from the same source as the list:** "5 check-ins overdue · 1 draft plan waiting to publish · 0 red flags."
  - **Filter chips instead of stat cards:** Overdue 5 · Due today 0 · Drafts 1 · Needs review 0 · Red flags 0. They scope the list below; the active chip is filled.
  - **Queue rows** (64px desktop, 72px phone): avatar, name, a reason in words ("Check-in 109 days overdue · last weight 84.5 kg on 6 Aug"), a severity icon plus text (never colour alone), and a trailing primary **Start check-in** button (or **Review plan** for drafts or needs-review). Row click opens the hub.
  - **Grouping by urgency:** Red flags (REFER_REVIEW) first, then Plans blocked (NEEDS_REVIEW), then Overdue (sorted by days), then Due today, then Drafts awaiting publish.
  - **Desktop right rail (4 of 12 columns):** "This week" progress (check-ins done 0/5 as a plain bar with numbers), recent activity (plans published, new clients). Keyboard: `J`/`K` to move, `Enter` to open, `C` to start a check-in, `⌘K` for the palette.
  - **Phone:** chips become a horizontally scrolling chip row pinned under the large title; the queue fills the screen; "Start check-in" stays reachable on the row's trailing edge.
  - **First run (0 clients):** an illustrated empty state in the auth world, "Add your first client" (primary) plus "See how targets are calculated" (link).
  - **Motion:** when a check-in completes and you return, that row collapses out (200ms) and the counts tick. State change only, no choreography.

### 11 Clients roster (`D/11-clients.png`, `M/11-clients.png`, `DD/11-clients.png`)

- **Purpose.** Find a client and scan caseload health.
- **Works.** Search, filter chips with counts, a "New client" primary, mobile cards with a status pill, a skeleton.
- **Problems.**
  - [critical] Statuses are wrong (problem 1): everyone is "On track" or "New" despite being overdue.
  - [high] The columns that matter for a weekly loop are missing: last check-in, next due, plan status (none, draft, published, needs review).
  - [medium] Goal appears twice (under the name **and** in a Goal column). Progress is a dead column of dashes.
  - [medium] Desktop drops the "CHECKIN OVERDUE" chip that the phone card shows (`M/11-clients.png` for Adnan), so the same data renders differently by breakpoint.
  - [medium] The search input has no search icon, and its placeholder is near-black, so it reads like typed text.
  - [medium] Weight "84.53" renders with mono letter-spacing as "84 . 53".
  - [medium] Chip contrast fails (green 2.94:1, amber 2.07:1).
  - [low] Every avatar is the same blue disc, which carries no information.
  - [low] Headers aren't sortable.
- **Phone.** Cards are 76px; the raw enum "CHECKIN OVERDUE" is uppercase red; "New client" sits top-right, out of thumb reach.
- **States.** Code has an empty state and a no-match branch (`app/features/roster/index.tsx:172`). Not captured.
- **Ideal.**
  - **Desktop table**, sticky header, sortable with `aria-sort`. Columns: **Client** (name, goal tag on the second line), **Status** (one reason in words plus an icon: "Overdue 109 d", "Red flag", "New", "On track"), **Last check-in** ("6 Aug · 109 d ago"), **Next due**, **Weight** (current in the preferred unit plus change since start, "−3.5 kg"), **Plan** ("Published v1" / "Draft v2" / "Needs review" / "None"), **Adherence** (last value, in the one global format).
  - **Row hover** reveals quick actions at the right edge (Check-in, Log vitals). The whole row is a link.
  - **Search** with an icon and `/` shortcut. Filter chips include **Overdue**. A "No matches for 'xy'" state with a clear-search action.
  - Above about 50 clients, virtualise the list.
  - **Phone:** 72px rows (avatar, name, a status line in words, chevron); search pinned; "New client" moves to the large-title nav bar trailing button on iOS and a FAB on Android, the one place a FAB is right.

### 12 New client intake (`D/12-clients-new.png`, `M/12-clients-new.png`)

- **Purpose.** Capture identity, body, goal, safety gates and diet; show the client their projected journey; collect the signature.
- **Works.** Progress bar with a step count. Validation per step (`validate-step.ts`). Unit-aware fields. A focus chain on the keyboard. The review step shows a projected journey and safety banners (`step-sign.tsx`). The tab bar is hidden on phone so the coach stays in the task.
- **Problems.**
  - [high] 8 steps, some with a single field (step 2 is "Height" alone, `onboarding-types.ts STEP_META`).
  - [high] The draft is in memory only; a refresh or interruption loses everything.
  - [high] No exit on step 1: no Cancel, no Back, no close (`D/12`; `onboarding-footer.tsx` shows Back only when `canGoBack`).
  - [medium] Defaults bias the data: sex = Male, activity = Moderate, goal = Lose (`INITIAL_DRAFT`).
  - [medium] The page title is the step name ("Identity") and the subtitle is "New client", which is inverted.
  - [medium] Label styles mix: "Full name *" in sentence case next to "DATE OF BIRTH" in tracked caps.
  - [medium] The sex control has no visible label.
  - [medium] "Optional: Age 30 assumed for targets until set" silently feeds BMR, and nothing later shows the assumption.
  - [medium] Inputs are about 1110px wide on desktop.
  - [low] Server errors only render on the final step (`index.tsx`, `onboard.isError` under `StepSign`).
- **Phone.** Same layout. The sticky footer "Continue" is in the thumb zone (good).
- **States.** Saving shows "Saving…" on the button. Missing: draft resume, an unsaved-changes guard, an error summary on submit.
- **Ideal** (full flow in section 5). The essentials:
  - **Five steps:** Client → Body & activity → Goal & safety → Diet → Review & sign.
  - **Desktop:** a left step rail with names, check marks and jump-back to finished steps; a form column capped at about 640px; a right **live preview** card ("2,261 kcal · 160 g protein · goal ~24 Jan 2027"). The preview makes Layer 1 visible while the coach types.
  - **Phone:** close (X) top-left with a "Save draft?" confirm; a step name and count under the title; sticky Back/Continue.
  - **Drafts** persist and resume ("Resume intake for Sara (step 3 of 5)" on Today).
  - **Sex** is a required radio with no default.
  - The **Review** step gets per-section "Edit" links, and the signature canvas is large, with "Clear".

### 13–15 Client hub, Overview tab (`D/13-client-hub-rich.png`, `D/14-client-hub-plans.png`, `D/15-client-hub-empty.png`, `M/13…--tall.png`, `DD/13…`, `MD/13…`)

- **Purpose.** One person: where they stand, what's wrong, what to do next.
- **Works.**
  - The sticky identity header with tabs (`client-hub-header.tsx`).
  - A severe-allergy banner with a shield icon.
  - A weight-journey chart with goal line, expected line and milestones; its legend is labelled, and it carries a screen-reader summary on native (`ui/components/weight-chart.tsx:321`).
  - Popover on desktop, bottom sheet on phone for the menu.
- **Problems.**
  - [high] No primary action; the loop's verbs are behind a hamburger (problem 5).
  - [high] The hub never says the check-in is 109 days overdue. Home does; the hub doesn't.
  - [high] The banner says "Onboarding incomplete. Complete intake to unlock meal planning, check-ins, and credential PDF." Check-ins and plan generation **do** work for this client (`D/21`, `D/25`), the banner has no CTA, and no flow lets an existing client sign (the signature pad lives only in the intake wizard, `client-onboarding/step-sign.tsx`) _[inferred from code search]_.
  - [medium] Goal progress is duplicated as a card plus a ring. On the phone the ring is about 330px tall (`M/13…--tall.png`).
  - [medium] Chart truth: the window ends "Oct 4" while the goal is projected for Jan 24, 2027 (problem 7). The current point sits on the "50%" milestone label while the ring says 43%, which looks contradictory. For clients with a single weigh-in ("xyz", "abc"), the chip says "Needs focus" when the truth is "no weigh-ins since 6 Aug" (`D/14`, `D/15`), and "- 0.0 kg" sits in a success-green wash.
  - [medium] "Pace 0.51 kg/wk" doesn't say whether that is planned or actual.
  - [medium] Plan status is absent from Overview. The "with plans" and "empty" hubs look identical (`D/14` vs `D/15`).
  - [medium] Phone numbers show raw ("03358749560", "344565464567") even though the code calls `formatInternational`, so formatting falls back silently _[inferred]_.
  - [medium] The WhatsApp action is a small, unlabelled blue speech bubble. It isn't recognisably WhatsApp and has no visible name (`D/14`).
  - [low] Banners use a 3px coloured left rail (`ui/components/alert-banner.tsx`); Impeccable bans coloured rails thicker than 1px. Their titles are amber 2.07:1 and red 3.44:1 on the washes.
- **Phone.** Everything stacks: two banners, 2x2 stats, chart, giant ring: about 1.6 screens of passive content with nothing actionable except the hamburger. No back affordance in the header (system back only).
- **Dark.** Heavy saturated brown and maroon banner washes; the weigh-in line is blue-700 on zinc-900 at 2.64:1, below the 3:1 floor for graphics (`DD/13`, `MD/13`).
- **States.** Skeleton exists (`client-hub-skeleton.tsx`). Missing: the "one weigh-in" empty-trend state, "no goal" (the code has a "Set a goal" path in the Plan tab), and an error state.
- **Ideal.**
  - **Persistent client header**, present on _every_ client screen, including tasks and the plan editor: avatar; name; a status chip in words ("Check-in 109 d overdue"); a fact line ("34 y · 175 cm · Lose 88 → 80 kg · Plan: none · Last check-in 6 Aug"); a pinned **severe-allergy chip** ("Peanut, severe", danger tone, shield icon); a labelled **WhatsApp** button; primary **Start check-in**, secondary **Log vitals**, and an overflow "…" (Edit goal, Dietary profile, Intake PDF).
  - **"Next steps" card first**, built from engine state, one line each with a button: "Check-in overdue by 109 days → Start check-in"; "Intake not signed → Collect signature"; "No meal plan → Generate". This replaces the passive banners.
  - **Main area** (desktop 8 of 12 columns): one weight chart with a clear "Today" marker, the projected path dashed and labelled "projection", and the goal date printed at the end of the projection ("80 kg ~24 Jan 2027"); a table toggle (`data-table` rule).
  - **Side area** (4 of 12): current targets (kcal and macros, with source: "from goal · adjusted 30 Jul"), last check-in summary, adherence trend in the one format.
  - **Drop the ring.** Progress becomes one line under the chart: "43% · 4.5 kg to go · on pace for 24 Jan 2027".
  - **Single-weigh-in client:** "1 weigh-in so far. Log weight at each check-in to draw the trend," plus the projection only.
  - **Phone:** the header collapses to avatar, name and status on scroll; "Next steps" comes first; the overflow opens the existing bottom sheet.

### 16 Record vitals (`D/16-vitals-new--tall.png`, `M/16…--tall.png`)

- **Purpose.** Append a measurement set without overwriting history.
- **Works.**
  - Grouped sections (Body composition, Circumferences, Cardio).
  - Last values shown.
  - Clear rules ("Fill only what you measured", "Prior values are never overwritten").
  - Paired left/right limb fields.
  - A success screen exists in code (`vitals-entry/index.tsx:105`).
- **Problems.**
  - [high] No client identity on the page.
  - [high] cm and kg are hard-coded while Settings says in and ft/in (problem 7). A coach working in inches will type inches into a cm field.
  - [medium] The last value appears twice (placeholder "Last: 84.53" plus helper "Previous: 84.53 kg"). The grey placeholder can be mistaken for a filled value.
  - [medium] 13 full-width fields; a single column 1354px tall on desktop.
  - [medium] No measurement date (it assumes now), so a reading can't be back-dated.
  - [medium] Pre-disabled Save at 1.97:1.
  - [low] Tracked-caps section eyebrows.
  - [low] The success screen is a dead-end page with "Back". It doesn't land back on the hub showing the new point.
- **Phone.** Long scroll (2708px at 2x); a numeric keypad (`inputMode` decimal).
- **Ideal.**
  - **Desktop:** open as a **side sheet over the hub** (about 480px), so the chart stays visible.
  - **Rows** with the label left, a compact input (about 140px) with the unit from preferences, and a right column "Last 84.5 kg · 6 Aug" plus a live change chip once typed ("−0.4 kg").
  - **Date** field defaulting to today.
  - Circumferences collapsed under "Add measurements".
  - **Save** stays enabled; an empty submit says "Enter at least one measurement".
  - On save: the sheet closes, a toast reads "Vitals saved for Adnan", and the new point eases into the chart.
  - **Phone:** a full-screen modal with the client header and a sticky Save.

### 17 Goal, new or edit (`D/17-goal-new--tall.png`, `M/17-goal-new--tall.png`)

- **Purpose.** Choose activity, goal and pace; set the calorie target within the safety floors.
- **Works.** Live kcal and kg/wk readout. The slider shows a suggested value and a floor (red tick). The safety framing is honest ("A manual calorie override warns instead of blocking").
- **Problems.**
  - [high] No client identity.
  - [high] The slider's ticks and the red floor tick are **unlabelled**: nothing says "Standard", "Aggressive" or "Floor 1,500 kcal". Only the "Custom pace" chip names anything.
  - [high] The **projected goal date**, the most meaningful output, is not shown.
  - [medium] "2,261" renders in mono with a full-width comma ("2 , 261"), which reads like two numbers. The same happens in `D/30`.
  - [medium] The pace card wastes about 200px on desktop and about 380px at 2x on phone.
  - [medium] Selected segments are white on #F4F4F5 (1.1:1 difference): the selected state is weak.
  - [medium] "How it works" links to `/settings/nutrition` (`goal-form/index.tsx:183`), a full navigation away from unsaved changes, and it redirects into Tools.
  - [medium] "Custom pace" here disagrees with "Standard" on the Plan tab.
  - [low] The footer copy "The AI never invents numbers" is marketing voice inside a tool _[opinion]_.
- **Ideal.**
  - **Two panes on desktop.**
    - **Left, inputs:** activity as a segmented control whose selected state is unmistakable, with a one-line description of the chosen level beneath it ("Moderate: training 3–5 days a week"); goal; target weight; start weight read-only with a "Change" link; the pace slider with **labelled stops** (Gentle · Standard · Faster) and a labelled floor marker.
    - **Right, a live outcome card:** daily kcal, P/C/F grams, weekly change, **projected goal date**, and a safety state in words.
  - "How it works" opens a side sheet with the targets explainer anchored to "Goal calories".
  - An unsaved-changes guard on Cancel or back.
  - **Phone:** a single column, the outcome card sticky as a compact bar above the footer ("2,261 kcal · goal ~24 Jan").

### 18 Weekly check-in (`D/18-check-in.png`, `M/18-check-in.png`, `DD/`, `MD/`)

- **Purpose.** Capture the week (weight, adherence, notes), get the engine's verdict, and optionally apply new targets.
- **Works.** Three fields, a sticky footer, a focus chain, "Analyzing…" while pending. The verdict screen in code shows a narrative, reasons and proposed targets, and "Apply and draft an adjusted plan" goes straight to re-solve (`check-in/index.tsx`).
- **Problems.**
  - [high] No client context: no name, last weight, days since the last check-in, or current plan. The placeholder is "e.g. 84.2", where vitals shows the last value.
  - [high] Adherence as 0–100 % is false precision mapped to 1–5 (problem 3). The empty grey bar under it is an unlabelled progress bar.
  - [high] Every field is optional, so an empty check-in submits.
  - [medium] Developer subtitle ("Capture → verdict → optional apply").
  - [medium] The verdict (code) shows the raw type badge (`verdict.type.replaceAll('_',' ')`) and "confidence 72%". It lives in component state on the same URL, so a refresh loses it.
  - [low] Desktop leaves a large empty canvas under a card 1148px wide.
- **Ideal** (full flow in section 5).
  - A **check-in workspace** with the client header.
  - **Left:** last check-in (date, weight, adherence, notes), a mini weight trend, current targets.
  - **Right:** weight with the last value and a live change ("−0.6 kg in 7 days"); adherence as a **5-step segmented control in words** matching the engine (Off plan · A few days · About half · Most days · Every day); notes.
  - The primary button says **Get verdict**.
  - The verdict appears in place, and the URL moves to `/check-ins/[id]`. It shows a plain title, the reasons as sentences, actual against expected kg/week as a small visual, and the recommended action as the primary button ("Apply −150 kcal and draft plan v3"), with "Keep current plan" secondary.
  - From the Today queue, **"Next client →"** for batch Mondays.

### 19 Check-in detail (`D/19-check-in-detail.png`, `M/19-check-in-detail.png`)

- **Purpose.** Look back at a past check-in, and correct it if needed.
- **Works.** The verdict card sits on top, and correction is possible.
- **Problems.**
  - [high] It opens **straight in edit mode** ("Edit inputs and re-run the engine", primary "Save & re-run"). A historical record should be read-only by default, because re-running replaces the verdict.
  - [high] The reason string is raw and broken ("have 3 over 0.04", unit missing; probably days, so 3 weigh-ins within about an hour) _[inferred]_.
  - [medium] Raw enum badge "INSUFFICIENT DATA".
  - [medium] ISO date in the title, no client name.
  - [medium] Adherence shows as an input "20" **plus** a ring "20% ADHERENCE": two encodings of one value on one screen.
  - [low] The notes placeholder shows even though notes were empty. Show "No notes" instead.
- **Ideal.**
  - A **read view**: the verdict card (title, reasons as sentences, the action taken: "Held" or "Applied −150 kcal → plan v3"), the inputs as a definition list (weight with change, adherence in words, notes), and previous/next check-in arrows.
  - An **Edit inputs** secondary button switches to edit mode with a warning: "Re-running replaces this verdict. The plan isn't changed unless you apply again."

### 20 Dietary profile (`D/20-dietary.png`, `M/20-dietary.png`)

- **Purpose.** Record severe allergies (hard blocks), religious or lifestyle rules, and preferred foods. Saving re-validates the live plan (spec FR-C7).
- **Works.** Severe allergies are visually separated in a danger card. The copy says what they do ("hard blocks in the meal engine"). The version number is shown. A blocked-plan banner exists in code (`dietary/index.tsx:184`).
- **Problems.**
  - [high] Selection is **colour-only**: a red outline and red text for "Peanut", a blue outline for "Halal". No fill, no check icon. For a safety-critical choice, selected and unselected must differ in shape as well as hue (`color-not-only`).
  - [high] No client identity.
  - [medium] The red card is red whether or not anything is selected (`Card tone="danger"`), so alarm becomes decoration.
  - [medium] A fixed list of 9 allergens with no "other" (`dietary-catalog.ts`). A mustard or lupin allergy cannot be recorded _[product decision: custom allergens can't be auto-filtered unless mapped to tags]_.
  - [medium] No preview of impact before save, though the spec says a write can flip a published plan to NEEDS_REVIEW.
  - [medium] The "Preferred foods" copy says the foods are "picked by the AI planner", which contradicts ADR-0001, where the solver picks and the model only names. That undercuts the product's own trust story.
  - [low] "+ Add preferred food" is centred grey text that reads as a disabled label.
- **Ideal.**
  - **Severe allergies** as a checkbox-chip group: selected = filled danger chip, check icon, `aria-pressed`/`aria-checked`, bold label. The card goes neutral when none are selected; once at least one is, a danger header reads "1 severe allergy · hard-blocked in every plan".
  - An "Other allergen" row whose warning states what happens (needs a decision).
  - **Lifestyle** chips with the same selected grammar in the accent tone.
  - **Preferred foods** through a catalog search picker, with chips.
  - **Save** shows an impact line before committing: "Saving will mark published plan v1 as Needs review." Then confirm.
  - A version history link ("Version 2 · changed 6 Aug").

### 21 History tab (`D/21-history--tall.png`, `M/21-history--tall.png`)

- **Purpose.** Past check-ins.
- **Works.** Reverse-chronological order; each row links to its detail.
- **Problems.**
  - [high] **No weight** in a weight-loss check-in history: only "Adherence ~100%".
  - [high] Raw enums ("INSUFFICIENT_DATA", "HOLD", "DUE").
  - [high] Dates disagree with Journey by a day (problem 7).
  - [medium] The overdue check-in reads "2026-08-06 DUE" in amber, not "Overdue 109 days".
  - [medium] Each row is a 90–100px card with two facts; 8 check-ins fill 960px.
  - [medium] No chevron or other row affordance.
  - [medium] It overlaps almost entirely with Journey.
- **Ideal.** Fold it into Journey as a "Table" view (decision in section 4). If it stays separate, use a dense table:
  - Date ("30 Jul · Thu"), weight, change, adherence (global format), verdict (words plus icon), action taken, notes icon, chevron.
  - The overdue item pinned as an alert row with **Start check-in**.
  - Optional filter to include vitals entries and plan publishes as events.

### 22 Journey tab (`D/22-journey--tall.png`, `M/22-journey--tall.png`)

- **Purpose.** The story of the goal: start, each check-in, "you are here", projected milestones and target date.
- **Works.** The best concept in the app _[opinion]_: a vertical timeline, a highlighted "You are here" node, projected milestones in dashed cards, "View check-in" links, and an overdue node with "Log check-in". It explains rather than reports.
- **Problems.**
  - [high] The order is broken: "You are here (Nov 23)" comes **before** "Check-in overdue (Aug 6)".
  - [high] Check-in nodes show adherence ("10/10") but **not weight**, the quantity the journey is about.
  - [high] Dates are shifted by a day against History.
  - [medium] Each check-in card is about 155px with a meaningless repeated title ("Check-in complete"). 8 check-ins take 2764px on desktop and about 3.6 phone screens.
  - [medium] "Behind the expected 80.0 kg path" misnames the path: 80 kg is the goal, not the expected weight.
  - [low] A narrow 700px column inside an otherwise full-width hub; the tabs change content width.
- **Ideal.**
  - **Desktop:** the weight chart across the top, with check-in markers. Below it, a compact timeline aligned to the same time axis. Hovering or focusing a node highlights the point on the chart, and the reverse.
  - **Each check-in row (56px):** date · weight · change · adherence · verdict chip, expandable for notes and actions.
  - **"Today"** is a thin labelled rule in chronological position, with the overdue item just before it.
  - **Projection** below in a lighter, dashed treatment, with the target date as the end cap.
  - This tab is the natural home for the **WeaveLine** signature motif (coach review promptness × client adherence), as the design reference intends. The visual treatment is for the visual-direction agent.
  - **Phone:** the chart (180px) on top, then rows. The intake review step reuses this same projection as the client-facing "Your expected journey" moment.

### 23 Meal Plan tab, with plans (`D/23-meal-plan.png`, `M/23-meal-plan--tall.png`, `DD/23`, `MD/23`)

- **Purpose.** Plan status for this client: goal context, dietary context, the current plan, and the way into the editor.
- **Works.** Active goal facts in one place, the dietary summary, the plan's version and status, and the macro targets.
- **Problems.**
  - [high] Only the newest plan is shown ("v2 · Draft"). **The published v1 the client is actually following is invisible** (the code shows `currentPlan` only).
  - [high] The plan card is a link, but nothing looks clickable: no chevron, no "Open", no "Review & publish" button (`client-hub-plan.tsx` wraps the card in a Link).
  - [medium] The macro row shows _targets_ in the same style as plan totals, so it's ambiguous. Fiber appears here but not in the editor.
  - [medium] "No restrictions recorded. Tap to add." on desktop ("Tap"), set as body text that doesn't read as a link.
  - [medium] "Edit goal" and "Edit" are grey ghost text with weak affordance.
  - [medium] The DRAFT badge is amber at 2.07:1.
  - [low] Goal facts repeat the Overview.
- **Ideal.** Plan status first:
  - **Live plan:** "Published v1 · since 6 Aug · 1,890 kcal". Actions: View, PDF.
  - **Draft v2:** "Draft v2 · created 30 Jul from check-in · +120 kcal vs live · 4 foods swapped". Primary **Review & publish**, secondary Edit, Discard.
  - **Needs review** state in danger tone at the top, when present.
  - Targets with their source; the dietary summary with the severe-allergy chip.
  - A collapsed version list (v1, v2…).

### 24 Plan editor (`D/24-plan.png`, `M/24-plan.png`)

- **Purpose.** Inspect and edit a 7-day draft (portions, swaps, regenerate a meal), then publish after review.
- **Works.**
  - A back arrow with an accessible label.
  - An editable title.
  - The day selector.
  - Totals compared with targets.
  - The "Customized day" marker in code.
  - An explicit review confirmation with a drift-ack variant ("Publish with off-target totals").
  - Regenerate copy that explains the live plan stays live (`plan-editor.tsx:245`).
- **Problems.**
  - [critical] An empty draft is a dead end, and Publish is the main action (problem 2).
  - [high] No client name, and **no severe-allergy indicator in the one place food is chosen**. Peanut-allergic Adnan's plan would look the same as anyone's.
  - [high] The versions switcher is a segmented control labelled "Custom Meal Plan" vs "v1" (title vs number). It won't scale past about 3 versions, and it hides which one is live.
  - [high] Totals are per day only. Nothing shows week drift, which days are off-target, or the allergen double-check result (the spec's dual check is invisible).
  - [medium] The "AI suggestion. Review before publish" box frames a solver output as an AI suggestion, which contradicts the product's own "numbers are code" story _[opinion; copy decision]_.
  - [medium] An unlabelled "-100.0%" chip.
  - [medium] The "Apply this day to all days" ghost button sits next to the day tabs with no undo.
  - [medium] Developer footnote about the PDF template.
  - [medium] Fiber is missing (it's on the Plan tab).
  - [low] The full-width Publish button sits mid-page on desktop, far from the content it governs.
- **Phone.** The same stack. 7 day tabs fit at 390 with little margin. Publish sits mid-screen, not in a sticky footer.
- **States.** Skeleton exists (`plan-skeleton.tsx`); generate and override states exist (`override-prompt.tsx`). Missing: the empty-draft state, the generating progress state (only the button label changes), a publish success confirmation, and the NEEDS_REVIEW layout (code has a banner).
- **Ideal.** The product's signature workflow; it deserves the most design time.
  - **Header** (sticky): the client header with the **severe-allergy chip**, "Draft v2" status, a **versions dropdown** ("v1 · Published 6 Aug" / "v2 · Draft"), and actions: Download PDF, Regenerate, **Review & publish** (primary).
  - **Desktop, three zones:**
    - **Left rail, the week** (about 200px): Mon–Sun rows, each with kcal and a drift dot (in band / off band), plus a "Customized" marker. A week summary at the bottom ("5/7 days within ±5%").
    - **Centre, the selected day:** sections Breakfast / Lunch / Snack / Dinner, each with item rows (food name, grams stepper, kcal · P · C · F in tabular figures, a provenance marker for coach overrides, swap and remove), a meal subtotal, "Add food" (inline catalog search) and "Regenerate meal".
    - **Right, sticky "Day vs target"** (about 300px): kcal and P/C/F bars against target with the tolerance band drawn; an allergen line, "Peanut: excluded · checked before and after solving" (makes FR-C7 visible); "Targets from goal · 30 Jul check-in".
  - **Review & publish** opens a sheet that summarises what the coach is signing off: days customised, days off-target (with the ack checkbox when needed), the allergen check result, a diff against the live plan, a PDF preview link, then "I reviewed this plan" and Publish. Success: a toast "Plan v2 published to Adnan · v1 superseded", and the status badge animates to Published.
  - **Empty draft:** "This draft has no meals yet," with **Generate meals** (allowed in DRAFT) and "Add food manually".
  - **Phone:** day chips scroll horizontally; a sticky bottom bar shows "1,850 / 1,890 kcal · P 205/209" and opens the target sheet on tap; tapping an item opens a bottom sheet with the grams stepper and a swap list; Review & publish moves into the nav bar trailing button.

### 25 Meal Plan tab, empty (`D/25-meal-plan-empty.png`, `M/25…--tall.png`)

- **Purpose.** Start the first plan.
- **Works.** The best empty state in the app: a title, a reason and one primary action ("Generate draft plan"). The dietary summary shows the severe allergen in red caps.
- **Problems.**
  - [high] It contradicts the Overview banner, which says planning is locked until intake is complete.
  - [medium] Generation takes two steps: this CTA navigates to `/plan`, which shows another card asking meals-per-day, then "Generate 7-day plan" (`app/features/plan/index.tsx:95-130`).
  - [medium] "SEVERE ALLERGENS, EXCLUDED FROM ALL PLANS" in red caps at small size (red-500 on white, 3.76:1, fails for 11px text).
- **Ideal.** Put the meals-per-day selector (3 · 4 · 5, with a one-line explanation of each pattern) in this card and generate in place. Show a 7-day skeleton with a progress line ("Solving portions… naming meals…"), then land in the editor. If a safety gate blocks generation, show the override prompt inline, with its audit-log explanation.

### 26 Notifications (`D/26-notifications.png`, `M/26-notifications.png`)

- **Purpose.** Things that need the coach: check-ins due or overdue, red flags, blocked plans.
- **Works.** Sorted by priority and then date (code), "Mark all read" when unread items exist, empty and error states with retry, a skeleton, an unread badge on the nav (`app-shell.tsx`), and a high-priority row that adds a wash and rail so it doesn't rely on hue alone.
- **Problems.**
  - [high] The one item is the coach's own action ("Plan published"), with no client name in the capture, while 5 overdue check-ins generate nothing.
  - [high] Rows don't link anywhere visible and have no inline action.
  - [medium] The nav says "Alerts" but the page says "Notifications".
  - [medium] Timestamp "8/6/2026, 10:48:39 PM" (`toLocaleString()` default, US order, with seconds).
  - [low] A single row inside a full-width card on a blank page.
- **Ideal.** An inbox of things to act on, grouped Today / This week / Earlier.
  - Each row is a sentence with the client name ("Adnan's check-in is 109 days overdue"), a relative time ("2 h ago", with the absolute time in a tooltip), an unread dot, and an inline action (Start check-in / Review plan).
  - Filter chips: Needs action · All. Swipe to mark read on phone.
  - Coach-initiated events (published, created) go to an activity log, not alerts.
  - Pick one name everywhere (see section 4).

### 27 Settings (`D/27-settings--tall.png`, `M/27-settings--tall.png`)

- **Purpose.** Appearance, units, profile, meal-planner instructions, account, about.
- **Works.** Sensible groups, an explanation of where units are stored ("Food and vitals stay metric in the database"), a privacy statement, a version string.
- **Problems.**
  - [high] **"Sign out of all devices" is the loudest element on the page**: a red, filled, full-width button. Plain "Sign out" is grey text. That inverts emphasis, and a destructive action dominates (`destructive-emphasis`, `primary-action`).
  - [high] The unit preferences shown here are ignored by 4 screens (problem 7).
  - [medium] Section titles ("Units", "Account") are lighter and smaller than their field labels ("Weight", bold), an inverted hierarchy.
  - [medium] "AI meal planner / Meal AI Planner" duplicates the label.
  - [medium] The coach's name and email are read-only with no edit path.
  - [low] Dark mode is an on/off toggle with no "System" option.
  - [low] Units use full-width segmented controls for two options.
- **Ideal.**
  - A grouped settings list (iOS inset groups / Material list): **Profile** (name, email, phone, editable rows with chevrons), **Preferences** (Weight kg|lb, Height cm|ft-in, Measurements cm|in as compact rows with trailing segmented controls; Appearance System|Light|Dark), **Meal planner** (one row, "Naming instructions"), **Security** (Sign out; then, separated at the bottom, "Sign out of all devices" as destructive text with a confirm dialog), **About and privacy**.
  - **Desktop:** a 720px column, or a two-pane layout with a section list on the left.

### 28 Meal AI Planner settings (`D/28-settings-meal-planner.png`, `M/28…--tall.png`)

- **Purpose.** The coach's own instructions for how meals are _named and described_, never portions or macros.
- **Works.** The scope is stated precisely twice ("never portions or macros"). An example placeholder. A preview area.
- **Problems.**
  - [medium] The toolbar "Bold Italic Heading Bullet" is plain text that reads as labels, not buttons. Rich formatting may be pointless if the model consumes plain text _[inferred]_.
  - [medium] A 3-line textarea for what is long-form guidance.
  - [medium] "Preview: Nothing to preview yet": a preview of what?
  - [low] "workspace defaults" is mentioned but not visible.
  - [low] The page title "Meal AI Planner" doesn't match the Settings row "AI meal planner".
- **Ideal.**
  - A taller editor with a character count.
  - Insertable example chips ("Prefer desi breakfasts", "Prep notes under 10 minutes", "Warm, encouraging tone").
  - A visible note on what can't be changed.
  - The workspace default shown read-only above.
  - A preview of a fixed sample day renamed with these instructions. That needs a model call, so it's a decision; failing that, a static before/after example.
  - Toolbar as icon buttons with tooltips, or removed.

### 29 Nutrition settings, redirect (`D/29-settings-nutrition.png` shows /tools/targets)

- **Purpose.** A legacy route. `apps/web/app/(coach)/settings/nutrition/page.tsx` redirects to `/tools/targets`; mobile has parity (`apps/mobile/app/(coach)/settings/nutrition.tsx`).
- **Problems.**
  - [medium] It is still linked from the goal form's "How it works" (`goal-form/index.tsx:183`), so the coach leaves an unsaved form, lands in Tools, and the sidebar highlight jumps from Clients to Tools.
  - [low] A redirect hop on every help click.
- **Ideal.** Keep the redirect for old bookmarks, but stop linking to it: contextual help opens the targets explainer in a side sheet anchored to the relevant section.

### 30 Tools (`D/30-tools--tall.png`, `M/30-tools--tall.png`)

- **Purpose.** Sandbox calculators (TDEE, BMI, macro split) and the two explainers.
- **Works.** Respects unit preferences (height in ft/in here). Live results. The same pace slider as the goal form (consistency). Clear explainer entry cards.
- **Problems.**
  - [medium] Results sit below the fold under a tall stack of inputs. On desktop, changing inputs gives no visible feedback.
  - [medium] The slider is unlabelled again.
  - [medium] "TARGET 2,109" repeats the pace card's "2,109".
  - [medium] Explainers (Read) and calculators (Operate) are mixed in one primary nav slot that the weekly loop rarely needs.
  - [low] The console shows a hydration mismatch on /tools, desktop only (`index.json`).
  - [low] Tracked-caps eyebrows ("CALCULATORS", "INPUTS", "BMR").
- **Ideal.**
  - **Desktop two panes:** inputs left (5 of 12 columns), results right and sticky (BMR, TDEE, target, each with the formula named: "Mifflin–St Jeor").
  - An "Use for a client…" action that prefills a goal form (scope decision).
  - Explainers move to a **Guides** section (or Help), reachable from Tools and from contextual help links.

### 31 How meals are planned (`D/31-tools-meals.png`, `M/31-tools-meals.png`)

- **Purpose.** Explain the solver's meal patterns, food pools and prep defaults.
- **Works.** Plain explanation ("not AI guesses"); patterns grouped by meal count.
- **Problems.**
  - [medium] The kcal-split chips look like buttons (bordered, grey, rounded) but aren't interactive, which is a false affordance.
  - [medium] 6 tabs crowd the phone width with tight gaps.
  - [low] The "Layer 2" badge is internal jargon.
  - [low] "Same keys as the generate screen" is developer phrasing.
- **Ideal.** Render each pattern as a labelled proportional bar (Breakfast 28% · Lunch 47% · Dinner 25%), since that is literally what the data is. Make the page a single scrolling article with an anchored contents list (sticky on desktop), not tabs. This is Read mode: give it a reading measure of about 70 characters.

### 32 How targets work (`D/32-tools-targets.png`, `M/32-tools-targets--tall.png`)

- **Purpose.** Explain Layer 1 (vitals → BMR → TDEE → goal calories → macros).
- **Works.** The clearest copy in the product. The five-step numbered path earns its numbers because the order matters.
- **Problems.**
  - [low] "Layer 1" badge.
  - [low] 5 tabs on phone touch the edges.
  - [low] The back arrow and the title's two-line subtitle crowd on phone.
- **Ideal.** The same article format as 31. The goal form, the intake preview and the plan editor's "Targets from…" line deep-link into the relevant section.

### 99 Not found (`D/99-not-found.png`, `M/99-not-found.png`)

- **Purpose.** Recover from a bad URL.
- **Works.** Friendly on-brand copy ("This screen isn't on the roster"), a primary "Back to home" and a secondary "View clients". The most crafted screen after auth _[opinion]_.
- **Problems.**
  - [low] The eyebrow "OFF THE FLOOR".
  - [low] The decorative ring around "404" is heavy.
  - [low] The authenticated shell (sidebar or tab bar) disappears, so a signed-in coach loses navigation.
- **Ideal.** Keep the copy. Render inside the shell when signed in, with an illustration from the auth world in place of the ring.

---

## 4. Information architecture and navigation

**Today.**

- **Primary nav** (sidebar on desktop, 5-item tab bar on phone): Home · Clients · Tools · Alerts · Settings.
- **Client hub tabs:** Overview · Journey · Meal Plan · History. The six client actions sit behind a hamburger.
- **Task routes** (vitals, goal, check-in, dietary, plan) are full pages that drop the client header. The Meal Plan tab (`/meal-plan`) and the editor (`/plan`) are separate routes. Tools mixes calculators with explainers. `/settings/nutrition` is a redirect.

**What's wrong for the weekly loop.**

- Two of five primary slots go to Tools and Settings, which are used rarely.
- The loop's centre of gravity has no single home: check-ins due, drafts to publish and plans needing review are split between Home (partially, and wrongly) and Alerts (missing).
- History and Journey overlap.
- The hub hides its verbs.
- Task screens break context.
- The canonical design reference itself specifies a **Review Queue** screen and a client-detail tab set (`docs/design-system-reference.md`, "Screens already specified"), and neither exists yet.

**Recommended IA (proposed, for Khubaib to decide; alternatives in the decision list).**

- **Primary, 4 destinations:**
  - **Today**: the queue. Merges Home with the actionable part of Alerts.
  - **Clients**: the roster.
  - **Tools**: calculators plus Guides.
  - **Account**: settings and profile. On desktop it sits in the sidebar footer with the coach's avatar.
  - Non-actionable system notices sit behind a bell in the desktop header, and in Today on phone.
- **Client hub, 4 tabs:**
  - **Overview**: header, next steps, chart, targets.
  - **Progress**: Journey and History merged, chart plus timeline, with a table toggle.
  - **Plan**: live against draft, opening the editor.
  - **Profile**: intake data, medical flags, dietary profile, goal, documents such as the intake PDF and signature.
- **Client header everywhere:** visible on all client routes, including tasks and the editor, with the severe-allergy chip and the primary **Start check-in**.
- **Tasks as overlays:** on desktop, vitals, goal, dietary and check-in open as **side sheets over the hub** (the URL still changes, for deep links). On phone, a modal stack with the client header and an explicit close. The plan editor stays full screen.
- **Global:** a `⌘K` command palette (client search, plus actions such as "check-in Adnan"), and breadcrumbs on desktop ("Clients / Adnan (Demo) / Check-in").
- **Native (for when screenshots land):** an iOS tab bar of 4 with large titles and edge-swipe back intact; an Android navigation bar of 4 on compact width and a navigation rail on tablets. Hub tabs become a segmented control on iOS and top tabs on Android.

---

## 5. Flows

### 5.1 Intake (new client)

**Today:** 8 steps: Identity → Height → Contact → Body → Goal → Medical → Diet → Review & sign.

**Friction:**

1. Single-field steps: Height alone; Identity has 3 fields.
2. No way out on step 1.
3. The draft is lost on refresh or interruption.
4. Biased defaults: Male, Moderate, Lose.
5. Age silently assumed to be 30 when no date of birth is given.
6. Safety warnings (below the sex floor, beyond the recommended pace, medical gate) appear only at Review, after the coach has chosen a pace.
7. No jump back from Review to fix one field: Back has to be pressed up to 7 times.
8. The server error shows only on the last step.
9. Signature is mandatory, and an existing unsigned client has no way to sign later.

**Ideal (5 steps):**

1. **Client:** full name, sex (required radio, no default), date of birth (if skipped, show "Targets will assume age 30" as a visible note that follows the client to the hub), phone with a "WhatsApp" checkbox, email.
2. **Body & activity:** height, weight (units from preferences with an inline toggle), "Add measurements" (collapsed), activity level with descriptions.
3. **Goal & safety:** goal, target weight, the pace slider with labelled stops, medical conditions, physician clearance, pregnancy (female only). Safety banners appear **here**, live, as values cross thresholds.
4. **Diet:** severe allergies (checkbox chips), lifestyle, preferred foods (optional).
5. **Review & sign** (client-facing, presentable): summary cards with **Edit** links that return to the step and come back to Review; the projected journey; a large signature pad with Clear; "Create client".

Across all steps:

- **Live preview rail** on desktop: targets and goal date update as fields fill.
- **Draft persistence:** autosave each step. Today shows "Resume intake: Sara, step 3 of 5". Closing asks "Keep draft / Discard".
- **After create:** land on the hub with a toast ("Adnan added"), and "Next steps" leads with **Generate first plan**.
- **Signature later:** if the product keeps signature mandatory (decision), add a **Collect signature** flow from the hub for clients created before the rule.

### 5.2 Weekly check-in

**Today:** Home row or hub hamburger → `/check-in` (weight, adherence %, notes, all optional) → Submit ("Analyzing…") → the verdict card replaces the form on the same URL → "Apply and draft an adjusted plan" → `/plan`, or "Done" → hub.

**Friction:**

1. No context: last weight, days since, current targets.
2. False-precision adherence %.
3. An empty submit is allowed.
4. Raw verdict enum and "confidence".
5. The verdict is lost on refresh.
6. No batch path through a busy Monday: each client takes 3 or more page loads.
7. INSUFFICIENT_DATA gives an unreadable reason and no next step.
8. "Apply" jumps to an editor without saying what changed.

**Ideal:**

1. **Today →** "Start check-in" on a queue row (or the hub's primary button).
2. **The workspace opens** (desktop side sheet, phone modal) with the client header and last check-in summary.
3. **Weight:** the last value is shown and a change appears live. The field is required unless "No weigh-in this week" is ticked, which records adherence only.
4. **Adherence:** a 5-step control in words (matching the 1–5 engine).
5. **Notes**, optional.
6. **Get verdict** → the verdict renders in place, and the URL becomes `/check-ins/[id]` so refresh and share work.
7. **Verdict card:**
   - **HOLD:** "On track. Keep the current plan." Primary **Done** (or **Next client →** in batch).
   - **ADJUST_TARGETS:** "Adjustment recommended: −150 kcal/day." Why: "Lost 0.2 kg/week vs 0.5 expected over 3 weeks." Primary **Apply and draft plan v3**, secondary Keep current plan.
   - **ADHERENCE_FOCUS / PLATEAU_PROTOCOL:** a plain recommendation and a suggested message to send on WhatsApp (copy prefilled; the coach sends it).
   - **REFER_REVIEW:** danger tone, apply disabled, physician guidance, logged.
   - **INSUFFICIENT_DATA:** "Not enough weigh-ins yet: need 4 over 10 days, you have 3 over 1 day," with a CTA **Log vitals** and a note to weigh in at each visit.
8. **Apply →** a new draft is solved. Show a short diff ("−150 kcal: rice 180 g → 140 g on 7 days"), then **Review & publish** (5.3).
9. **Batch:** after Done, "Next: Hafsa Yaseen (105 d overdue) →". A count shows progress ("2 of 5 done").

### 5.3 Meal plan: generate, edit, publish

**Today:** Plan tab → "Generate draft plan" → `/plan` (choose 3/4/5 meals) → "Generate 7-day plan" (button text "Generating…") → editor (version segmented control, day totals, day tabs, meals with Add food and Regenerate meal) → "Publish plan" → inline confirm "I reviewed this plan. Publish" (plus "Publish with off-target totals" on a drift error) → status flips. No toast; no message to the client.

**Friction:**

1. Two-step generate.
2. No progress feedback beyond the button label.
3. The empty-draft dead end, with Publish prominent.
4. Per-day totals only; week drift invisible.
5. The allergen dual check invisible.
6. The live plan invisible next to the draft.
7. No diff before publish.
8. The versions control doesn't scale and mixes title and number.
9. No client name or allergy chip in the editor.
10. Fiber missing in the editor.
11. "AI suggestion" framing undercuts the solver story.
12. No success confirmation.
13. "Apply this day to all days" has no undo.

**Ideal:**

1. **Generate in place** from the Plan tab: meals-per-day chooser, then **Generate draft**. A skeleton of 7 days with a stage line ("Checking restrictions → solving portions → naming meals"). Safety-gate override inline if blocked.
2. **Land in the editor** (layout in section 3, screen 24), with the client header and allergy chip, the week rail with drift dots, and the "Day vs target" panel showing the allergen check result.
3. **Edit:** grams stepper (±10 g, typed value allowed), swap list ranked by the solver, regenerate meal, add food. Every edit updates totals immediately with a 150ms number tween, and "Customized" marks the day. "Apply this day to all days" asks for confirmation and offers Undo in a toast.
4. **Review & publish** sheet: days customised, days off-target (ack checkbox only when needed), allergens checked (pass), a diff against the live version, PDF preview, "I reviewed this plan", then **Publish**.
5. **After publish:** a toast "Plan v2 published · v1 superseded", the badge animates, and the Plan tab shows "Live: v2". Optionally, "Share PDF on WhatsApp" (the coach sends it).
6. **NEEDS_REVIEW** (after a dietary change): the Plan tab and Today show "Plan blocked: peanut added. Review." The editor opens with the violating items highlighted and a "Replace with safe alternative" action per item.

---

## 6. Accessibility and quality floor

**Contrast, computed from tokens** (WCAG 2.x formula on `tamagui.config.ts` values):

| Pair                                                        | Ratio   | Where                                                                     | Verdict                                                                                    |
| ----------------------------------------------------------- | ------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| warning text `#F59E0B` on warningMuted `#FFFBEB`            | 2.07:1  | "New", "DRAFT", "Needs focus", "5 pending", "Onboarding incomplete" title | Fails AA                                                                                   |
| warning `#F59E0B` on white                                  | 2.15:1  | the "5 pending" chip edge, amber text elsewhere                           | Fails                                                                                      |
| success `#0EA600` on successMuted `#E6F9E5`                 | 2.94:1  | "On track", "HOLD", "▼ 3.5 kg"                                            | Fails AA for text                                                                          |
| danger `#EF4444` on dangerMuted `#FEF2F2`                   | 3.44:1  | "109d overdue", "Severe allergies" title                                  | Fails AA for 12–13px text                                                                  |
| danger on white                                             | 3.76:1  | "SEVERE ALLERGENS, EXCLUDED…" (11px)                                      | Fails                                                                                      |
| white on disabled primary (about `#A3B8F0`, sampled by eye) | ≈1.97:1 | Sign in, Continue, Save measurements                                      | Fails (disabled is exempt, but the buttons are pre-disabled, so this is the resting state) |
| placeholder zinc-400 on white                               | 2.56:1  | every input placeholder                                                   | Below the 4.5:1 floor the craft rules set for placeholders                                 |
| textMuted zinc-500 on the coach canvas `#F5F8FF`            | 4.55:1  | subtitles                                                                 | Passes, barely                                                                             |
| dark: blue-700 weigh-in line on zinc-900                    | 2.64:1  | chart line `DD/13`                                                        | Fails the 3:1 floor for graphics                                                           |
| dark: zinc-900 card on canvas `#0B1220`                     | 1.06:1  | every card                                                                | Cards rely on a 1.19:1 border alone                                                        |

**Targets and focus.** `IconButton`, `SegmentedControl` and `IosSwitch` all enforce 44px minimums (`ui/components/icon-button.tsx`, `segmented-control.tsx:43,110`, `ios-switch.tsx`). `focusVisibleStyle` with a 2px ring exists on buttons, segments and inputs. This is the strongest part of the floor. Verify it renders on the real build; I couldn't run it.

**Labels and semantics.**

- [high] On web, `accessibilityLabel` and `accessibilityRole` reach DOM nodes as unknown props: React warns on all 30 authenticated pages (`D/index.json`, `M/index.json`). The sources include `ui/components/form-field.tsx:133`, `stat-pill.tsx:24`, `notification-row.tsx:39`, `weight-chart.tsx:321-322`, `app/features/client-onboarding/onboarding-progress.tsx:25` and `tools/tools-macro-split.tsx:60`. Those names and roles are probably dropped for screen readers on web _[inferred]_. The fix belongs in the kit: map to `aria-label` and `role` on web.
- [high] Colour-only selection on dietary chips (`D/20`).
- [medium] No visible label on the sex segmented control (`D/12`).
- [medium] Search has `aria-label` (good) but no visible label or icon.
- [medium] No skip link found (a grep for "Skip to" across the app, UI and web shell returned nothing).
- Good: `ErrorState` uses `role="alert"`, `LoadingState` uses `role="status"` with `aria-busy`, and the high-priority notification row adds a rail and wash rather than hue alone.

**Forms.**

- 15px input text (`form-field.tsx` `fontSize={15}`) makes iOS Safari zoom on focus in the web PWA (`readable-font-size`: 16px minimum).
- No password reveal.
- Pre-disabled submits.
- No error summary or focus management after a failed multi-field submit.
- No unsaved-changes guards.
- Free-text medical conditions ("one per line or comma-separated").

**Motion.** Reduced motion is honoured on the auth slide (`use-auth-panel-slide.ts`) and the weight chart (`weight-chart.tsx:234-258`). `StaggerItem` on the intake review step: not checked.

**Feedback.** The toast component exists (`ui/components/gymos-toast.tsx`) and no screen imports it. Successes are either silent (publish, goal save, dietary save) or dead-end pages (vitals "Back").

**RTL and Urdu readiness: none today.**

- `<html lang="en">` with no `dir` (`apps/web/app/layout.tsx:32`).
- No i18n library or string catalog: every string is a hard-coded English literal.
- 24 physical direction props (`marginLeft`, `paddingRight`, `left`/`right`, `borderLeftWidth`) and **0** logical ones (`marginStart`/`End`) across `app` and `ui`. Example: the input unit is positioned `right={12}` with `paddingRight={44}` (`form-field.tsx`), so in RTL it would sit over the typed value.
- Directional icons are hard-coded (`ChevronRight` on rows, `ArrowLeft` back) and would need mirroring.
- Urdu is usually set in Nastaliq, which needs a much taller line height than Latin (about 1.8–2.2×, a typographic rule of thumb, not measured here) and a font with Arabic-script glyphs. A font choice is out of my scope, but the redesign's type tokens must allow a per-locale line height.

Decide early (section 8):

- whether time axes in charts mirror;
- whether digits stay Western (common in Pakistani UIs);
- how mixed Urdu/English text and numbers with units ("84.5 kg") behave in RTL runs.

The redesign should switch to logical properties now, even before Urdu ships, because retrofitting later costs more.

**Locale.** Dates appear in three conventions: ISO (`2026-08-06`), en-PK long (greeting), and US `toLocaleString()` (notifications). Pick one formatter with relative dates for recency ("6 Aug · 109 d ago").

---

## 7. Bugs and data-truth issues

| #   | Issue                                                                                                                                                            | Evidence                                                                 | Severity |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | -------- |
| 1   | Attention logic ignores CHECKIN_OVERDUE, so Home and the roster say "on track" while all 5 clients are 91 to 109 days overdue.                                   | `D/10`, `D/11`; `home/index.tsx:53`, `roster-row.tsx:11-12`              | critical |
| 2   | An empty DRAFT has no way to add meals or regenerate, but offers Publish.                                                                                        | `D/24`; `plan-editor.tsx:133-135, 215`                                   | critical |
| 3   | Adherence % input is stored as 1–5 and displayed as "~%" or "/10", so entered values change (61 → ~80).                                                          | `D/18`, `D/21`, `D/22`; `check-in/adherence.ts`                          | high     |
| 4   | Journey dates are one day later than History's for the same check-ins (timezone, inferred).                                                                      | `D/21-history--tall.png` vs `D/22-journey--tall.png`                     | high     |
| 5   | The Overview chart window ends Oct 4; Journey projects the goal for Jan 24, 2027.                                                                                | `D/13` vs `D/22`                                                         | high     |
| 6   | The "Onboarding incomplete… unlock meal planning, check-ins" claim is false (both work), and there's no path to sign.                                            | `D/13`, `D/21`, `D/25`; `client-hub-overview.tsx:90-93`                  | high     |
| 7   | Unit preferences are ignored in vitals, check-in, check-in detail, roster and Home (hard-coded cm and kg), while Settings says in and ft-in.                     | `D/27`, `D/16`; `vitals-entry/index.tsx:41-58`, `check-in/index.tsx:199` | high     |
| 8   | The verdict reason "have 3 over 0.04" is missing its unit.                                                                                                       | `D/19`                                                                   | high     |
| 9   | The goal form shows "Custom pace" for a client whose Plan tab says "Standard · 0.51 kg/wk".                                                                      | `D/17` vs `D/25`                                                         | medium   |
| 10  | The Plan tab shows only the newest plan; the published plan the client follows is invisible.                                                                     | `D/23`; `client-hub-plan.tsx`                                            | high     |
| 11  | The Plan tab's macro row (targets) is styled like plan totals; fiber appears there but not in the editor.                                                        | `D/23` vs `D/24`                                                         | medium   |
| 12  | The desktop roster drops CHECKIN_OVERDUE, which the phone card shows.                                                                                            | `D/11` vs `M/11`                                                         | medium   |
| 13  | "Needs focus" shows for clients with no weigh-ins since the start (it's a missing-data state, not a performance state); "- 0.0 kg" sits in a success-green wash. | `D/14`, `D/15`                                                           | medium   |
| 14  | The roster's Progress column is a shipped placeholder.                                                                                                           | `D/11`; `roster-row.tsx:134`                                             | medium   |
| 15  | Age 30 is silently assumed when the date of birth is empty, and the assumption isn't surfaced after intake.                                                      | `D/12` helper text                                                       | medium   |
| 16  | Phone numbers render raw, with formatting failing silently ("344565464567").                                                                                     | `D/15`                                                                   | medium   |
| 17  | "Preferred foods… picked by the AI planner" contradicts ADR-0001 (the solver picks).                                                                             | `D/20`                                                                   | medium   |
| 18  | Notification timestamps use the US format with seconds; the greeting uses en-PK; lists use ISO.                                                                  | `D/26`, `D/10`                                                           | medium   |
| 19  | `accessibilityLabel` and `accessibilityRole` are passed as unknown DOM props on web (React warning on every authenticated page).                                 | `index.json` (all folders)                                               | high     |
| 20  | Hydration mismatch on /tools (desktop capture).                                                                                                                  | `D/index.json` key `30-tools`                                            | low      |
| 21  | Intake draft state is in memory only, so refresh loses all steps.                                                                                                | `use-onboarding-draft.ts`                                                | high     |
| 22  | A check-in can be submitted with no weight, adherence or notes.                                                                                                  | `check-in/index.tsx` submit                                              | medium   |
| 23  | The verdict is held in component state, so refreshing the verdict screen loses it.                                                                               | `check-in/index.tsx` `result` state                                      | medium   |

Cross-reference: the native captures surfaced three more bugs (section 9.3). The login maps every non-429 failure to "Email or password is incorrect," which affects web too. Notifications show "Invalid Date" on iOS. The tab bar's current-route detection is broken on native.

Not bugs, but worth knowing: the "Adnan (Demo)" intake is unsigned in the seed, which is why the banner shows. The demo draft v2 for "xyz" has zero items, which may be a seed artefact _[inferred]_. The UI still has to handle both.

---

## 8. What to mock first, and why

Mock each at 1440 and 390, light and dark, with **real states**: overdue-heavy data like today's demo, an empty client, a loading skeleton, an error with retry.

1. **Today (Home)**: where the weekly loop starts and where truth is most broken. It sets the queue-row pattern reused by Clients and Alerts.
2. **Client hub Overview plus the persistent client header**: the header (status in words, severe-allergy chip, Start check-in, WhatsApp) appears on every client screen, so it is the highest-leverage component. The "Next steps" card replaces three passive banners.
3. **Check-in workspace and verdict**: the weekly action itself. It fixes the adherence format for the whole product and defines the batch "Next client" pattern.
4. **Plan editor plus the Review & publish sheet**: the product's signature, safety-critical workflow (allergen visibility, drift, live vs draft). It needs the most design exploration, including the empty-draft state.
5. **Clients roster**: a table that carries loop columns (last check-in, next due, plan status) and the corrected statuses.
6. **Intake wizard (5 steps plus Review & sign)**: a long, error-prone flow with a client-facing ending. Mock the step rail, the live preview, draft resume and the presentable review.
7. **Plan tab (live vs draft)**: small, but it removes the "which plan is the client on?" ambiguity.
8. **Progress (Journey and History merged)**: the most product-specific view and the home for the signature motif; depends on 2.
9. **Task side sheets** (vitals, goal, dietary): one pattern, three instances, once 2 exists. The dietary chip selection grammar is the key detail.
10. **Settings, Alerts/Inbox, Tools and Guides, 404**: low traffic; mostly pattern reuse.

---

## Personas walked through the primary action (logging this week's check-ins)

- **Alex, a power user** running 30 clients on Monday:
  - No `⌘K` or keyboard shortcuts.
  - Each check-in is Home → hub → hamburger → form → submit → verdict → Done: 6 interactions and 3 page loads.
  - No "next client" and no sortable roster.
  - The hub's verbs take two clicks behind an icon.
- **Sam, a screen-reader and keyboard user:**
  - On web, the kit's accessibility labels are dropped (React warnings).
  - Dietary selection is announced only if `aria-pressed` is set; visually it's colour-only.
  - Status chips fail contrast.
  - No skip link.
  - Good: focus rings, `role="alert"` on errors.
- **Casey, a distracted phone user** between sessions:
  - Intake loses everything on interruption.
  - Vitals is 13 fields on a 2708px scroll.
  - "New client" is top-right, out of thumb reach.
  - Publish sits mid-page.
  - Good: sticky form footers, numeric keypads.
- **Project persona _[assumed from repo signals, not from research]_: a floor coach in a Lahore gym**, WhatsApp-first, English UI, Urdu-speaking clients:
  - The WhatsApp action is an anonymous speech bubble.
  - ISO dates.
  - Adherence asks for a percentage nobody actually measures.
  - No Urdu or RTL.
  - Intake review is shown to the client but reads like an admin form.

---

## Open decisions for Khubaib (recommendation first)

1. **Primary navigation.** (a) Today · Clients · Tools · Account, with Alerts folded into Today. _Recommended: puts the loop first and frees a phone slot._ (b) Today · Clients · Inbox · More. (c) Keep the current 5.
2. **History and Journey.** (a) Merge into one "Progress" tab with a chart, a timeline and a table toggle. _Recommended: they show the same events._ (b) Keep both, but fix the dates and add weight.
3. **Adherence scale.** (a) A 5-step scale in words, matching the engine's 1–5. _Recommended: no backend change and no false precision._ (b) Keep the % input and store % (backend and contract change).
4. **Task screens on desktop.** (a) Side sheets over the hub. _Recommended: keeps client context and the chart visible._ (b) Full pages with breadcrumb and client header.
5. **Signature.** (a) Keep it mandatory at intake, add draft resume, and add a "Collect signature" flow for existing unsigned clients. _Recommended: smallest change that removes the dead-end banner._ (b) Allow creating a client without a signature, marked "Signature pending".
6. **Batch check-in ("Next client →").** (a) In the first redesign. _Recommended: it is the Monday workflow._ (b) Future work in the README.
7. **"AI suggestion" framing in the plan editor.** (a) Reword to state provenance ("Solver draft: foods and grams from the catalog, names by the language model. Review before publish."). _Recommended: matches ADR-0001._ (b) Keep it as is.
8. **Custom allergens.** (a) Allow "Other" with an explicit warning that it can't be auto-filtered, plus a coach review flag. (b) Keep the fixed list. _No recommendation: this is a safety-policy call._
9. **Signature motif.** Hand WeaveLine placement (Progress tab, hub header) to the visual-direction agent: yes or no.

Native decisions 10–12 are in section 9.6.

Questions skipped in the Impeccable sense: this run is a delegated subagent with no direct line to the owner, so the targeted questions are listed above as decisions instead.

---

## 9. Native iOS (rewritten 2026-11-23 from valid captures)

**Evidence key.** `I/` = `screens/ios/`. A dev build on the iPhone 17 Pro simulator (iOS 26.5), 1206x2622 at 3x (402x874pt).

- **Captures:** 22 routes in light, plus 22 marked `--dark`, plus `00-login.png`. First viewport only.
- **How they were taken:** the coordinator drove them with an audit-only in-app route stepper that uses `router.replace`. That stepper is not in the repo.
- **Redirect check:** `29-settings-nutrition` is byte-identical to `32-tools-targets`, which confirms the redirect on native too.
- **Full content:** use the web `--tall` files. This section judges chrome, safe areas, navigation, type, density, dark mode, and what is native-specific.
- **Method:** Impeccable's `audit.native.md` plus `ios.md`. Design review only; no detector applies to native.

**Verdict in one line.** Every web problem in sections 2–8 reproduces on iOS (same shared screens). On top of them, the native shell has **four structural bugs that hit every screen**: status-bar overlap, a hub header that hides content, a tab bar frozen on "Home", and no native navigation. It reads as the web app in a phone frame, minus the browser's safety nets.

### 9.1 Your questions

**1. Tab bar shows "Home" as active on client screens: a real bug, not a `router.replace` artefact.**

- **Code evidence**
  - The tab bar reads the route with `usePathname` from `solito/navigation` (`packages/app/src/features/shell/app-shell.tsx:5`, `const pathname = usePathname() ?? '/'` at line 63). The route-chrome policy uses the same hook (`use-app-chrome.ts`).
  - On native, Solito 5 implements that hook as `useRoute()?.path` from React Navigation. The library's own source flags it as untested with Expo Router: `node_modules/.pnpm/solito@5.0.0/.../build/app/navigation/use-pathname.js` says "TODO test this with react navigation and expo router. does it work?".
  - The tab bar sits in `AppShell`, which `apps/mobile/app/(coach)/_layout.tsx` renders **around** `<Slot />`. So `useRoute()` resolves to the layout's own route in the root stack (`(coach)`), not the screen being shown. Its `path` is undefined, or frozen at whatever URL first opened the app.
  - The result is that `pathname` falls back to `'/'`. "Home" is active everywhere, and the chrome policy believes every screen is Home.
  - Navigation inside a `Slot` never changes that parent route, whether it happens by push or replace. So normal tapping hits the same bug _[inferred from code]_.
- **Screenshot evidence that rules out the replace explanation**
  - Primary routes are wrong too: `I/11-clients.png` and `I/26-notifications.png` show "Home" active while on Clients and Alerts.
  - **The tab bar appears on routes where web hides it**: intake (`I/12-clients-new.png`), vitals (`I/16`), goal (`I/17`), check-in (`I/18`, `I/19`), dietary (`I/20`), plan editor (`I/24`). On web phone those routes have no tab bar (`M/12-clients-new.png`, `M/24-plan.png`), because `getAppRouteChromePolicy` hides it for non-primary paths. A stale active state alone could not make the tab bar appear. Only a wrong pathname explains both.
- **Cost to the coach**
  - Task screens stack two bottom bars (the form footer plus the tab bar), about 190pt of an 874pt screen (`I/16`, `I/18`).
  - One stray tap on a tab abandons an unsaved intake or check-in. The intake draft lives only in memory (section 7 #21).
  - The coach can never see where they are.
- **Fix direction (for the engineer):** read the pathname through a native façade in `packages/platform` (the repo's pattern for web/native splits; AGENTS.md forbids `Platform.OS` in `packages/app`) that uses Expo Router's own pathname hook, or move the tab bar into a native tabs layout (decision 10).
- **Severity: high.**

**2. Header text under the status bar and Dynamic Island: confirmed on every coach screen.**

- **Evidence:**
  - "Clients" sits under the clock, and **"+ New client" collides with the Wi-Fi and battery indicators** (`I/11-clients.png`).
  - The hub avatar and name sit under the clock and the Island, the WhatsApp icon sits on the Wi-Fi glyph, and the "More actions" hamburger sits on the battery (`I/13`, `I/14`, `I/15`, `I/21`, `I/22`, `I/23`, `I/25`).
  - The Island cuts titles mid-word: "Weekly chec…", "Check-in · 20…", "Dietary profil…", "Custom Meal Plan" (`I/18`, `I/19`, `I/20`, `I/24`).
  - "How it works" overlaps the status icons (`I/17`).
  - The plan editor's DRAFT badge sits on the battery (`I/24`).
  - The tools explainers' back arrows and titles sit under the clock (`I/31`, `I/32`).
- **Cause:** the shell applies only the bottom inset (`app-shell.tsx:67-77`). `Screen` uses a fixed `paddingTop: '$5'` (`packages/ui/src/components/screen.tsx:8`). The root stack hides native headers (`apps/mobile/app/_layout.tsx:41`, `headerShown: false`).
- **Severity: critical.** Controls sit under system UI, and titles are unreadable.

**3. "Sign..." truncated while submitting.**

- The login submitting state still isn't captured, so the exact case remains unverified.
- **But the same failure is visible elsewhere:** the vitals Save button reads **"Save measureme…"** in a half-width footer button with room to spare (`I/16-vitals-new.png`; web shows "Save measurements" in full, `D/16`).
- Labels wrap mid-word in segmented controls and tabs: **"Sedenta / ry", "Moderat / e"** (`I/17`), "Sedentar / y" (`I/30`), **"Overvie / w", "Breakfas / t"** (`I/31`). The same controls fit on web phone (`M/17`, `M/31`).
- So native text measurement and layout differ from web, and button labels truncate. "Signing in…" is very likely the same bug _[inferred]_.
- **Severity: high** (unreadable labels on safety and goal choices).

**4. Login shows "Email or password is incorrect" for a network or config failure: confirmed in code.**

- `packages/app/src/features/login/index.tsx:49-55` maps every failure except HTTP 429 to that message.
- It is shared code, so web has the same bug. A coach who can't reach the server is told their password is wrong.
- It breaks the owner's fail-fast rule and the `error-clarity` guideline.
- **Ideal mapping:** 401 → wrong credentials; 429 → wait; network or timeout → "Can't reach GymOS. Check your connection," with **Try again**; 5xx → "GymOS is having trouble," plus a reference id. Log each with context.
- **Severity: high, both platforms.**

### 9.2 Screen by screen on iOS (what differs from web)

| Key                | Native observation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Evidence                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| 00 login           | Renders in the **system font at regular weight**. The "GymOS" wordmark is San Francisco Regular, while code asks for Inter 800 (`login/index.tsx:74-80`) and web renders it (`D/01`, `M/01`). Later screens render in Inter, and the numbers in Roboto Mono (slashed zero, `I/10`). Likely cause: the first screen mounts before `useFonts` finishes and isn't re-rendered (`apps/mobile/src/mobile-providers.tsx:23-50`) _[inferred]_. No theme toggle (web has one).                                                                                                          | `I/00-login.png`                               |
| 10 home            | Date line and greeting under the clock and Island. **Card shadows render as heavy dark halos** on every card, much darker than web's 6% shadow: code sets `shadowColor: 'rgba(0,0,0,0.06)'` with `shadowOpacity: 1` (`packages/ui/src/components/card.tsx:11-14`), and the alpha appears not to carry over on native _[inferred]_. The false "All clients are on track today" (top-10 #1) reproduces.                                                                                                                                                                           | `I/10-home.png`                                |
| 11 clients         | "+ New client" sits **under the status icons**. The search field and filter control have **square corners**, unlike every other input. The raw enum "CHECKIN OVERDUE" chip. "Home" is active.                                                                                                                                                                                                                                                                                                                                                                                   | `I/11-clients.png`                             |
| 12 intake          | Tab bar present, with "Continue" stacked above it. One tab tap loses the in-memory draft. No close control. Title under the clock.                                                                                                                                                                                                                                                                                                                                                                                                                                              | `I/12-clients-new.png`                         |
| 13–15 hub          | **The sticky header overlays the top of the content instead of pushing it down.** Adnan's "Onboarding incomplete" banner (first on web, `D/13`) is hidden under it. For "xyz" and "abc" the first row of stat cards is hidden, and only "BMI" and "Pace" peek out (`I/14`, `I/15`). Cause: `position="sticky"` on the hub header (`packages/app/src/features/client-detail/client-hub-header.tsx:42`) is a web-only CSS value, and React Native has no sticky positioning, so the header leaves the layout flow _[inferred]_. Hamburger on the battery, WhatsApp icon on Wi-Fi. | `I/13`–`I/15`                                  |
| 16 vitals          | "Save measureme…" truncated; two stacked bottom bars; units still hard-coded cm (section 7 #7).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | `I/16-vitals-new.png`                          |
| 17 goal            | Activity labels break mid-word ("Sedenta ry", "Moderat e"). Unlabelled slider ticks, as on web. The pace card's empty space is larger.                                                                                                                                                                                                                                                                                                                                                                                                                                          | `I/17-goal-new.png`                            |
| 18 check-in        | Title cut by the Island ("Weekly chec…"); developer subtitle; two bottom bars.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `I/18-check-in.png`                            |
| 19 check-in detail | Title cut ("Check-in · 20…"); raw "INSUFFICIENT DATA" badge and "have 3 over 0.04" (section 7 #8).                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | `I/19-check-in-detail.png`                     |
| 20 dietary         | The colour-only chip selection reproduces (Peanut outlined red, Halal outlined blue). Title cut.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | `I/20-dietary.png`                             |
| 21 history         | **The overdue "2026-08-06 DUE" row is hidden under the hub header**; the first visible row is 2026-07-30. Raw enums.                                                                                                                                                                                                                                                                                                                                                                                                                                                            | `I/21-history.png` vs `D/21-history--tall.png` |
| 22 journey         | The first card ("Goal started") is half hidden under the header. Each check-in card is about 200pt tall on a phone.                                                                                                                                                                                                                                                                                                                                                                                                                                                             | `I/22-journey.png`                             |
| 23 / 25 plan tab   | The "Active goal" heading is hidden under the header ("Objective" is cut). "Tap to add" reads naturally here.                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | `I/23`, `I/25`                                 |
| 24 plan editor     | Title, edit pencil and DRAFT badge all under the status bar. Tab bar present under a full-screen editor. The empty-draft dead end with **Publish plan** (top-10 #2) reproduces.                                                                                                                                                                                                                                                                                                                                                                                                 | `I/24-plan.png`                                |
| 26 alerts          | **Timestamp reads "Invalid Date"** (web: "8/6/2026, 10:48:39 PM"). Code: `new Date(n.createdAt).toLocaleString()` (`packages/app/src/features/notifications/index.tsx:85`). The same parse feeds the sort comparator (line 36), so ordering by date is probably broken on native too _[inferred]_. Likely cause: the timestamp string is in a format the web browser accepts and the native JavaScript engine does not _[inferred]_. "Home" is active on the Alerts route.                                                                                                      | `I/26-notifications.png`                       |
| 27 settings        | Title under the clock. The custom switch reads clearly in both modes. In dark mode the **selected segment is darker than its track** (`I/27-settings--dark.png`, `I/24-plan--dark.png`), so the selected state reads as recessed and its cue inverts.                                                                                                                                                                                                                                                                                                                           | `I/27`, `--dark`                               |
| 29 / 32 targets    | Redirect confirmed (identical files). Back arrow and "Layer 1" badge under the status bar.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | `I/29`, `I/32`                                 |
| 30 tools           | "Sedentar y" wraps mid-word; the eyebrow labels; results below the fold.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | `I/30-tools.png`                               |
| 31 meals explainer | 6 tabs: "Overvie w", "Breakfas t" wrap mid-word; non-interactive chips that look like buttons.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | `I/31-tools-meals.png`                         |

**Dark mode on iOS** (`--dark` set): token mapping matches web dark, with the same blue-tinted canvas behind neutral zinc cards. The sticky form footer turns into a lighter grey band across the navy canvas (`I/18-check-in--dark.png`). The weigh-in line on the chart is low-contrast dark blue (`I/13-client-hub-rich--dark.png`; 2.64:1 computed in section 6). The severe-allergy banner is a heavy maroon block. There is no dark launch screen to compare against.

### 9.3 Native-specific problems, ranked

| #   | Problem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Evidence                                                  | Severity |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | -------- |
| N1  | **No top safe-area inset**: controls and titles under the clock, Dynamic Island and status icons on every coach screen.                                                                                                                                                                                                                                                                                                                                                                             | 9.1 #2                                                    | critical |
| N2  | **The hub header overlays content**: it hides the onboarding banner, the first stat row, the overdue History row, and the top of Journey and the Plan tab. Information the coach needs is invisible.                                                                                                                                                                                                                                                                                                | `I/13`–`I/15`, `I/21`–`I/23`; `client-hub-header.tsx:42`  | critical |
| N3  | **The tab bar's current route is always "/"**: wrong active tab, and the tab bar shows on task screens and the plan editor.                                                                                                                                                                                                                                                                                                                                                                         | 9.1 #1; `app-shell.tsx:5,63`, Solito native `usePathname` | high     |
| N4  | **No native navigation**: the root stack uses `animation: 'none'` and `headerShown: false` (`apps/mobile/app/_layout.tsx:41`), and both the coach and auth groups are a `<Slot />` (`apps/mobile/app/(coach)/_layout.tsx`, `(auth)/_layout.tsx`). Every route change is a hard cut (the captures can't show motion, but the config makes it certain). No native nav bar or large titles. No edge-swipe back _[inferred: a Slot keeps no stack to pop]_. The hub has no back button at all (`I/13`). | code, `I/13`                                              | high     |
| N5  | **"Invalid Date" in Alerts**, and probably broken date sorting.                                                                                                                                                                                                                                                                                                                                                                                                                                     | `I/26`; `notifications/index.tsx:36,85`                   | high     |
| N6  | **Login masks every error as "wrong password"** (shared with web).                                                                                                                                                                                                                                                                                                                                                                                                                                  | `login/index.tsx:49-55`                                   | high     |
| N7  | **Text layout breaks**: labels wrap mid-word in segmented controls and tabs, and button labels truncate.                                                                                                                                                                                                                                                                                                                                                                                            | `I/16`, `I/17`, `I/30`, `I/31`                            | high     |
| N8  | **The first screen renders in the system font.**                                                                                                                                                                                                                                                                                                                                                                                                                                                    | `I/00-login.png`                                          | medium   |
| N9  | **Heavy card shadows** on every card.                                                                                                                                                                                                                                                                                                                                                                                                                                                               | `I/10`, `I/11`, `I/16`, `I/24`                            | medium   |
| N10 | **Web-shaped controls, no haptics**: pill buttons that press by changing opacity, a custom tab bar (Lucide icons, Inter labels, no SF Symbols or iOS 26 tab-bar material), underline tabs where iOS uses a segmented control, a hamburger icon for "More actions", and a custom JS sheet for the client menu (`client-hub-more-menu.tsx`). No `expo-haptics` import anywhere.                                                                                                                       | `I/13`; code                                              | medium   |
| N11 | **Inverted selected state in dark mode** segmented controls.                                                                                                                                                                                                                                                                                                                                                                                                                                        | `I/24--dark`, `I/27--dark`                                | medium   |
| N12 | **Portrait lock with `supportsTablet: true`** (`apps/mobile/app.json`): iPad portrait only, and multitasking expects all orientations.                                                                                                                                                                                                                                                                                                                                                              | config                                                    | medium   |
| N13 | **Square-cornered search and filter** on the roster, unlike every other control.                                                                                                                                                                                                                                                                                                                                                                                                                    | `I/11`                                                    | low      |

**What works natively** (keep it):

- The bottom inset on the tab bar and sticky footers (`sticky-form-footer.tsx:22`).
- Keyboard avoidance with interactive dismiss (`app-screen.tsx`).
- The iOS keyboard toolbar with previous, next and done (`keyboard-toolbar.ios.tsx`) and the field focus chain.
- `autoComplete` mapped to `textContentType`, including the one-time code (`otp-code-field.tsx:28`).
- 44pt minimum targets; the session in SecureStore; Reduce Motion in the weight chart (`weight-chart.tsx:234`).
- `accessibilityLabel` reaches VoiceOver (the web DOM-prop bug in section 6 is web-only).
- Dark mode applies to every route with no broken screens.

**Native audit scores** (`audit.native.md`; performance not assessed):

| #         | Dimension              | Score          | Key finding                                                                                                                                                                                   |
| --------- | ---------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1         | Accessibility          | 2              | Labels work natively. The web contrast failures remain, plus mid-word label breaks, content hidden under the header, and controls under the status bar. Dynamic Type at large sizes untested. |
| 2         | Performance            | n/a            | Not measured.                                                                                                                                                                                 |
| 3         | Appearance and theming | 2              | Tokens and dark mode work on every route. Heavy native shadows; dark segmented selection inverted; raw hex in charts.                                                                         |
| 4         | Platform conformance   | 1              | No safe-area top inset, no native stack or back gesture, a custom tab bar stuck on Home, web-shaped controls, no haptics.                                                                     |
| 5         | Adaptivity             | 1              | Text layout breaks at phone width; portrait lock with tablet support; keyboard handling good.                                                                                                 |
| **Total** |                        | **6/16 (38%)** | **Poor.**                                                                                                                                                                                     |

**Platform conformance verdict: fail.** A fluent iPhone user hits three things in the first ten seconds: a header under the Dynamic Island, a tab bar that says Home on every screen, and no swipe-back.

### 9.4 Android (not captured: not enough disk space on the capture machine)

Judged from code only, where it matters (`android.md`):

- **N1, N2, N3 and N7 come from shared code, so they will almost certainly reproduce on Android** _[inferred]_. Content will sit under the edge-to-edge status bar, the hub header will overlay content, the tab bar will freeze on Home, and labels will break.
- **Back.** No `BackHandler` code, and `predictiveBackGestureEnabled` isn't set in `app.json`. With a root stack over Slots, system Back from a deep screen may pop the whole coach group or exit the app _[verify on an emulator]_.
- **Material conformance.** An iOS-shaped switch (`IosSwitch`), no ripple (presses change opacity), no top app bar, a custom sheet. That matches android.md's slop test of an iOS app wearing Android's skin.
- **Keyboard.** `softwareKeyboardLayoutMode: "resize"` is set (good).
- **Dates.** "Invalid Date" (N5) depends on the JavaScript engine, which is Hermes on Android as well _[inferred]_.

### 9.5 How web and native should differ in the ideal design

**Shared everywhere:** content, the IA in section 4 (Today · Clients · Tools · Account; hub tabs Overview · Progress · Plan · Profile), data, states, copy, the status vocabulary, and component semantics. **Only chrome and interaction differ.**

| Concern                                         | Web desktop                                         | Web phone (PWA)                                                   | iOS                                                                                                                                                                                                                                                                      | Android                                                                                                                      |
| ----------------------------------------------- | --------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Primary navigation                              | Sidebar; header with `⌘K` search; breadcrumbs       | Bottom bar with 4 items; browser back                             | The system tab bar (4 items, SF Symbols) with one native stack per tab; large titles that collapse on scroll; edge-swipe back always on                                                                                                                                  | A Material 3 navigation bar on compact width, a navigation rail on expanded width; a top app bar per screen; predictive Back |
| Client header                                   | Sticky header inside the page                       | Same                                                              | The native nav bar shows the client name (inline title). The status chip and allergy chip sit in the first row of content. The header is never a custom overlay.                                                                                                         | Top app bar with the client name; chips in content                                                                           |
| Client actions                                  | Header buttons: **Start check-in**, Log vitals, "…" | "Next steps" card first, plus overflow                            | Nav-bar trailing "…" opening a system menu; **Start check-in** as the prominent in-content button                                                                                                                                                                        | App-bar overflow (⋮); an extended FAB "Check-in" on the hub                                                                  |
| Task screens (vitals, goal, check-in, dietary)  | A side sheet over the hub (about 480px)             | A full-screen route with the client header and **no tab bar**     | A **form sheet with detents** (medium for check-in, large for vitals and goal); Cancel and Save in the sheet's nav bar; swipe-to-dismiss with a confirm when there are unsaved edits; **no tab bar**                                                                     | A full-screen dialog (close X, Save in the app bar) for long forms; a modal bottom sheet for short picks                     |
| Choices with 4–5 options (activity level, goal) | Segmented control                                   | Segmented control if the labels fit on one line, otherwise a list | An inset list with checkmarks, or a menu picker. Never a mid-word wrap.                                                                                                                                                                                                  | Exposed dropdown menu or radio list                                                                                          |
| Overflow menus                                  | Popover menu                                        | Bottom sheet                                                      | System context menu                                                                                                                                                                                                                                                      | Dropdown menu                                                                                                                |
| Plan editor                                     | Three zones (week rail, day, targets)               | Day chips plus a sticky totals bar                                | Full screen, no tab bar; totals as a bottom toolbar; edit an item in a sheet with a grams stepper                                                                                                                                                                        | The same, with a bottom sheet; Snackbar with Undo                                                                            |
| Transitions                                     | 150–250ms fades or slides for sheets                | Same                                                              | System push, pop and sheet rise; optional zoom transition from a roster row into the hub; Reduce Motion becomes a crossfade                                                                                                                                              | Material shared-axis or container transform; honour "Remove animations"                                                      |
| Haptics                                         | n/a                                                 | n/a                                                               | Success notification on **publish** and on the **verdict**; a selection tick on segmented controls and when the pace slider snaps to a named stop or the floor; a light tick per grams step; a warning on REFER_REVIEW or drift acknowledgement. Never on ordinary taps. | The same moments through confirm and reject haptic feedback constants                                                        |
| Safe areas                                      | n/a                                                 | `env(safe-area-inset-*)` when installed                           | All four insets: Dynamic Island, home indicator, landscape. Content scrolls under a translucent nav bar                                                                                                                                                                  | Edge-to-edge with status bar, navigation bar, cutout and keyboard (IME) insets                                               |
| Keyboard                                        | Enter submits; Tab order; shortcuts                 | `inputmode=decimal`; 16px inputs                                  | Decimal pad for weights; keep the previous/next/done toolbar; fields scroll above the sticky footer                                                                                                                                                                      | Keyboard insets; next and done IME actions                                                                                   |
| Feedback                                        | Toast at the bottom right                           | Toast above the tab bar                                           | In-place confirmation plus haptic                                                                                                                                                                                                                                        | Snackbar with Undo                                                                                                           |
| Typography                                      | 14/22 body                                          | Body 15–16, inputs 16                                             | iOS text styles (Body 17, Subheadline 15, Footnote 13, Caption 12) with Dynamic Type. Labels sized to fit on one line at the default size, wrapping at word boundaries at large sizes.                                                                                   | Material type roles in sp, following the font scale                                                                          |
| Elevation                                       | Soft 6% shadow                                      | Same                                                              | Hairline separators and grouped backgrounds rather than drop shadows; system materials behind bars                                                                                                                                                                       | Tonal elevation                                                                                                              |
| Tablet                                          | Desktop layout                                      | —                                                                 | Split view: roster list on the left, hub on the right; all orientations                                                                                                                                                                                                  | Navigation rail plus list-detail                                                                                             |

**Mock implications.** For section 8's mocks 1–3 (Today, hub, check-in), add an iOS frame with native chrome: the inset-aware large title, the system tab bar with the correct active state, a nav-bar menu, and the check-in as a form sheet over the hub with no tab bar. Android follows the Material column once captures exist.

### 9.6 Changes to the top 10 and the decisions

**Top 10:** unchanged. Every item reproduces on iOS: #1 (`I/10`), #2 (`I/24`), #3 (`I/19` shows a 20% ring next to the "20" input), #4 (`I/16`–`I/20` have no client name), #5 (`I/13` hamburger), #6 (`I/19`, `I/21` raw enums). For the native app, **N1 to N6 rank right after #2.** N1 and N2 hide information and controls on every screen, so they belong ahead of the visual redesign.

**Native decisions for Khubaib** (replacing the earlier 10–12; recommendation first):

10. **Native navigation architecture.** (a) A native stack per tab plus native tabs on iOS and Android, with web keeping its own shell; the screens stay shared and only the shell splits. _Recommended: restores safe areas, swipe-back, large titles, system sheets and a correct active tab without hand-building them, and removes the Solito `usePathname` dependency in the native shell. Expo Router provides stacks and tabs; check the stability of its native-tabs API in the SDK version in use before choosing it over the standard tabs._ (b) Keep the shared custom shell and patch it: a top inset, a native pathname source, back buttons, hand-made transitions. _Cheaper now, but it stays a web port._
11. **Task screens on native.** (a) Form sheets with detents via the stack's `formSheet` presentation, with no tab bar. _Recommended._ (b) Full-screen pushes with the tab bar hidden.
12. **Fix the native shell bugs before the redesign?** (a) One small bug-fix PR now for N1 (top inset), N2 (hub header in layout flow), N3 (native pathname), N5 (date parsing) and N6 (login error mapping), each with a test. _Recommended: they hide information and mislead today, they are independent of the visual direction, and N5 and N6 also cost nothing on web._ (b) Fold them into the redesign build.
