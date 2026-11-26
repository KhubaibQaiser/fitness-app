# Phase 1, lane B: truth and shell fixes

Ruling A14: fix now, in small PRs, before mocks. These bugs hide information or mislead coaches today, whatever the new design looks like.

**Rules for the lane:**

- One PR per fix. No two B tasks share a file, so all six can run at once, in parallel with U1–U3.
- All six merge before U4 starts: its codemod rewrites style props across the tree.
- Keep today's look. These are logic and layout fixes, not a redesign, so there are no mocks. Screenshots before and after go in the PR.
- Each fix leaves a regression test. Later tasks rebuild these screens and must keep these tests passing, or replace them with equal or stronger ones that cover the same bug.
- **Web build before U1:** `next build` on 16.4.3 refuses to run under an agent (`SecurityFatalError`), so until U1 merges, B tasks and Q0 take the web build result from CI. CI is not affected.
- **Order against U3:** U3 moves mobile tests to RNTL 14's async `render`. Whichever of a B task and U3 merges second rebases, and migrates any mobile test it adds or touches.
- Evidence references (`D/10`, `I/13` and so on) point at the audit captures described in [`reference/critique.md`](reference/critique.md).

---

## B1: Attention count includes overdue check-ins

- **Bug:** Home says "All clients are on track today" (Needs attention 0) and the roster's Attention chip shows 0 while every client is 91–109 days overdue. Attention counts only `OFF_TRACK` and `RED_FLAG`, so `CHECKIN_OVERDUE` never counts. The rule is copied in three places:
  - `packages/app/src/features/home/index.tsx:57-61` (at risk and on track);
  - `packages/app/src/features/roster/roster-row.tsx:14-15` (`isAttention`, used at :34; the reason badges at :66-74 exclude `OFF_TRACK` and `RED_FLAG` inline and must follow the same rule);
  - `packages/app/src/features/roster/index.tsx:26` (`isAttention`, feeding the Attention chip count at :57 and the filter and sort at :67-73).
- **Owned files:** the three files above, plus one shared predicate in `packages/app/src/lib/attention.ts` (new) with its test. If an equivalent rule already exists in `packages/modules`, reuse it instead of adding a second one (read first).
- **Done when:**
  - Home and the roster use the same predicate.
  - `CHECKIN_OVERDUE`, `OFF_TRACK` and `RED_FLAG` count as needing attention.
  - The "all clear" message cannot render while any client needs attention.
  - A test with five overdue clients fails on `main` and passes after the fix.
  - Screenshots of Home and Clients on web (1440, 390) with the demo data.

## B2: Empty draft is no longer a dead end

- **Bug:** a draft with no items shows 0 kcal, no meals, no "Add food", no Regenerate, and a full-width **Publish plan**. Meal sections are built from existing items (`packages/app/src/features/plan/plan-editor.tsx:133-135`), and Regenerate renders only when the status is not DRAFT (`plan-editor.tsx:215`).
- **Owned files:** `packages/app/src/features/plan/plan-editor.tsx` and its tests. If the publish route accepts an empty plan, also the publish handler in `apps/api/src/routes/` and its module function.
- **Change:**
  - Meal sections come from the plan's meal pattern, so every section shows "Add food" even when empty.
  - An empty draft shows "This draft has no meals yet" with **Generate meals** (allowed in DRAFT) and **Add food manually**.
  - Publish is not offered while the draft has no items.
  - The server rejects publishing a plan with no items (problem response, negative test) if it doesn't already. Read the route first and say in the PR which case applied.
- **Done when:**
  - Tests cover the empty-draft render and Generate in DRAFT.
  - A server test covers the empty publish.
  - Screenshots of the empty-draft state on web and iOS.

## B3: Login says what actually failed

- **Bug:** `packages/app/src/features/login/index.tsx:49-55` maps every failure except HTTP 429 to "Email or password is incorrect", so a coach who can't reach the server is told their password is wrong. It affects web and native.
- **Owned files:** `packages/app/src/features/login/**`.
- **Mapping:**

  | Failure                                                            | Message                                                                                                           |
  | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
  | 401                                                                | Email or password is incorrect                                                                                    |
  | 429                                                                | The current wait message                                                                                          |
  | Account locked (FR-C1; read the auth route for the status it uses) | The current lockout message, with when to try again. Tracked privately                                            |
  | Network error or timeout                                           | "Can't reach GymOS. Check your connection." plus **Try again**                                                    |
  | 5xx                                                                | "GymOS is having trouble. Try again in a minute." plus the request reference, if the problem response carries one |
  | Anything else                                                      | Shown as an error with the status, never as wrong credentials                                                     |

  Each failure is logged with the operation, status and cause, and never the email or password.

