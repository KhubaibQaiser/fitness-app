# Runbook: error-rate spike (Sentry alert)

1. Open the Sentry issue — is it one route or everything? One release?
2. Everything + started at a deploy → `/srv/gymos/deploy.sh --rollback`.
3. Database errors → check Neon status/console (compute suspended? CU quota? see neon-cu-exhausted.md).
4. Single route → reproduce locally against compose; fix forward with a test.
