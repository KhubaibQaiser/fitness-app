# S01: Auth (login, signup, forgot password)

- **Routes:** web `apps/web/app/(public)/login`, `signup`, `forgot-password`; native `apps/mobile/app/(auth)/login`, `signup`, `forgot-password`.
- **Owned paths:**
  - `packages/app/src/features/auth/**`, `login/**`, `signup/**`, `forgot-password/**`.
  - The route files above, and `apps/web/app/(public)/layout.tsx`.

  The native `(auth)/_layout.tsx` belongs to F6.

- **Depends on:** F6; F8 (the hero component with the current art, at sized files). L1 redraws the art after the track, behind the same component.
- **Evidence:** critique 01–03, §9.1 #3 and #4, N6 and N8; perf (login LCP 7.1 s, of which 6.6 s is render delay); `docs/specs/public-auth-split-layout.md`.

## Goal

The auth screens were the quality reference. Restyle them to Floodlight (R5), keep their calm single focus, and surpass them on states. The illustration keeps today's art until L1 (rulings O6).

## Changes

1. **Floodlight split layout.** The illustration stays mounted across the three routes and the form slides, per the existing spec, now on F4 tokens with the reduced-motion cut.
2. **Submit buttons stay enabled.** Errors show inline, focus moves to the first error, and an error summary is announced. This replaces pre-disabled buttons at 1.97:1.
3. **Password reveal** on every password field, with a labelled toggle.
4. **OTP:** paste-friendly code entry. Keep `textContentType` one-time-code.
5. **Error mapping** from B3 stays, restyled: network, 5xx, 429, 401, and lockout (FR-C1).
6. **Small fixes:** remove the "COACH" tracked-caps eyebrow; "Signing in…" fits without truncation (N7); the first screen renders in Inter (N8, from F2).
7. **Native:** single column with the illustration as a header band, keyboard avoidance, and autofill hints.

## States

Idle; field errors; submitting; wrong credentials; can't reach GymOS; server trouble; rate-limited; locked out; OTP sent; OTP wrong or expired; password reset done; signup duplicate phone.

## Motion and haptics

- The form slide uses `slow` with `emphasized` easing; reduced motion swaps to the 120 ms fade. Remove this feature's own reduced-motion hook copy and use F4's hook.
- Native gives the `error` haptic on a failed submit.

## Performance

Login LCP 2.5 s or less on a cold phone load (baseline 7.1 s). The LCP text must paint from server HTML without waiting for client JavaScript. The hero image (435 KB today, `auth-hero-column.tsx:8`) is served at responsive sizes in a modern format from F8's assets; record the mechanism in the PR.

## Mock

Login, signup and forgot password with OTP; light and dark; web 1440 and 390; iOS. Include the error states.

## Done when

- The global conditions hold.
- Tests:
  - Submit is never disabled at rest.
  - The reveal toggle works and is labelled.
  - OTP paste fills every cell.
  - The error mapping per status still passes.
  - Focus moves to the first error.
- Login LCP is recorded with the Q0 harness and meets the budget.
- Lighthouse's "modern image formats" and "properly size images" audits pass on login.
- Screenshots of every state.
