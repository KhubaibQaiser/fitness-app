# Revamp status board

Only the Phase 2 coordinator edits this file (rulings O27, [`agents.md`](agents.md)). States: `not started` · `blocked (<reason>)` · `mock` · `mock approved` · `building` · `in review` · `merged`.

Last updated: 2026-11-26, after rulings O30–O34. Every Phase 1 task has merged except U3, U4, the back-navigation fallback and the Q0 follow-ups. The Phase 1 coordinator resumed U3 and runs U4, F7.1 and F7.2; the Phase 2 coordinator started the first mocks (O27).

## Phase 1

| Id  | Task                           | Depends on | State       | Branch / PR                                   | Notes                                                                                                                                                                                                                                                 |
| --- | ------------------------------ | ---------- | ----------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| U1  | Next.js 16.4.6                 | docs       | merged      | #106                                          | #98 closed (O3)                                                                                                                                                                                                                                       |
| U2  | Patch and minor bumps          | U1         | merged      | #114                                          | O19: newest versions kept; the owner approved the `packages/ai` line. #78, #96 and #97 closed (O3)                                                                                                                                                    |
| U3  | Expo SDK 58                    | U2         | building    | `chore/u3-expo-sdk-58`                        | Resumed 2026-11-26: merge main, rebuild the lockfile, re-run the tap smoke, open the PR. Smoke done on iOS. Blocker fixes merged first: #122 (one press owner) and #123 (check-in verdict). Supersedes #79, #81; Android smoke on the owner's MacBook |
| U4  | Tamagui 3.3 and icons          | U3, B1–B6  | not started |                                               | Supersedes #80                                                                                                                                                                                                                                        |
| B1  | Attention count                | docs       | merged      | #107                                          | O13: phone rows keep the status badge only; S03 shows reasons in words                                                                                                                                                                                |
| B2  | Empty draft                    | docs       | merged      | #113                                          | The server refuses an empty publish (`PLAN_EMPTY`). Follow-ups: O16 (merged) and O17 (F7.5, S06)                                                                                                                                                      |
| B3  | Login errors                   | docs       | merged      | #108, with contracts-lane #110 and #112 (O15) | The login route has no lockout, so 429 covers it. O14: platform timeouts                                                                                                                                                                              |
| B4  | Native top inset and tab route | docs       | merged      | #111                                          | O18: the thin inset band stays until F6                                                                                                                                                                                                               |
| B5  | Native hub header              | docs       | merged      | #119                                          | Also fixes the loading skeleton's sticky header (same N2 bug)                                                                                                                                                                                         |
| B6  | Invalid Date                   | docs       | merged      | #120                                          | The API sends ISO timestamps; times read "24 Nov, 1:14 am" on web and iOS                                                                                                                                                                             |
| Q0  | Measurement harness            | docs       | merged      | #121                                          | O20: Lighthouse 12.8.2. Five-run medians recorded on a not fully quiet machine; a re-baseline on an idle machine would tighten them                                                                                                                   |
| O16 | Allergens on manual add, swap  | docs       | merged      | #116                                          | Also checks copy-day-to-week                                                                                                                                                                                                                          |
| O21 | node-forge override            | U2         | merged      | #117                                          | Clears 4 node-forge findings                                                                                                                                                                                                                          |
| —   | Lint fix after #112 and #114   | U2         | merged      | #118                                          | #112's test stub clashed with U2's typescript-eslint 8.74                                                                                                                                                                                             |
| —   | One press owner per control    | docs       | merged      | #122                                          | The iOS tap bug, also present on SDK 57: roster rows didn't open the client. U3 blocker                                                                                                                                                               |
| O22 | Check-in verdict validation    | docs       | merged      | #123                                          | The seed stores engine verdicts; the detail screen validates and shows Retry                                                                                                                                                                          |
| —   | Back-navigation fallback       | docs       | building    | draft #129                                    | O30: before U3, built on `solito/navigation`                                                                                                                                                                                                          |
| —   | Q0 follow-ups                  | Q0         | not started |                                               | O32: env-gated source-maps line and `test:perf` in CI                                                                                                                                                                                                 |

## Phase 2