- **Done when:** one test per row fails on `main` and passes after (the 429 row may already pass: say so in the PR); screenshots of the network-error state on web and iOS.

## B4: Native shell: top safe area and the active tab

- **Bugs:**
  - N1: titles and controls sit under the status bar and Dynamic Island on every coach screen. The shell applies only the bottom inset (`packages/app/src/features/shell/app-shell.tsx:67-77`), and `Screen` uses a fixed `paddingTop: '$5'` (`packages/ui/src/components/screen.tsx:8`).
  - N3: the tab bar reads Solito's native `usePathname` (`app-shell.tsx:5`, read at :63 by the tab bar and at :125 by the web `SideNav`; both switch to the façade), which resolves to the layout's route. Home is always active, and the tab bar shows on task screens.
- **Owned files:**
  - `packages/app/src/features/shell/app-shell.tsx` and `use-app-chrome.ts` with its test.
  - `packages/ui/src/components/screen.tsx`.
  - `packages/platform/src/pathname*` (new) and `packages/platform/src/index.ts`.
  - `apps/mobile/app/(coach)/_layout.tsx`.
- **Change:**
  - Add a pathname façade in `packages/platform`. Its native value comes from Expo Router's `usePathname()`, read in `apps/mobile/app/(coach)/_layout.tsx` and provided through a context, so `packages/platform` gains no dependency. Web keeps its current source.
  - Apply the top inset through the existing `packages/platform` safe-area façade.
  - No `Platform.OS` in `packages/app`.
- **Done when:**
  - The chrome-policy test covers native paths.
  - iOS simulator screenshots of every coach route under `apps/mobile/app/(coach)/` (19 route files today; first viewport) show nothing under the system UI.
  - The correct tab is active on each primary route.
  - There is no tab bar on intake, vitals, goal, check-in, check-in detail, dietary or the plan editor.
  - Android screenshots are added when the owner runs the kit; they don't block the merge (tracked in #139).
- **Note:** F6 later replaces this shell with native tabs and stacks. Keep the fix small; the pathname façade may be reused there.

## B5: Native hub header stays in the layout

- **Bug (N2):** `position="sticky"` on the hub header (`packages/app/src/features/client-detail/client-hub-header.tsx:42`) is web-only. On native the header leaves the layout flow and covers the onboarding banner, the first stat row, the overdue History row, and the tops of Journey and the Plan tab.
- **Owned files:**
  - `client-hub-header.tsx`.
  - `packages/app/src/features/client-detail/index.tsx`, layout only.
  - `packages/ui/src/components/sticky-header.tsx` and `sticky-header.native.tsx` (new): sticky on web, in flow above the scroll view on native.
- **Done when:**
  - iOS screenshots of the hub Overview, History, Journey and Plan tabs show their first content row fully visible.
  - Web stays sticky (screenshot at 1440 after scrolling).
  - A render test proves the header occupies layout space on native.

## B6: "Invalid Date" in Alerts on native

- **Bug (N5):** `new Date(n.createdAt).toLocaleString()` (`packages/app/src/features/notifications/index.tsx:85`) shows "Invalid Date" on iOS. The same parse feeds the sort comparator (line 36), so date order is probably wrong on native too.
- **Owned files:** `packages/app/src/features/notifications/**`. If the API emits a non-ISO timestamp, also the notification serializer in `apps/api/src/routes/` and the contract in `packages/contracts`.
- **Change:**
  - Capture the exact string the API returns and fix the cause at the boundary: timestamps cross the API as ISO 8601 with `T` and an offset.
  - Display with one module-level `Intl.DateTimeFormat` (en-PK, "6 Aug, 10:48 pm").
  - Sort on the numeric time.
- **Done when:**
  - A contract test asserts the emitted format. Node's `Date` parses more formats than Hermes, so a Node-only parse test is not enough.
  - A sort test uses mixed timestamps.
  - iOS screenshot of Alerts shows a readable time.
