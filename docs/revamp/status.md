# Revamp status board

Only the parent edits this file ([`agents.md`](agents.md)). States: `not started` · `blocked (<reason>)` · `mock` · `mock approved` · `building` · `in review` · `merged`.

Last updated: 2026-11-24, during Phase 1. U1, U2, B1, B3, B4 and two contracts-lane PRs have merged; the other Phase 1 tasks are in review or building.

## Phase 1

| Id  | Task                           | Depends on | State       | Branch / PR                                   | Notes                                                                                               |
| --- | ------------------------------ | ---------- | ----------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| U1  | Next.js 16.4.6                 | docs       | merged      | #106                                          | #98 closed (O3)                                                                                     |
| U2  | Patch and minor bumps          | U1         | merged      | #114                                          | O19: newest versions kept; the owner approved the `packages/ai` line. #78, #96 and #97 closed (O3)  |
| U3  | Expo SDK 58                    | U2         | not started |                                               | Supersedes #79, #81; Android smoke on the owner's MacBook                                           |
| U4  | Tamagui 3.3 and icons          | U3, B1–B6  | not started |                                               | Supersedes #80                                                                                      |
| B1  | Attention count                | docs       | merged      | #107                                          | O13: phone rows keep the status badge only; S03 shows reasons in words                              |
| B2  | Empty draft                    | docs       | in review   | #113                                          | The server now refuses an empty publish (`PLAN_EMPTY`). Follow-ups: O16 (below) and O17 (F7.5, S06) |
| B3  | Login errors                   | docs       | merged      | #108, with contracts-lane #110 and #112 (O15) | The login route has no lockout, so 429 covers it. O14: platform timeouts                            |
| B4  | Native top inset and tab route | docs       | merged      | #111                                          | O18: the thin inset band stays until F6                                                             |
| B5  | Native hub header              | docs       | building    | `fix/b5-native-hub-header`                    |                                                                                                     |
| B6  | Invalid Date                   | docs       | building    | `fix/b6-invalid-date`                         |                                                                                                     |
| Q0  | Measurement harness            | docs       | building    | `chore/q0-measurement-harness`                | O20: Lighthouse 12.8.2 as a root devDependency. Its five-run medians wait for a quiet machine       |
| O16 | Allergens on manual add, swap  | docs       | building    | `fix/allergen-manual-add`                     | Nutrition-safety fix found in B2 (O16)                                                              |
| O21 | node-forge override            | U2         | in review   | #117                                          | Clears 4 node-forge findings (O21)                                                                  |

## Phase 2

| Id   | Task                                 | Depends on     | Mock                 | State       | Branch / PR | Notes                                         |
| ---- | ------------------------------------ | -------------- | -------------------- | ----------- | ----------- | --------------------------------------------- |
| F1   | Tokens, themes, tenant               | U4             | token sheet          | not started |             | `pilot.json` is CODEOWNERS; width ranges (O8) |
| F2   | Type, RTL, formatters                | F1             | type sheet           | not started |             | Font installs (O5)                            |
| F3   | Glass                                | F1             | glass sheet          | not started |             | Installs (O5); Android gate in Q4             |
| F4   | Motion, haptics                      | F1             | motion demo          | not started |             | `expo-haptics` (O5)                           |
| F5   | Component kit                        | F2, F3, F4     | kit sheet            | not started |             |                                               |
| F6   | Navigation shells                    | F5, F7.1, F7.2 | shells               | not started |             | Tablet shells and orientation (O8)            |
| F7.1 | Today queue and pulse                | U2             |                      | not started |             |                                               |
| F7.2 | Roster v2                            | U2             |                      | not started |             |                                               |
| F7.3 | Prefetch and public config           | U2             |                      | not started |             |                                               |
| F7.4 | Progress series, vitals date         | U2             |                      | not started |             |                                               |
| F7.5 | Plan versions and review data        | U2             |                      | not started |             |                                               |
| F7.6 | Dietary impact preview               | U2             |                      | not started |             |                                               |
| F7.7 | Signature later                      | U2             |                      | not started |             |                                               |
| F7.8 | Check-in validation, verdict reasons | U2             |                      | not started |             | May touch `packages/core` (CODEOWNERS)        |
| F7.9 | Intake drafts                        | U2             |                      | not started |             |                                               |
| F8   | Illustrations and images             | F1             | interim slots        | not started |             | Interim art; L1 redraws it (O6)               |
| F9   | Charts                               | F2, F4         | chart states         | not started |             |                                               |
| F10  | Client shell                         | F6, F7.3       | header, tabs, sheets | not started |             |                                               |

## Phase 3

| Id  | Screen                   | Starts after                       | Mock        | State       | Branch / PR | Notes                      |
| --- | ------------------------ | ---------------------------------- | ----------- | ----------- | ----------- | -------------------------- |
| S01 | Auth                     | F6, F8                             | not started | not started |             | Keeps today's art until L1 |
| S02 | Today                    | F6, F8, F7.1 (F7.9 for draft rows) | not started | not started |             | Mock priority 1            |
| S03 | Clients                  | F6, F7.2                           | not started | not started |             |                            |
| S04 | Hub overview and profile | F10, F9, F7.3, F7.7                | not started | not started |             |                            |
| S05 | Progress                 | F10, F9, F7.3, F7.4                | not started | not started |             |                            |
| S06 | Plan                     | F10, F9, F7.3, F7.5                | not started | not started |             |                            |
| S07 | Check-in                 | F10, F9, F7.8                      | not started | not started |             |                            |
| S08 | Intake                   | F6, F9, F7.9                       | not started | not started |             |                            |
| S09 | Task sheets              | F10, F7.4, F7.6                    | not started | not started |             | Fixed allergen list (O1)   |
| S10 | Tools and guides         | F6                                 | not started | not started |             |                            |
| S11 | Account                  | F6                                 | not started | not started |             |                            |
| S12 | Inbox and 404            | F6, F8, F7.1                       | not started | not started |             |                            |

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

Order (O4): done on 2026-11-23. On the owner's word the parent merged #99, #100 and #101 into `main`, then merged `main` into this specs PR with the O4 resolution.

Run start (O5): the install switch `AGENT_GUARD_ALLOW_INSTALL=1` is set in the main checkout's `.claude/settings.local.json` (local, not committed), so sessions started there get it. Remove it when Q5 merges.

## Android evidence pending

Each task that defers Android screenshots to the owner's kit run (the Pixel 6, O11):

- B2 (#113), B3 (#108), B4 (#111); B5 and B6 when their PRs open.