| Id   | Task                                 | Depends on     | Mock                                           | State       | Branch / PR                | Notes                                                                                     |
| ---- | ------------------------------------ | -------------- | ---------------------------------------------- | ----------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| F1   | Tokens, themes, tenant               | U4             | token sheet: building                          | mock        | `docs/mock-f1`             | `pilot.json` is CODEOWNERS; width ranges (O8). Mock PR to follow. Code waits for U4 (O27) |
| F2   | Type, RTL, formatters                | F1             | type sheet: PR open, in review                 | mock        | #128                       | Font installs (O5)                                                                        |
| F3   | Glass                                | F1             | glass sheet: after the F1 sheet                | not started |                            | Installs (O5); Android gate in Q4                                                         |
| F4   | Motion, haptics                      | F1             | motion demo: recorded from F4 code             | not started |                            | `expo-haptics` (O5)                                                                       |
| F5   | Component kit                        | F2, F3, F4     | kit sheet: after the F1–F3 sheets are approved | not started |                            |                                                                                           |
| F6   | Navigation shells                    | F5, F7.1, F7.2 | shells: after the kit sheet                    | not started |                            | Tablet shells and orientation (O8)                                                        |
| F7.1 | Today queue and pulse                | U2             |                                                | in review   | #125                       |                                                                                           |
| F7.2 | Roster v2                            | U2             |                                                | building    | draft #127                 | Uses F7.1's attention rule once F7.1 merges                                               |
| F7.3 | Prefetch and public config           | U2             |                                                | not started |                            |                                                                                           |
| F7.4 | Progress series, vitals date         | U2             |                                                | not started |                            |                                                                                           |
| F7.5 | Plan versions and review data        | U2             |                                                | not started |                            |                                                                                           |
| F7.6 | Dietary impact preview               | U2             |                                                | not started |                            |                                                                                           |
| F7.7 | Signature later                      | U2             |                                                | not started |                            |                                                                                           |
| F7.8 | Check-in validation, verdict reasons | U2             |                                                | not started |                            | May touch `packages/core` (CODEOWNERS)                                                    |
| F7.9 | Intake drafts                        | U2             |                                                | not started |                            |                                                                                           |
| —    | COACH scoping                        | F7.2           |                                                | not started | `feature/data-coach-scope` | O33; the Phase 1 coordinator builds it                                                    |
| F8   | Illustrations and images             | F1             | interim slots: after the F1 sheet              | not started |                            | Interim art; L1 redraws it (O6)                                                           |
| F9   | Charts                               | F2, F4         | chart states: after the kit sheet              | not started |                            |                                                                                           |
| F10  | Client shell                         | F6, F7.3       | header, tabs, sheets: after the kit sheet      | not started |                            |                                                                                           |

## Phase 3

| Id  | Screen                   | Starts after                       | Mock        | State       | Branch / PR | Notes                           |
| --- | ------------------------ | ---------------------------------- | ----------- | ----------- | ----------- | ------------------------------- |
| S01 | Auth                     | F6, F8                             | not started | not started |             | Keeps today's art until L1      |
| S02 | Today                    | F6, F8, F7.1 (F7.9 for draft rows) | not started | not started |             | Mock priority 1                 |
| S03 | Clients                  | F6, F7.2                           | not started | not started |             | React hydration error 418 (O32) |
| S04 | Hub overview and profile | F10, F9, F7.3, F7.7                | not started | not started |             |                                 |
| S05 | Progress                 | F10, F9, F7.3, F7.4                | not started | not started |             |                                 |
| S06 | Plan                     | F10, F9, F7.3, F7.5                | not started | not started |             |                                 |
| S07 | Check-in                 | F10, F9, F7.8                      | not started | not started |             |                                 |
| S08 | Intake                   | F6, F9, F7.9                       | not started | not started |             |                                 |
| S09 | Task sheets              | F10, F7.4, F7.6                    | not started | not started |             | Fixed allergen list (O1)        |
| S10 | Tools and guides         | F6                                 | not started | not started |             |                                 |
| S11 | Account                  | F6                                 | not started | not started |             |                                 |
| S12 | Inbox and 404            | F6, F8, F7.1                       | not started | not started |             |                                 |

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

- **D1** (volt only for chart marks) stands unless the owner overrules it, per [`rulings.md`](rulings.md).
- **Today's ORG_ADMIN scope** (F7.1): the owner asked for examples first; #125 waits on it.
- **Parked findings under O34:** the parent sent the owner its list of findings already parked in the docs (2026-11-26). Each becomes an issue only on his yes.

## Pending after Phase 1

- **O26:** a small data fix for old seeded check-in rows. First check what the deployed database holds, with the owner's OK.
- **Issues filed under O34:** #130 (the nightly roll overwrites RED_FLAG and OFF_TRACK reasons), #131 (Postgres-text timestamps from some endpoints) and #132 (`/v1/clients` caps at 200 clients).

Order (O4): done on 2026-11-23. On the owner's word the parent merged #99, #100 and #101 into `main`, then merged `main` into this specs PR with the O4 resolution.

Run start (O5): the install switch `AGENT_GUARD_ALLOW_INSTALL=1` is set in the main checkout's `.claude/settings.local.json` (local, not committed), so sessions started there get it. Remove it when Q5 merges.

## Android evidence pending

Each task that defers Android screenshots to the owner's kit run (the Pixel 6, O11):

- B2 (#113), B3 (#108), B4 (#111), B5 (#119), B6 (#120), #122, #123; U3 when its PR opens (release build and launch).
