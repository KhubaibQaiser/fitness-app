# Revamp status board

Only the Phase 2 coordinator edits this file (rulings O27, [`agents.md`](agents.md)). States: `not started` · `blocked (<reason>)` · `mock` · `mock approved` · `building` · `in review` · `merged`.

Last updated: 2026-11-28, the day the run resumed after the 2026-11-26 park (O44). Phase 1 has U4, the Q0 follow-ups, the guard fix and #144 left; F7.1 and F7.2 are in review. Mock batch 1 (F1 and F2) has been with the owner since 2026-11-26, and the F3 and F8 mocks started today.

## Phase 1

| Id  | Task                           | Depends on | State       | Branch / PR                                   | Notes                                                                                                                                                       |
| --- | ------------------------------ | ---------- | ----------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | Next.js 16.4.6                 | docs       | merged      | #106                                          | #98 closed (O3)                                                                                                                                             |
| U2  | Patch and minor bumps          | U1         | merged      | #114                                          | O19: newest versions kept; the owner approved the `packages/ai` line. #78, #96 and #97 closed (O3)                                                          |
| U3  | Expo SDK 58                    | U2         | merged      | #145                                          | Blocker fixes merged first: #122, #123 and #129. #79 and #81 closed (O3). Android release smoke in #139                                                     |
| U4  | Tamagui 3.3 and icons          | U3, B1–B6  | building    | `chore/u4-tamagui-3`                          | Supersedes #80                                                                                                                                              |
| B1  | Attention count                | docs       | merged      | #107                                          | O13: phone rows keep the status badge only; S03 shows reasons in words                                                                                      |
| B2  | Empty draft                    | docs       | merged      | #113                                          | The server refuses an empty publish (`PLAN_EMPTY`). Follow-ups: O16 (merged) and O17 (F7.5, S06)                                                            |
| B3  | Login errors                   | docs       | merged      | #108, with contracts-lane #110 and #112 (O15) | Tracked privately. O14: platform timeouts                                                                                                                   |
| B4  | Native top inset and tab route | docs       | merged      | #111                                          | O18: the thin inset band stays until F6                                                                                                                     |
| B5  | Native hub header              | docs       | merged      | #119                                          | Also fixes the loading skeleton's sticky header (same N2 bug)                                                                                               |
| B6  | Invalid Date                   | docs       | merged      | #120                                          | The API sends ISO timestamps; times read "24 Nov, 1:14 am" on web and iOS                                                                                   |
| Q0  | Measurement harness            | docs       | merged      | #121                                          | O20: Lighthouse 12.8.2. Five-run medians recorded on a not fully quiet machine; re-baseline in #136                                                         |
| O16 | Allergens on manual add, swap  | docs       | merged      | #116                                          | Also checks copy-day-to-week                                                                                                                                |
| O21 | node-forge override            | U2         | merged      | #117                                          | Clears 4 node-forge findings                                                                                                                                |
| —   | Lint fix after #112 and #114   | U2         | merged      | #118                                          | #112's test stub clashed with U2's typescript-eslint 8.74                                                                                                   |
| —   | One press owner per control    | docs       | merged      | #122                                          | The iOS tap bug, also present on SDK 57: roster rows didn't open the client. U3 blocker                                                                     |
| O22 | Check-in verdict validation    | docs       | merged      | #123                                          | The seed stores engine verdicts; the detail screen validates and shows Retry                                                                                |
| —   | Back-navigation fallback       | docs       | merged      | #129                                          | O30: built on `solito/navigation`                                                                                                                           |
| —   | Q0 follow-ups                  | Q0         | not started |                                               | O32: env-gated source-maps line and `test:perf` in CI                                                                                                       |
| —   | Login rate limiting            | docs       | building    | #144                                          | Not a revamp PR: the owner merges. O41: a password reset clears the backoff. O48: wait wording and IPv6 grouping. O42: `fix/login-code` follows, mock first |
| —   | Guard ignore-file exemption    | docs       | building    | `fix/agent-guard-ignore-file`                 | O43. Not a revamp PR: the owner merges                                                                                                                      |

## Phase 2

| Id   | Task                                 | Depends on     | Mock                                           | State                             | Branch / PR                | Notes                                                                                |
| ---- | ------------------------------------ | -------------- | ---------------------------------------------- | --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------ |
| F1   | Tokens, themes, tenant               | U4             | token sheet: with the owner since 2026-11-26   | mock                              | #140                       | `pilot.json` is CODEOWNERS; width ranges (O8). Review clean. Code waits for U4 (O27) |
| F2   | Type, RTL, formatters                | F1             | type sheet: with the owner since 2026-11-26    | mock                              | #128                       | Font installs (O5). Review clean                                                     |
| F3   | Glass                                | F1             | glass sheet: building                          | mock                              | `docs/mock-f3`             | Installs (O5); Android gate in Q4. Provisional until F1's sheet is approved          |
| F4   | Motion, haptics                      | F1             | motion demo: recorded from F4 code             | not started                       |                            | `expo-haptics` (O5)                                                                  |
| F5   | Component kit                        | F2, F3, F4     | kit sheet: after the F1–F3 sheets are approved | not started                       |                            |                                                                                      |
| F6   | Navigation shells                    | F5, F7.1, F7.2 | shells: after the kit sheet                    | not started                       |                            | Tablet shells and orientation (O8)                                                   |
| F7.1 | Today queue and pulse                | U2             |                                                | in review                         | #125                       | Today's scope per O35. Review round 3                                                |
| F7.2 | Roster v2                            | U2             |                                                | blocked (waits for F7.1 to merge) | draft #127                 | Uses F7.1's attention rule and scope resolver                                        |
| F7.3 | Prefetch and public config           | U2             |                                                | not started                       |                            |                                                                                      |
| F7.4 | Progress series, vitals date         | U2             |                                                | not started                       |                            |                                                                                      |
| F7.5 | Plan versions and review data        | U2             |                                                | not started                       |                            |                                                                                      |
| F7.6 | Dietary impact preview               | U2             |                                                | not started                       |                            |                                                                                      |
| F7.7 | Signature later                      | U2             |                                                | not started                       |                            |                                                                                      |
| F7.8 | Check-in validation, verdict reasons | U2             |                                                | not started                       |                            | May touch `packages/core` (CODEOWNERS)                                               |
| F7.9 | Intake drafts                        | U2             |                                                | not started                       |                            |                                                                                      |
| —    | COACH scoping                        | F7.2           |                                                | not started                       | `feature/data-coach-scope` | O33; the Phase 1 coordinator builds it                                               |
| F8   | Illustrations and images             | F1             | interim slots: building                        | mock                              | `docs/mock-f8`             | Interim art; L1 redraws it (O6). Provisional until F1's sheet is approved            |
| F9   | Charts                               | F2, F4         | chart states: after the kit sheet              | not started                       |                            |                                                                                      |
| F10  | Client shell                         | F6, F7.3       | header, tabs, sheets: after the kit sheet      | not started                       |                            |                                                                                      |

