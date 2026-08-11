# ADR-0005: Expo Router + Solito coach mobile shell

- Status: Accepted
- Date: 2026-08-11
- Deciders: GymOS platform

## Context

Coach features already live in `packages/app` and render on web via thin Next.js
routes under `apps/web`. A native coach app must reuse those screens — not fork
them — while still supporting SecureStore auth, safe-area chrome, and native PDF
share.

## Decision

1. **`apps/mobile` is an Expo Router (SDK 57) shell** — native-only (no Expo web
   target). Route files mirror `apps/web/app/(coach)/**` and `/enter`.
2. **Solito** continues to own cross-platform `Link` / `useRouter` / `usePathname`
   inside `@gymos/app` so the same screens navigate on web and native.
3. **Platform splits** (`.native` / default web) in `@gymos/platform` cover
   storage, theme mode, desktop breakpoint, safe-area insets, and PDF download /
   share. Signature pad uses a WebView canvas on native with the same PNG
   contract.
4. **Auth** uses the existing JWT + refresh contract (`configureApiClient` with
   `clientPlatform: 'mobile'`, SecureStore for tokens). Shell chrome is flex +
   safe-area — no `100vh` / `position: fixed`.

## Consequences

- `EXPO_PUBLIC_API_URL` must be set for any device/simulator build.
- EAS `projectId` / update URL placeholders must be replaced before preview
  deploy (Phase 3).
- Expo web is explicitly out of scope; coach web remains Next.js.
