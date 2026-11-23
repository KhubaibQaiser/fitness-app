# S04: Client hub, Overview and Profile

- **Routes:** web `apps/web/app/(coach)/clients/[clientId]/page.tsx` (Overview) and `.../profile/page.tsx` (created by F10); the native equivalents.
- **Owned paths:**
  - `packages/app/src/features/client-detail/client-hub-overview.tsx`, `client-hub-skeleton.tsx`, and `index.tsx` (F10 rewrites it first; S04 owns it after F10 merges).
  - `packages/app/src/features/client-detail/profile/**` (new).
  - The Overview route file, and the Profile route file once F10 has created it.

  The header, tabs and menu belong to F10; the chart to F9; Progress to S05; the Plan tab to S06.

- **Depends on:** F10; F9; F7.3 (prefetch helpers; S04 calls them from its route files); F7.7 (collect signature).
- **Evidence:** critique 13–15, top-10 #5, bugs 5, 6, 13, 15 and 16, N2; perf (hub API waterfall at 1.9–2.7 s, longest task 281 ms).

## Goal

One person: where they stand, what's wrong, and what to do next, without hunting.

## Overview

1. **Next steps card first.** One line per open item, each with a button, derived from engine state:
   - "Check-in overdue by 109 days" → **Start check-in**
   - "Intake not signed" → **Collect signature** (replaces the false "Onboarding incomplete" banner, bug 6)
   - "No meal plan" → **Generate**
   - "Plan blocked: peanut added" → **Review plan**
   - "No goal" → **Set goal**
   - "Targets assume age 30" → **Add date of birth**
   - A resolved item collapses out.
2. **Main area** (8 of 12 columns on desktop):
   - The F9 weight chart.
   - Under it, one progress line: "43% · 4.5 kg to go · on pace for 24 Jan 2027". The ring goes.
   - Pace says planned against actual ("Planned 0.51 kg/wk · actual 0.20 kg/wk over 3 weeks").
3. **Side area** (4 of 12 columns):
   - Current targets with their source ("from goal · adjusted 30 Jul").
   - Plan status line ("Published v1 · since 6 Aug").
   - Last check-in summary.
   - Adherence trend in words.
4. **Phone and native:** Next steps, then the chart, targets and last check-in, in that order.

## Profile (new tab, A18)

- **Read-only sections:**
  - Identity and contact, with phone numbers through the F2 formatter (bug 16).
  - Body and activity.
  - Medical flags and clearance.
  - Dietary summary with the allergy chip and a link to the dietary sheet.
  - Goal summary with Edit goal.
  - Documents: Intake PDF download, and signature status ("Signed 6 Aug", or **Collect signature**).
- **Visible assumptions:** "Targets assume age 30 until a date of birth is added" (bug 15).
- **Out of scope:** editing identity and contact fields. If no update endpoint exists, it goes to the README's future work.

## Collect signature (A11)

- A sheet showing the intake summary the client is agreeing to, the F5 signature pad, and **Save signature**.
- It uses F7.7's endpoint and stores the signed intake exactly as onboarding does.
- Native gives the `success` haptic.

## States

Rich client; single weigh-in (F9 state); no goal; no plan; unsigned intake; severe allergy; loading skeleton; error with retry.

## Motion

Chart draw-in (F9); Next-steps row collapse; skeleton crossfade.

## Performance

- Hub cold phone LCP 2.5 s or less, with server prefetch (F7.3).
- Longest task 200 ms or less at 4× CPU.
- No client fetch waterfall on first load (network log in the PR).

## Mock

Overview for rich, single-weigh-in, empty and allergic clients; Profile; Collect signature; light and dark; web 1440 and 390; iOS; Android.

## Done when

- The global conditions hold.
- Tests:
  - Next-steps derivation: each engine state gives its line and action; resolved items disappear.
  - Profile renders every section, including the age assumption.
  - The collect-signature flow, against F7.7's contract.
  - Planned against actual pace.
- Perf is recorded with the Q0 harness.
- The B5 regression is still covered (screens README rule).
