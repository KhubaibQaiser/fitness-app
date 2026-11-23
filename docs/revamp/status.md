# Revamp status board

Only the parent edits this file ([`agents.md`](agents.md)). States: `not started` · `blocked (<reason>)` · `mock` · `mock approved` · `building` · `in review` · `merged`.

Last updated: 2026-11-23, when the specs were written. Nothing has started.

## Phase 1

| Id  | Task                           | Depends on | State       | Branch / PR | Notes                                                     |
| --- | ------------------------------ | ---------- | ----------- | ----------- | --------------------------------------------------------- |
| U1  | Next.js 16.4.6                 | docs       | not started |             | Supersedes #98 (O3)                                       |
| U2  | Patch and minor bumps          | U1         | not started |             | Supersedes #78, #96, #97                                  |
| U3  | Expo SDK 58                    | U2         | not started |             | Supersedes #79, #81; Android smoke on the owner's MacBook |
| U4  | Tamagui 3.3 and icons          | U3, B1–B6  | not started |             | Supersedes #80                                            |
| B1  | Attention count                | docs       | not started |             |                                                           |
| B2  | Empty draft                    | docs       | not started |             |                                                           |
| B3  | Login errors                   | docs       | not started |             |                                                           |
| B4  | Native top inset and tab route | docs       | not started |             | Android screenshots pending the kit                       |
| B5  | Native hub header              | docs       | not started |             |                                                           |
| B6  | Invalid Date                   | docs       | not started |             |                                                           |
| Q0  | Measurement harness            | docs       | not started |             |                                                           |

## Phase 2

| Id   | Task                                 | Depends on     | Mock                 | State        | Branch / PR | Notes                                  |
| ---- | ------------------------------------ | -------------- | -------------------- | ------------ | ----------- | -------------------------------------- |
| F1   | Tokens, themes, tenant               | U4             | token sheet          | not started  |             | `pilot.json` is CODEOWNERS             |
| F2   | Type, RTL, formatters                | F1             | type sheet           | not started  |             | Font installs (O5)                     |
| F3   | Glass                                | F1             | glass sheet          | not started  |             | Installs (O5); Android gate in Q4      |
| F4   | Motion, haptics                      | F1             | motion demo          | not started  |             | `expo-haptics` (O5)                    |
| F5   | Component kit                        | F2, F3, F4     | kit sheet            | not started  |             |                                        |
| F6   | Navigation shells                    | F5, F7.1, F7.2 | shells               | not started  |             | O8 for orientation                     |
| F7.1 | Today queue and pulse                | U2             |                      | not started  |             |                                        |
| F7.2 | Roster v2                            | U2             |                      | not started  |             |                                        |
| F7.3 | Prefetch and public config           | U2             |                      | not started  |             |                                        |
| F7.4 | Progress series, vitals date         | U2             |                      | not started  |             |                                        |
| F7.5 | Plan versions and review data        | U2             |                      | not started  |             |                                        |
| F7.6 | Dietary impact preview               | U2             |                      | not started  |             |                                        |
| F7.7 | Signature later                      | U2             |                      | not started  |             |                                        |
| F7.8 | Check-in validation, verdict reasons | U2             |                      | blocked (O9) |             | May touch `packages/core` (CODEOWNERS) |
| F7.9 | Intake drafts                        | U2             |                      | blocked (O7) |             |                                        |
| F8   | Illustrations and images             | F1             | illustration set     | blocked (O6) |             |                                        |
| F9   | Charts                               | F2, F4         | chart states         | not started  |             |                                        |
| F10  | Client shell                         | F6             | header, tabs, sheets | not started  |             |                                        |

## Phase 3

| Id  | Screen                   | Starts after                       | Mock        | State                  | Branch / PR | Notes                                          |
| --- | ------------------------ | ---------------------------------- | ----------- | ---------------------- | ----------- | ---------------------------------------------- |
| S01 | Auth                     | F6, F8                             | not started | not started            |             |                                                |
| S02 | Today                    | F6, F8, F7.1 (F7.9 for draft rows) | not started | not started            |             | Mock priority 1. Intake-draft rows wait for O7 |
| S03 | Clients                  | F6, F7.2                           | not started | not started            |             |                                                |
| S04 | Hub overview and profile | F10, F9, F7.3, F7.7                | not started | not started            |             |                                                |
| S05 | Progress                 | F10, F9, F7.3, F7.4                | not started | not started            |             |                                                |
| S06 | Plan                     | F10, F9, F7.3, F7.5                | not started | not started            |             |                                                |
| S07 | Check-in                 | F10, F9, F7.8                      | not started | blocked (O9, via F7.8) |             | Mock can start                                 |
| S08 | Intake                   | F6, F9, F7.9                       | not started | blocked (O7, via F7.9) |             | Mock can start                                 |
| S09 | Task sheets              | F10, F7.4, F7.6                    | not started | not started            |             | "Other allergen" waits for O1                  |
| S10 | Tools and guides         | F6                                 | not started | not started            |             |                                                |
| S11 | Account                  | F6                                 | not started | not started            |             |                                                |
| S12 | Inbox and 404            | F6, F8, F7.1                       | not started | not started            |             |                                                |

## Phase 4

| Id  | Task                    | State        | Notes                  |
| --- | ----------------------- | ------------ | ---------------------- |
| Q1  | Visual and states sweep | not started  |                        |
| Q2  | Performance             | not started  |                        |
| Q3  | Accessibility and RTL   | not started  |                        |
| Q4  | Devices                 | blocked (O2) | Low-end Android device |
| Q5  | Release and clean-up    | not started  |                        |

## Waiting on the owner

From [`rulings.md`](rulings.md), open items: O1 custom allergens, O2 test device, O3 Dependabot closures, O4 land #99/#100/#101 first or rebase, O5 dependency installs, O6 illustration source, O7 intake drafts, O8 iPad orientation, O9 check-in validation, O10 concurrency cap; and derived rule D1.

## Android evidence pending

None yet. Each task that defers Android screenshots to the owner's kit run is listed here.
