# S09: Task sheets (vitals, goal, dietary)

- **Routes:** web `apps/web/app/(coach)/clients/[clientId]/vitals/new`, `goal/new` and `dietary`; native equivalents. Presentation comes from F10: a desktop side sheet, a phone full-screen route, and native form sheets with the large detent.
- **Owned paths:** `packages/app/src/features/vitals-entry/**`, `goal-form/**`, `dietary/**` and their route files.
- **Depends on:** F10; F7.4 (vitals measurement date); F7.6 (dietary impact preview).
- **Evidence:** critique 16, 17 and 20, top-10 #4, bugs 7, 9 and 17, N7; A9.

One pattern, three instances. Each sheet keeps the F10 client header, guards unsaved changes, and closes onto the hub with a toast.

## Vitals

1. **Rows:**
   - The label on the left.
   - A compact input (about 140 px) in the coach's unit (bug 7).
   - On the right: "Last 84.5 kg · 6 Aug", plus a live change chip once typed ("−0.4 kg").
   - The last value appears once, not as both placeholder and helper.
2. **Measurement date,** defaulting to today, so a reading can be back-dated.
3. **Sections:** body composition open; circumferences collapsed under "Add measurements"; cardio.
4. **Save:**
   - Save stays enabled. An empty submit says "Enter at least one measurement".
   - On save, the sheet closes, the toast reads "Vitals saved for Adnan", and the new point eases into the hub chart.
   - The "Back" success page goes.

## Goal

1. **Two panes on desktop:**
   - **Left, inputs:**
     - Activity as a segmented control with a strong selected state and a one-line description of the chosen level. On native it becomes a list picker, with no mid-word breaks (N7).
     - Goal.
     - Target weight.
     - Start weight, read-only with a Change link.
     - The pace slider with labelled stops and a labelled floor marker.
   - **Right, a live outcome card:**
     - Daily kcal, P/C/F grams and weekly change.
     - **The projected goal date.**
     - The safety state in words.
2. **"How it works"** opens the targets explainer in a side sheet (screens README hand-offs), so the coach never navigates away from unsaved changes.
3. **Pace label:** read it from the F2 pace formatter, which fixes the cause of bug 9 ("Custom pace" here against "Standard" on the Plan tab). S06 reads the same formatter.
4. **Phone:** a single column, with the outcome card as a compact sticky bar ("2,261 kcal · goal ~24 Jan").
5. **Copy:** drop marketing lines ("The AI never invents numbers").

## Dietary

1. **Severe allergies** as F5 checkbox chips: filled danger chip, check icon, `aria-checked`, bold label.
   - With none selected, the card is neutral.
   - Once one is selected: "1 severe allergy · hard-blocked in every plan".
2. **Lifestyle** chips use the same selection grammar in the accent tone.
3. **Preferred foods** through a catalog search picker, with chips. Fix the copy that says the AI planner picks foods; the solver does (bug 17, ADR-0001).
4. **Save:**
   - Before committing, show F7.6's impact line ("Saving will mark published plan v1 as Needs review."), then confirm.
   - A version history link ("Version 2 · changed 6 Aug").
5. **No custom allergens** (rulings O1): keep the fixed list.

## States

For each sheet: empty, filled, validation errors, saving, saved, save failed, dirty-dismiss confirm, loading, error.

## Haptics

`select` on chips and segments; `bound` when pace crosses the floor; nothing on save.

## Mock

The three sheets on desktop (over the hub), phone and iOS form sheet; light and dark; an allergic client and an empty one.

## Done when

- The global conditions hold.
- Tests:
  - Vitals inputs and display follow unit preferences.
  - Empty-submit message.
  - Back-dated save.
  - Pace labels and the projected date.
  - One pace label source shared with the Plan tab.
  - Chip selection exposes `aria-checked` and differs in shape.
  - The impact line shows before a save that flips a plan.
  - The unsaved guard on every sheet.
