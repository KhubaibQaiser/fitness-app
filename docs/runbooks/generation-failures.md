# Runbook: plan-generation failures / allergen post-check rejection

ALLERGEN_POSTCHECK_FAILED is a safety signal — treat as SEV-1:

1. `select * from plan_generations where status in ('REJECTED','FAILED') order by created_at desc limit 20;`
2. REJECTED (allergen): the SQL hard filter and the independent post-check disagreed — diff the food's allergen_tags against the profile codes; fix the data; add a regression test before re-enabling generation for that client.
3. SOLVER_INFEASIBLE: inspect inputs in the generation row — usually an over-restricted candidate pool (budget/prep/religious filters). Coach-visible message already names the binding constraint.
4. LLM failures never fail generation (deterministic fallback) — check `validation.fellBack` rates instead.