## Phase 3

| Id  | Screen                   | Starts after                       | Mock        | State       | Branch / PR | Notes                                                                             |
| --- | ------------------------ | ---------------------------------- | ----------- | ----------- | ----------- | --------------------------------------------------------------------------------- |
| S01 | Auth                     | F6, F8                             | not started | not started |             | Keeps today's art until L1                                                        |
| S02 | Today                    | F6, F8, F7.1 (F7.9 for draft rows) | not started | not started |             | Mock priority 1. "Mine / All coaches" switch for admins and outlet managers (O35) |
| S03 | Clients                  | F6, F7.2                           | not started | not started |             | Hydration error 418, #134 (O32). "Mine / All coaches" switch (O35)                |
| S04 | Hub overview and profile | F10, F9, F7.3, F7.7                | not started | not started |             |                                                                                   |
| S05 | Progress                 | F10, F9, F7.3, F7.4                | not started | not started |             |                                                                                   |
| S06 | Plan                     | F10, F9, F7.3, F7.5                | not started | not started |             |                                                                                   |
| S07 | Check-in                 | F10, F9, F7.8                      | not started | not started |             |                                                                                   |
| S08 | Intake                   | F6, F9, F7.9                       | not started | not started |             |                                                                                   |
| S09 | Task sheets              | F10, F7.4, F7.6                    | not started | not started |             | Fixed allergen list (O1)                                                          |
| S10 | Tools and guides         | F6                                 | not started | not started |             |                                                                                   |
| S11 | Account                  | F6                                 | not started | not started |             |                                                                                   |
| S12 | Inbox and 404            | F6, F8, F7.1                       | not started | not started |             |                                                                                   |

## Phase 4

| Id  | Task                    | State       | Notes                                  |
| --- | ----------------------- | ----------- | -------------------------------------- |
| Q1  | Visual and states sweep | not started |                                        |
| Q2  | Performance             | not started |                                        |
| Q3  | Accessibility and RTL   | not started |                                        |
| Q4  | Devices                 | not started | Google Pixel 6 (O11); tablet pass (O8) |
| Q5  | Release and clean-up    | not started |                                        |

## After the track

| Id  | Task                | Depends on | State       | Notes                                |
| --- | ------------------- | ---------- | ----------- | ------------------------------------ |
| L1  | Illustration redraw | Q5         | not started | Low priority; owner approves the set |

## Waiting on the owner

- **Mock batch 1** (sent 2026-11-26): the F1 token sheet (#140) and the F2 type sheet (#128). On 2026-11-26 the owner said he'd comment on the PRs. Neither has an approval or a change request yet, as of 2026-11-28.
- **D1** (volt only for chart marks) stands unless the owner overrules it, per [`rulings.md`](rulings.md). F1's sheet proposes how the tokens meet it.

## Pending after Phase 1

- **Issues filed under O34:** #130 (the nightly roll overwrites RED_FLAG and OFF_TRACK reasons), #131 (Postgres-text timestamps from some endpoints), #132 (`/v1/clients` caps at 200 clients), #134 (hydration error 418, S03), #135 (O26's old seeded check-in rows), #136 (Q0 re-baseline on an idle machine), #137 (solver infeasible on 2 synthetic clients), #138 (the plan editor doesn't name the blocking allergen), #139 (pending Android screenshots), #141 (cold-start deep links open Home), #142 (onboarding height shows blank inches), #143 (the web client hub passes React Native accessibility props to the DOM; F5), #147 (native onboarding step 1 has no way out) and #148 (an early check-in stores its weight on the due date). One more item is tracked privately.

Order (O4): done on 2026-11-23. On the owner's word the parent merged #99, #100 and #101 into `main`, then merged `main` into this specs PR with the O4 resolution.

Run start (O5): the install switch `AGENT_GUARD_ALLOW_INSTALL=1` is set in the main checkout's `.claude/settings.local.json` (local, not committed), so sessions started there get it. Remove it when Q5 merges.

## Android evidence pending

Tracked in #139, a checklist of the Phase 1 PRs whose Android screenshots wait for the owner's kit run (the Pixel 6, O11). It includes U3's release build and launch (#145).
