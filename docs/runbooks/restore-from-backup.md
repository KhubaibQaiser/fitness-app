# Runbook: restore tenant data

Preferred: Neon instant restore (console → branch from a point in time, 6h window on free) → repoint DATABASE_URL → redeploy.
Fallback: nightly pg_dump in R2 `backups/<slug>/` → `pg_restore` into a fresh Neon database → repoint → redeploy.
Drill this quarterly; record the time-to-restore in this file.

- YYYY-MM-DD: drill result …
