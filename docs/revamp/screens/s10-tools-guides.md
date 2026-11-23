# S10: Tools and Guides

- **Routes:** web `apps/web/app/(coach)/tools/page.tsx`, `tools/meals`, `tools/targets`, and the `settings/nutrition` redirect (kept for old bookmarks); native equivalents.
- **Owned paths:** `packages/app/src/features/tools/**`, `meal-composition/**`, `nutrition-criteria/**` and their route files.
- **Depends on:** F6.
- **Evidence:** critique 29–32, bug 20, N7.

## Goal

Calculators that show results as you type, and Guides that read like articles and that other screens can deep-link into.

## Tools (calculators)

1. **Two panes on desktop:**
   - Inputs on the left (5 of 12 columns).
   - Results on the right, sticky: BMR, TDEE and target, each with its formula named ("Mifflin–St Jeor").
   - The target appears once.
2. **Phone:** results as a compact sticky bar at the bottom of the screen, which expands into the full results.
3. **Inputs:** the slider uses the labelled F5 pace slider, and units come from preferences (already true, keep it).
4. **Fix the hydration mismatch** on `/tools` (bug 20).
5. **Out of scope:** "Use for a client…" prefill is a scope decision; it goes to the README's future work.

## Guides (the two explainers)

1. **One scrolling article** per guide, with an anchored contents list (sticky on desktop), replacing the 5–6 tabs. Reading measure about 70 characters.
2. **How meals are planned:** each pattern is a labelled proportional bar ("Breakfast 28% · Lunch 47% · Dinner 25%"), replacing the button-like chips.
3. **How targets work:** keep the five numbered steps. Every section has a stable anchor for deep links from the goal form, intake and the plan editor.
4. **Copy:** drop the "Layer 1" and "Layer 2" badges and developer phrasing ("Same keys as the generate screen").
5. **Contextual help:** export the targets explainer so other features can show it in a side sheet (S09 hand-off).

## States

Default; invalid input (inline, results hidden with a reason); loading of public config; error.

## Mock

Tools on desktop and phone; both Guides; light and dark; iOS.

## Done when

- The global conditions hold.
- The calculators' existing tests pass, so the numbers are unchanged.
- The anchor deep-link test passes.
- The Playwright console shows no hydration warning on `/tools`.
- No mid-word breaks on iOS.
