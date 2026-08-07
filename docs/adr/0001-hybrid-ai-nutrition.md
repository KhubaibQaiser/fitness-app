# ADR-0001: Hybrid AI nutrition (deterministic numbers + language-only LLM)

- **Status**: Accepted
- **Date**: 2026-08-07

## Context

GymOS generates meal plans for coaching clients. Letting an LLM invent calories or macros is unsafe and unauditable. Coaches still need readable meal names, prep notes, and a review workflow before anything is client-facing. We also need the system to improve from coach edits without turning the model into a medical authority.

## Decision

### Hybrid layers

1. **Layer 1** — Physiology + goal → macro targets (Mifflin–St Jeor / Katch–McArdle, safety floors). Pure code.
2. **Layer 2** — Deterministic meal solver over the food catalog. Seeded, reproducible. Default week mode is **daily_template**: solve one day, clone to days 1–7.
3. **Layer 3** — Optional local LLM (llama.cpp / Qwen) names meals and writes prep notes only. Schema-constrained; never emits nutrition numbers. Deterministic template fallback on any failure.
4. **Layer 4** — Coach feedback events → food rankings that steer Layer-2 `rankScore`. Later: eval-gated LoRA adapters for narrative style only.

### Human review (mandatory)

- Generation always creates a `DRAFT` (or leaves `NEEDS_REVIEW` when dietary profile invalidates a plan).
- Client-facing publish requires an explicit coach confirm (“I reviewed this plan”).
- Never auto-publish on generate or adjustment apply.
- Off-target day totals after coach edits require a second drift acknowledgment.

### Coach overrides

- Food swap / portion change → macros recomputed from the food DB (`per100g × grams`).
- Coach may override item macros (`macrosSource: coach_override`); audited via `ai_feedback_events`.
- Plan-level safety floors and allergen checks remain engine-owned. Overrides do not bypass allergen filters on `foodId`.

### Learning and change control

- Preference signals: EDIT, SWAP, REGENERATE, PUBLISH_UNCHANGED, ADJUSTMENT_*.
- Ranking formula is deterministic and tested; nightly `learning.ranking-refresh` upserts `food_rankings`.
- Prompt and adapter versions are versioned artifacts. Promote only after offline eval CI green and online metrics (edit_distance, fellBack) not worse than control. Rollback = flip flag / previous GGUF.

### SLOs (initial)

- p95 Layer-3 narrate latency &lt; 8s when local LLM is healthy.
- fellBack rate &lt; 5% when `AI_MODE=local` and circuit is closed.
- Generation never fails solely because the LLM failed.

### System card (intended use)

|                     |                                                                                                                                         |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **Intended use**    | Coach-facing meal naming and short prep notes for plans whose foods and portions were chosen by Layers 1–2 (or coach edit).             |
| **Not for**         | Medical diagnosis, unsupervised client chat, inventing foods outside the catalog, computing kcal/macros/targets.                        |
| **Human oversight** | Required before publish.                                                                                                                |
| **Privacy**         | De-identified Layer-3 payloads only (food names + grams). No PII to the model. Local inference preferred; no egress from LLM container. |

### Explicit non-goals

- End-client chat agent
- RAG / multi-agent meal planners that invent foods
- Free-form medical advice
- Hosted fine-tuning on PII or raw coach notes with names
- Unsupervised auto-publish
- Replacing the adaptive check-in engine with an LLM judge

### Retention

- `raw_llm_output` and `llm_cache` rows: purge after 90 days (worker job).

## Consequences

**Easier:** Auditable nutrition math; safe degradation; coach control; measurable narrative quality; preference learning without model weight updates first.

**Harder:** Two systems (solver + LLM) to operate; coach UX must surface review, swaps, and drift; ranking/LoRA pipelines need ongoing eval discipline.

**Revisit when:** Multi-coach scale demands different quota/concurrency; regulatory requirements change; or offline eval shows narrative quality plateauing without adapters.
