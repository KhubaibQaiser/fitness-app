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

On circuit open: check llama.cpp health (`curl -sS $AI_BASE_URL/models`), restart the `llm` container if needed; generation continues on templates until the breaker closes.
