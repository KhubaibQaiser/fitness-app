# Runbook: plan-generation failures / allergen post-check rejection

ALLERGEN_POSTCHECK_FAILED is a safety signal — treat as SEV-1:

1. `select * from plan_generations where status in ('REJECTED','FAILED') order by created_at desc limit 20;`
2. REJECTED (allergen): the SQL hard filter and the independent post-check disagreed — diff the food's allergen_tags against the profile codes; fix the data; add a regression test before re-enabling generation for that client.
3. SOLVER_INFEASIBLE: inspect inputs in the generation row — usually an over-restricted candidate pool (budget/prep/religious filters). Coach-visible message already names the binding constraint.
4. LLM failures never fail generation (deterministic fallback) — check `validation.fellBack` rates instead.

## Layer-3 SLOs and signals

Query recent generations:

```sql
select
  count(*) filter (where (validation->>'fellBack')::boolean) * 1.0 / nullif(count(*),0) as fell_back_rate,
  count(*) filter (where (validation->>'cacheHit')::boolean) * 1.0 / nullif(count(*),0) as cache_hit_rate,
  percentile_cont(0.95) within group (order by latency_ms) as p95_latency_ms,
  count(*) filter (where validation->>'guardrail' is not null) as guardrail_fails,
  count(*) filter (where (validation->>'circuitOpen')::boolean) as circuit_open_events
from plan_generations
where created_at > now() - interval '24 hours'
  and status = 'SUCCEEDED';
```

Alert when (with `AI_MODE=local` and healthy LLM):

- `fell_back_rate` > 0.05 over 1h
- p95 `latency_ms` > 8000
- sustained `circuit_open_events` > 0
- `allergen_reject_rate` > 0 (any REJECTED in 24h is SEV-1 until explained)
- `mean_normalized_edit_distance` trending up vs last week (investigate canary / prompt)
- `adjustment_accept_rate` dropping sharply (engine/UX issue, not Layer-3)

On circuit open: check llama.cpp health (`curl -sS $AI_BASE_URL/models`), restart the `llm` container if needed; generation continues on templates until the breaker closes.

Programmatic KPI helpers in `@gymos/modules/nutrition`:

- `queryGenerationKpis` — fellBack / cacheHit / guardrailFail / allergenReject
- `queryEditSignals` — edit/swap/publish + `adjustmentAcceptRate`
- `queryEditDistance` — mean normalized meal-name distance (generation snapshot → published)
- `queryDaysCustomizedPct` — share of customized template days

## LLM concurrency (pilot)

Pilot assumes a **single API instance** and llama.cpp with `--parallel 1` (see compose / ops notes). Do not raise LLM concurrency without a queue: Layer-3 calls are already fail-closed to templates via the circuit breaker. If multi-instance API is required, serialize narrate through pg-boss before raising `--parallel`.

## Incident → eval (required before close)

Every coach-reported bad meal name or prep note becomes a fixture before the incident is closed:

1. Pull the de-identified Layer-3 input (food names + grams for the template day) from the generation row / plan items — never copy client PII.
2. Add a golden `NarrativeInput` under `packages/ai/src/evals/fixtures.ts` (or a sibling fixture file imported by the suite).
3. Assert `fallbackNarrative` + `runGuardrails` still pass for schema, numeric claims, groundedness, and shape in `packages/ai/src/evals/narrative.eval.test.ts`.
4. If the bug was model-specific (not fallback), keep the fixture and fix the prompt/adapter; promote only after offline eval is green and online `fell_back_rate` / edit signals are not worse than control.
5. Close the incident only after CI green on `@gymos/ai` tests.
