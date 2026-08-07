# LoRA / adapter ops (offline train → canary → promote)

Layer-3 adapters improve **meal names and prep style only**. Macros and targets stay in Layers 1–2 (+ coach overrides). Never train on PII.

## 1. Export gold

From a machine with `DATABASE_URL` to the pilot DB:

```bash
DATABASE_URL=… GOLD_LOCALE=en GOLD_CUISINE=pakistani \
  pnpm --filter @gymos/api exec tsx src/cli/export-gold-narratives.ts ./gold-narratives.jsonl
```

Each JSONL row is:

```json
{
  "input": { "locale": "en", "cuisineContext": "pakistani", "verbosity": "standard", "days": […] },
  "labels": { "meals": [{ "name": "…", "prepNotes": "…" }] }
}
```

`input` is catalog foods + grams (solver/coach portions). `labels` are coach-final day-1 names/notes after publish. Hash the file (`shasum -a 256`) and record it on the [model card](./model-card.md).

## 2. Train (offline)

Train a LoRA (or merge to GGUF) on the gold set outside the API process. Keep base = pinned `AI_MODEL`. Do not upload client-identifying notes — the export already asserts de-ID.

Suggested smoke: regenerate a handful of gold inputs with the adapter and run `pnpm --filter @gymos/ai test` plus optional `AI_EVAL_LIVE=1`.

## 3. Serve

Drop the adapter where llama.cpp can load it; set:

- Env: `AI_ADAPTER_VERSION=<id>`
- Or tenant: `aiConfig.featureFlags.adapterVersion`

Narrate sends the adapter id on the OpenAI-compatible request; generations store `adapter_version`.

## 4. Canary vs edit distance

1. Ship adapter behind a minority of traffic (tenant flag or temporary env on one instance).
2. Compare `queryEditDistance` / `queryEditSignals` / `fellBackRate` to control for 24–72h.
3. Offline suite must stay green.

## 5. Promote / rollback

- **Promote:** set `featureFlags.adapterVersion` (or default env) to the new id; update [model card](./model-card.md) with dataset hash + eval notes.
- **Rollback:** flip `adapterVersion` to the previous id (or clear it to base-only). No DB migration.

See also [prompt-canary.md](./prompt-canary.md) for promptVersion canaries (same promote discipline).
