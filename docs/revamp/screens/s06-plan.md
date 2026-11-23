# S06: Plan tab, plan editor, Review & publish

- **Routes:** web `apps/web/app/(coach)/clients/[clientId]/meal-plan/page.tsx` (the Plan tab) and `.../plan/page.tsx` (the editor); the native equivalents. URLs stay as they are.
- **Owned paths:**
  - `packages/app/src/features/plan/**`.
  - `packages/app/src/features/client-detail/client-hub-plan.tsx`.
  - The two route files.
- **Depends on:** F10; F9 (macro bars); F4 (`stamp`); F7.3 (prefetch helpers, called from the route files); F7.5 (versions and review data); the F2 pace formatter for the goal context.
- **Evidence:** critique 23–25, top-10 #2, bugs 2, 10 and 11, §5.3; A19; `motion.md` §5.7; ADR-0001.
- **Out of scope:**
  - Custom food items and count-based portions ("3 boiled egg whites"): a separate meal-planner track.
  - The PDF content fix on branch `fix/diet-plan-pdf-snacks-and-options`. It touches only the PDF renderer, so the two don't conflict.

## Goal

The product's signature, safety-critical workflow. The coach always knows which plan the client is on, sees why a draft looks the way it does, and signs off knowingly.

## Plan tab

1. **Status first:**
   - **Live:** "Published v1 · since 6 Aug · 1,890 kcal", with View and PDF.
   - **Draft:** "Draft v2 · created 30 Jul from check-in · +120 kcal vs live · 4 foods swapped", with **Review & publish** (primary), Edit and Discard.
   - **Needs review:** in danger tone at the top, with the reason and **Review**.
2. **Targets** labelled as targets, with their source; fiber included (bug 11).
3. **Dietary summary** with the allergy chip, as a real link on every platform ("Tap to add" only on touch).
4. **Version list,** collapsed.
5. **Empty:**
   - The meals-per-day choice (3 · 4 · 5, one line on each pattern) and **Generate draft**, in place, in one step.
   - Then a 7-day skeleton with a stage line ("Checking restrictions → solving portions → naming meals"), landing in the editor.
   - A blocking safety gate shows the override prompt inline, with its audit explanation.

## Editor

1. **Header:**
   - The F10 client header with the allergy chip.
   - The status ("Draft v2").
   - A versions dropdown ("v1 · Published 6 Aug", "v2 · Draft").
   - Actions: Download PDF, Regenerate, **Review & publish** (primary).
2. **Desktop, three zones:**
   - **Left, the week** (about 200 px): Mon–Sun with kcal, a drift dot (in band or off band) and "Customized". At the bottom, "5/7 days within ±5%".
   - **Centre, the selected day:** sections from the meal pattern, never only from existing items (B2). Item rows have:
     - the food;
     - the F5 grams stepper;
     - kcal · P · C · F in tabular figures;
     - a provenance marker for coach overrides;
     - swap (ranked by the solver) and remove.

     Each section has a subtotal, **Add food** (inline catalog search) and Regenerate meal.

   - **Right, sticky "Day vs target":**
     - Macro bars with the tolerance band, fiber included.
     - The allergen line: "Peanut: excluded · checked before and after solving".
     - "Targets from goal · 30 Jul check-in".
3. **Provenance copy** (A19): "Solver draft: foods and grams from the catalog, names by the language model. Review before publish." No unlabelled "−100.0%" chips, and no developer footnotes.
4. **"Apply this day to all days"** asks for confirmation and offers Undo in a toast.
5. **Needs review:** violating items are highlighted, each with "Replace with safe alternative".
6. **Phone:**
   - Day chips scroll.
   - A sticky bottom bar ("1,850 / 1,890 kcal · P 205/209") opens the targets sheet.
   - Tapping an item opens a sheet with the stepper and the swap list.
   - Review & publish sits in the header (web) or the nav bar (native).

## Review & publish sheet

1. **Summary:**
   - Days customised.
   - Days off target, with the acknowledgement checkbox only when needed.
   - The allergen check result.
   - The diff against the live version.
   - A PDF preview link.
2. **"I reviewed this plan"**, then **Publish.** Publish is always the coach's action.
3. **Success:**
   - The `stamp` focal moment (M1).
   - The `success` haptic on native.
   - A toast "Plan v2 published · v1 superseded".
   - The badge animates to Published, and the Plan tab shows "Live: v2".

## States

Live only; live and draft; draft only; empty draft; generating; generation failed (solver infeasible: "Couldn't fit these targets with the allowed foods", with Try again and Adjust targets); needs review; published; loading; error.

## Performance

INP 200 ms or less for a grams step and a day switch at 4× CPU. Totals update with a 150 ms number tween.

## Mock

Plan tab (each status), editor desktop and phone, the Review & publish sheet, needs review, empty and generating; light and dark; iOS.

## Done when

- The global conditions hold.
- Tests:
  - The live plan is always shown when one exists (bug 10).
  - Version list order and labels.
  - Empty-draft generate in place.
  - Drift dots and the week summary.
  - The allergen line comes from F7.5 data.
  - The acknowledgement appears only when off target.
  - Undo restores the prior days.
  - Publish requires the review checkbox.
- Safety: numbers come only from API data; nothing is computed from the language model.
- The B2 regressions are still covered (screens README rule).
- Perf is recorded.
