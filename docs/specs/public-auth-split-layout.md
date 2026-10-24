# Public auth split layout

## Invariant

`/login`, `/signup`, and `/forgot-password` stay public and keep their URLs. On viewports at least 768px wide, a flat gym illustration fills the left column and the auth screen sits in the right column. Below that width the illustration is hidden. Navigating between these routes does not remount the illustration. After the first screen, the right column slides the old form out and the new form in. Forward navigation enters from the right; going back enters from the left. Reduced motion shortens that to a cut.

## Why a route group

Tradeblock's public auth is an in-memory tab stack inside a modal (`OnboardingWrapperPage`), not middleware. GymOS already gates these paths in `apps/web/proxy.ts` (session cookie present or not). The split view is `apps/web/app/(public)/layout.tsx`, which stays mounted while sibling routes swap `children`. Middleware is the wrong layer: it cannot keep a column mounted across navigations.

## Acceptance

- Given a viewport at least 768px wide, When `/login` renders, Then the gym illustration is visible and the sign-in form is in the other column.
- Given a viewport narrower than 768px, When `/login` renders, Then the illustration is hidden and the sign-in form still renders.
- Given `/login` on a wide viewport, When the coach follows "Create coach account", Then the illustration element stays connected and the signup form renders.
- Given `/login`, When the coach opens signup, Then the sign-in form slides out to the left while the signup form slides in from the right.
- Given any public auth route, When the coach toggles the theme control, Then the document theme flips and stays flipped after moving to another public route. The control uses the same cookie as Settings.

## Proven by

- `apps/web/e2e/login.smoke.spec.ts`
- `packages/app/src/features/auth/auth-split-layout.tsx` (reduced-motion branch; enter-only `enterStyle`)
