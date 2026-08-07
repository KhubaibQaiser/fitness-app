# Prompt canary — promote / rollback

GymOS ships a minority `promptVersion` canary so narrative changes do not go 100% until offline evals and online KPIs hold.

## Enable a canary

1. Land the new prompt module (e.g. `meal-narrative.v2.ts`) and keep `v1` as default.
2. Confirm offline suite green: `pnpm --filter @gymos/ai test` (fallback fixtures always run).
3. In the tenant manifest (`infra/tenants/<slug>.json`):

```json
"aiConfig": {
  "promptVersionCanary": "v2",
  "promptCanaryPercent": 10,
  "featureFlags": { "promptVersion": "v1" }
}
```

4. Redeploy / reload manifest. `resolveAiConfig` picks the canary for ~N% of generations.

## Watch

For 24–72h (with `AI_MODE=local` healthy):

- Offline: still green on every PR
- Online: `queryGenerationKpis` — `fellBackRate` / `guardrailFailRate` not worse than pre-canary
- Online: `queryEditDistance` / `queryEditSignals` — mean edit distance and swap/edit counts not worse than control

Thresholds: see [generation-failures runbook](../runbooks/generation-failures.md).

## Promote

Set the canary as default and stop sampling:

```json
"featureFlags": { "promptVersion": "v2" },
"promptCanaryPercent": 0
```

(or omit `promptVersionCanary` / `promptCanaryPercent`).

## Rollback

Flip `featureFlags.promptVersion` back to the prior version (e.g. `"v1"`) and set `promptCanaryPercent` to `0`. No code deploy required if both prompt modules remain in the package.

## Adapter canary

Same pattern via `featureFlags.adapterVersion` / `AI_ADAPTER_VERSION` — promote only after offline eval + online KPIs; see [lora-ops.md](./lora-ops.md).
