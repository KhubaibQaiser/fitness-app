# S08: New client intake

- **Routes:** web `apps/web/app/(coach)/clients/new/page.tsx`; native `clients/new`, presented full screen with no tab bar (F6).
- **Owned paths:** `packages/app/src/features/client-onboarding/**` (the signature pad and phone field moved to the kit in F5) and the two route files.
- **Depends on:** F6; F9 (the projected journey); F7.7 (drafts, blocked on rulings O7).
- **Evidence:** critique 12, top-10 #9, bugs 15 and 21, §5.1; A11; `motion.md` §5.8.

## Goal

Capture a new client in five steps without losing work, show the safety picture while the coach chooses, and end on a review the client can read and sign.

## Steps (from 8 to 5)

1. **Client:**
   - Full name.
   - Sex: a required radio with no default.
   - Date of birth. If skipped: "Targets will assume age 30", shown and carried to the hub (bug 15).
   - Phone with a "WhatsApp" checkbox.
   - Email.
2. **Body & activity:**
   - Height and weight, in the coach's units with an inline toggle.
   - "Add measurements", collapsed.
   - Activity level with descriptions; a required choice with no default.
3. **Goal & safety:**
   - Goal (required, no default).
   - Target weight.
   - The pace slider with labelled stops.
   - Medical conditions, physician clearance, and pregnancy (female only).
   - Safety banners appear here, live, as values cross thresholds: below the sex floor, beyond the recommended pace, the medical gate.
4. **Diet:** severe allergies (F5 checkbox chips), lifestyle, preferred foods (optional).
5. **Review & sign:**
   - Client-facing summary cards, each with **Edit**, which returns to its step and then back to Review.
   - The projected journey (F9).
   - The large signature pad with Clear.
   - **Create client.**

## Layout

- **Desktop:**
  - A left step rail with names, check marks and jump-back to finished steps.
  - The form column, at most 640 px wide.
  - A right live preview: "2,261 kcal · 160 g protein · goal ~24 Jan 2027", from the existing Layer-1 preview code.
- **Phone and native:**
  - Close (X) top-left. It asks "Keep draft / Discard".
  - Title "New client", with the step name and count under it (the title and subtitle are no longer inverted).
  - Sticky Back and Continue.

## Drafts (A11)

- **Autosave** on every step change, through F7.7 (or device storage, per O7).
- **Resume:**
  - Today lists "Resume intake: Sara, step 3 of 5".
  - Opening it restores every field and the step.
  - Create or Discard removes the draft.

## Fixes

- Exit from step 1.
- No biased defaults.
- Consistent sentence-case labels and a visible label on Sex.
- Server errors surface on the step they belong to, with an error summary that takes focus.
- No 1,110 px inputs.

## States

- Each step: valid, invalid, and with live safety banners.
- Saving the draft, and draft save failed (visible, with retry).
- Draft resumed.
- Create failed (step-level error).
- Created.

## Motion and haptics

- Steps shift laterally (`shift`); the live preview numbers roll.
- Native gives the `success` haptic when the signature is saved and the client created.
- Reduced motion uses fades.

## Mock

Every step, Review & sign, and the resume entry; light and dark; web 1440 and 390; iOS.

## Done when

- The global conditions hold.
- Tests:
  - `validate-step` is updated for five steps.
  - Sex, activity and goal have no default and are required.
  - Draft save and resume restore every field.
  - Edit from Review returns to Review.
  - Errors map to their steps and focus the summary.
  - The age-assumption note persists to the created client.
- After create the app lands on the hub with the toast.
