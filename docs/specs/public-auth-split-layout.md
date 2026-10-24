# Public auth split layout

## Invariant

`/login`, `/signup`, and `/forgot-password` stay public and keep their URLs. On viewports at least 768px wide, a flat gym illustration fills the left column and the auth screen sits in the right column. Below that width the illustration is hidden. Navigating between these routes does not remount the illustration. The right column slides in only after a route change, and only when reduced motion is off. The first screen does not slide. There is no exit slide.

## Why a route group

Tradeblock's public auth is an in-memory tab stack inside a modal (`OnboardingWrapperPage`), not middleware. GymOS already gates these paths in `apps/web/proxy.ts` (session cookie present or not). The split view is `apps/web/app/(public)/layout.tsx`, which stays mounted while sibling routes swap `children`. Middleware is the wrong layer: it cannot keep a column mounted across navigations.

## Acceptance

- Given a viewport at least 768px wide, When `/login` renders, Then the gym illustration is visible and the sign-in form is in the other column.
- Given a viewport narrower than 768px, When `/login` renders, Then the illustration is hidden and the sign-in form still renders.
- Given `/login` on a wide viewport, When the coach follows "Create coach account", Then the illustration element stays connected and the signup form renders.
- Given reduced motion, When the right column mounts, Then it does not use the enter slide.

## Proven by

- `apps/web/e2e/login.smoke.spec.ts`
- `packages/app/src/features/auth/auth-split-layout.tsx` (reduced-motion branch; enter-only `enterStyle`)
