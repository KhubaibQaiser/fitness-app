# GymOS Coach Mobile

Expo Router (SDK 57) shell over shared `@gymos/app` screens. Native-only — coach
web remains Next.js (`apps/web`). See [ADR-0005](../../docs/adr/0005-expo-router-solito-mobile.md).

## Local DX

```bash
# Terminal 1 — API (PGlite or Neon)
pnpm --filter @gymos/api dev:pglite

# Terminal 2 — Metro
cp apps/mobile/.env.example apps/mobile/.env
# set EXPO_PUBLIC_API_URL to your API origin (LAN IP for a physical device)
pnpm --filter @gymos/mobile start
```

Login: `coach@pilot.local` / `PILOT_COACH_PASSWORD` (default `pilot-coach-change-me`).

## Bundle check

```bash
pnpm --filter @gymos/mobile export:check
```
