# Phase 3: screens

One builder and one reviewer per screen, all in parallel once their gates open ([README §4](../README.md#4-phases-and-dependency-graph)). Each spec below is the builder's whole brief together with [`agents.md`](../agents.md).

| Id                         | Screen                                  | Starts after | Data slice                        | Mock priority |
| -------------------------- | --------------------------------------- | ------------ | --------------------------------- | ------------- |
| [S01](s01-auth.md)         | Auth: login, signup, forgot password    | F6, F8       | none                              | 9             |
| [S02](s02-today.md)        | Today queue                             | F6, F8       | F7.1 (F7.9 for intake-draft rows) | 1             |
| [S03](s03-clients.md)      | Clients roster                          | F6           | F7.2                              | 5             |
| [S04](s04-client-hub.md)   | Client hub: Overview and Profile        | F10, F9      | F7.3, F7.7 (signature)            | 2             |
| [S05](s05-progress.md)     | Progress (Journey and History merged)   | F10, F9      | F7.3, F7.4                        | 8             |
| [S06](s06-plan.md)         | Plan tab, plan editor, Review & publish | F10, F9      | F7.3, F7.5                        | 4             |
| [S07](s07-check-in.md)     | Check-in workspace, verdict, detail     | F10, F9      | F7.8                              | 3             |
| [S08](s08-intake.md)       | New client intake                       | F6, F9       | F7.9 (O7)                         | 6             |
| [S09](s09-task-sheets.md)  | Task sheets: vitals, goal, dietary      | F10          | F7.4 (vitals date), F7.6          | 7             |
| [S10](s10-tools-guides.md) | Tools and Guides                        | F6           | none                              | 10            |
| [S11](s11-account.md)      | Account                                 | F6           | none                              | 10            |
| [S12](s12-inbox-404.md)    | Inbox and 404                           | F6, F8       | F7.1                              | 10            |

Mock priority follows critique §8: Today first, then the hub and the check-in. A mock can start as soon as the F5 kit sheet is approved.

## Rules for every screen

- **Own only the listed paths.**
  - A shared component you need goes through the kit lane, and an API change through the contracts lane ([README §6](../README.md#6-file-ownership-and-change-lanes-conflict-prevention)).
  - Importing another feature's exported component is fine. Editing it is not.
- **Mock first** ([README §7](../README.md#7-gates)):
  - Light and dark; web 1440 and 390; iOS native chrome; Android Material chrome for S02–S04.
  - Real states: the overdue-heavy demo data, an empty client, loading, error, plus the states the spec lists.
  - The owner approves before screen code.
- **Content and copy are shared across platforms; only chrome and interaction differ** (critique §9.5).
- **Words, not codes.**
  - Status, verdicts, adherence, dates and units come only from the F2 formatters.
  - Never an enum, ISO date, `toLocaleString()`, percent adherence or hard-coded unit.
- **Nutrition safety is unchanged:**
  - Numbers come from Layers 1–2 only.
  - Publish is always a human action.
  - The severe-allergy chip is always visible on client screens.
- **Keep the B1–B6 regressions covered.** Their tests keep passing, or are replaced by equal or stronger tests that cover the same bug when the screen is rebuilt (for example once F7.1 moves the counts to the server, or F10 replaces the hub header).
- **Delete what you replace.** When a screen stops using a legacy component or alias, say so in the PR so Q5 can remove it.

## Hand-offs between screens

| From          | To           | Contract                                                                                                                                                                                                                                                                           |
| ------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S02 Today     | S07 Check-in | "Start check-in" opens `/clients/<id>/check-in?next=<id,id,…>`: the remaining overdue and due client ids in Today's order, at most 50. S07 owns parsing it and shows "Next client →". An invalid or foreign id is dropped and logged, never fetched.                               |
| S07 Check-in  | S06 Plan     | "Apply and draft plan vN" goes to the new draft in the editor with the diff summary open.                                                                                                                                                                                          |
| S08 Intake    | S04 Hub      | After create: navigate to the hub with a toast "<name> added"; Next steps leads with "Generate first plan".                                                                                                                                                                        |
| S09 goal form | S10 Guides   | "How it works" opens the targets explainer from `features/nutrition-criteria` in a side sheet, anchored to the relevant section. S09 imports the export as it is when S09 starts; S10 owns it and keeps the export's name, props and existing anchors stable (it may add anchors). |
| S09 dietary   | S06 Plan     | A save that flips a live plan to NEEDS_REVIEW shows the impact line first (F7.6); the Plan tab and Today then show "Plan blocked: <allergen> added. Review."                                                                                                                       |

## Reviewer checklist (every screen, on top of the spec's own)

1. Every done condition in the spec is met, with evidence (test name, screenshot, measurement).
2. No edits outside the owned paths.
3. No AGENTS.md "Denied" item: `Platform.OS` in `packages/app`, raw `fetch`, raw `<div>`, tenant conditionals, secrets.
4. Every state in the spec exists and none spins forever.
5. Words, not codes (rule above).
6. Accessibility:
   - Contrast from tokens.
   - 44 pt targets.
   - Labels reach the web DOM as ARIA.
   - Focus is visible and moves on errors.
   - Colour is never the only signal.
   - Reduced motion and Reduce Transparency are honoured.
   - Labels never break mid-word.
7. RTL-ready: logical properties only; directional icons mirror.
8. Performance budget recorded with the Q0 harness, on the same data and settings as the baseline.
9. Screenshots match the approved mock, and differences are listed.
