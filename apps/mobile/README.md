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

## Tests

```bash
pnpm --filter @gymos/mobile test          # Jest + RNTL
pnpm --filter @gymos/mobile maestro:login # requires device/emulator + Maestro CLI
```

## CI / EAS

- `ci.yml` runs `expo export` as a Metro bundle gate
- Label a PR `mobile-preview` to trigger EAS Update + Android preview build
- Set `PILOT_MOBILE_DEPLOY_ENABLED=true` (repo variable) to enable production OTA/build on `main`
- Replace placeholder EAS `projectId` in `app.json` and add `EXPO_TOKEN` to GitHub Environments
