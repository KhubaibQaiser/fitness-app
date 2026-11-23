# S07: Check-in workspace, verdict and detail

- **Routes:** web `apps/web/app/(coach)/clients/[clientId]/check-in/page.tsx` and `.../check-ins/[checkInId]/page.tsx`; native equivalents (form sheet, medium detent, from F10).
- **Owned paths:** `packages/app/src/features/check-in/**` (including `detail.tsx` and `adherence.ts`) and the two route files.
- **Depends on:** F10; F9 (mini trend); F7.8 (validation and structured reasons, blocked on rulings O9).
- **Evidence:** critique 18–19, top-10 #3, bugs 3, 7, 8, 22 and 23, §5.2; A8, A10; `motion.md` §5.6.

## Goal

The weekly action. One clear capture of the week, a verdict in plain words, the next action as a button, and a fast path through a busy Monday.

## Workspace

1. **Context** (left on desktop; a collapsed summary at the top on phone):
   - Last check-in: date, weight, adherence in words, notes.
   - A mini weight trend.
   - Current targets.
2. **Inputs:**
   - **Weight:** in the coach's unit (bug 7), with the last value shown and a live change ("−0.6 kg in 7 days"). Required unless "No weigh-in this week" is ticked.
   - **Adherence:** a 5-step control in words: Off plan · A few days · About half · Most days · Every day. Required; it maps to the engine's 1–5 (A8).
   - **Notes:** optional.
3. **Primary: Get verdict.** Validation follows rulings O9 and is enforced at the server too (bug 22).

## Verdict

1. **In place.** The verdict renders where the form was, and the URL becomes `/check-ins/<id>` (replace), so refresh and share keep it (bug 23).
2. **Per type:**

   | Verdict                           | Title                                                                   | Primary action                  | Other                                                                                                |
   | --------------------------------- | ----------------------------------------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------- |
   | HOLD                              | "On track. Keep the current plan."                                      | **Done** (or **Next client →**) |                                                                                                      |
   | ADJUST_TARGETS                    | "Adjustment recommended: −150 kcal/day."                                | **Apply and draft plan v3**     | The reason as a sentence; actual against expected kg/week as a small visual; Keep current plan       |
   | ADHERENCE_FOCUS, PLATEAU_PROTOCOL | A plain recommendation                                                  |                                 | A suggested WhatsApp message, prefilled; **Copy message** and **Open WhatsApp** (the coach sends it) |
   | REFER_REVIEW                      | Danger tone                                                             | none: apply is not offered      | Physician guidance; logged                                                                           |
   | INSUFFICIENT_DATA                 | "Not enough weigh-ins yet: need 4 over 10 days, you have 3 over 1 day." | **Log vitals**                  |                                                                                                      |

   Reasons come from F7.8's structured fields (bug 8). No raw type badge, and no confidence percentage.

3. **Apply.**
   - A short diff ("−150 kcal: rice 180 g → 140 g on 7 days").
   - Then the new draft in the S06 editor.
4. **Batch** (A10):
   - With a `next` list from Today, Done becomes "Next: Hafsa Yaseen (105 d overdue) →" with "2 of 5 done".
   - The transition shifts laterally (`shift`).
   - The list is parsed and validated here (screens README hand-offs).

## Detail (a past check-in)

1. **Read view by default:**
   - The verdict card: title, reasons as sentences, and the action taken ("Held", or "Applied −150 kcal → plan v3").
   - Inputs as a definition list: weight with change, adherence in words, notes or "No notes".
   - Previous and next arrows.
2. **Edit inputs** (secondary) switches to edit mode with the warning: "Re-running replaces this verdict. The plan isn't changed unless you apply again."

## States

Empty form; validation errors; getting verdict; each verdict type; applying; apply failed; batch progress; batch finished; detail read; detail edit; loading; error.

## Motion and haptics

- The verdict reveal (`reveal`, `slow`, `emphasized`).
- Native haptics: `success` on HOLD, `attention` on REFER_REVIEW, and none on the other verdicts (`motion.md` §3.6).

## Mock

Workspace desktop and phone, each verdict, batch, detail read and edit; light and dark; iOS form sheet.

## Done when

- The global conditions hold.
- Tests:
  - Adherence words map to and from 1–5 for every value.
  - Validation, client and server.
  - Each verdict renders its title and actions.
  - The URL is replaced after submit, and a reload shows the verdict.
  - Batch next and progress, including an invalid id.
  - Detail opens read-only; edit shows the warning.
- Screenshots of every verdict on web and iOS.
