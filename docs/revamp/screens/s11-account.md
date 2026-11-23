# S11: Account

- **Routes:** web `apps/web/app/(coach)/settings/page.tsx` and `settings/meal-planner/page.tsx` (URLs stay, labelled Account); native: the Account tab root, plus a new native meal-planner route for parity (mobile has none today).
- **Owned paths:** `packages/app/src/features/settings/**` (including `meal-instructions/`) and those route files.
- **Depends on:** F6 (with F1 theme mode and F3's "Solid bars" preference already merged).
- **Evidence:** critique 27–28; R4; ADR-0019 §6.

## Goal

A calm grouped settings list where the safe actions are easy and the destructive one is clearly separate.

## Layout

1. **Grouped list:** inset groups on iOS, a Material list on Android, a 720 px column (or two panes with a section list) on desktop.
2. **Groups:**
   1. **Profile:** name, email, phone. Editable rows with chevrons only if an update endpoint exists; otherwise read-only, with editing listed in the README's future work.
   2. **Preferences:**
      - Weight kg | lb, Height cm | ft-in, Measurements cm | in, as compact rows with trailing segmented controls.
      - **Appearance: System | Light | Dark** (R4; default System).
      - **Solid bars** (turns glass off, F3).
   3. **Meal planner:** one row, "Meal naming instructions".
   4. **Security:** Sign out; then, separated at the bottom, "Sign out of all devices" as destructive text with a confirm dialog. It is no longer a red filled button.
   5. **About and privacy:** version, privacy statement, where units are stored.
3. **Hierarchy:** group titles outrank row labels.

## Meal naming instructions

1. **One name everywhere:** "Meal naming instructions".
2. **The editor:**
   - Taller, with a character count.
   - Insertable example chips ("Prefer desi breakfasts", "Prep notes under 10 minutes", "Warm, encouraging tone").
   - A visible note on what can't change (portions and macros).
   - The workspace default shown read-only above.
3. **The toolbar.** Check how the instructions reach Layer 3:
   - If plain text, remove the Bold/Italic/Heading/Bullet toolbar.
   - If Markdown, make the tools real icon buttons with tooltips.
4. **Preview:** a static before-and-after example. A live preview needs a model call, which is a decision and goes to the README's future work.

## States

Default; saving; saved (toast); save failed; sign-out-all confirm; loading; error.

## Mock

Account on desktop, phone, iOS and Android; meal naming instructions; light and dark.

## Done when

- The global conditions hold.
- Tests:
  - Appearance persists in three states and the app follows the system in System mode.
  - Solid bars switches chrome to solid.
  - Unit preferences persist and apply on another screen (a check-in or vitals render).
  - Sign out of all devices requires confirmation.
  - The meal instructions save, and the character count works.
- The native meal-planner route exists.
