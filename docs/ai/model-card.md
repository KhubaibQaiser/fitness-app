# Model card — Qwen3 (Layer-3 narratives) + optional LoRA

|                          |                                                                                                                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Base model**           | Qwen3 instruct (GGUF via llama.cpp; pin exact tag in `AI_MODEL`)                                                                                                                                                          |
| **Optional adapter**     | LoRA / GGUF adapter selected by `adapterVersion` (`AI_ADAPTER_VERSION` or tenant `aiConfig.featureFlags.adapterVersion`)                                                                                                  |
| **Intended use**         | Coach-facing meal names and short prep notes for foods/portions chosen by Layers 1–2 (or coach edit). Adaptive check-in copy via `narrateAdjustment` (templates / future adapter).                                        |
| **Out of scope**         | Computing kcal/macros/targets; medical advice; unsupervised client chat; inventing foods outside the catalog; auto-publish.                                                                                               |
| **Human oversight**      | Required. Plans stay DRAFT until coach review + publish.                                                                                                                                                                  |
| **Training data (LoRA)** | De-identified gold JSONL from published day-1 meal names (`apps/api/src/cli/export-gold-narratives.ts`). Rows are `{ input, labels }`. No client PII, emails, phones, or UUIDs. Ops: [lora-ops.md](./lora-ops.md).        |
| **Eval gate**            | Offline suite in `packages/ai/src/evals/` (schema, numeric claims, groundedness, shape). Live behind `AI_EVAL_LIVE=1`. Promote only when CI green and online `fell_back_rate` / edit distance are not worse than control. |
| **Canary / rollback**    | Tenant `promptVersionCanary` + `promptCanaryPercent`; adapter via `featureFlags.adapterVersion`. See [prompt-canary.md](./prompt-canary.md) and [lora-ops.md](./lora-ops.md).                                             |
| **Privacy**              | Layer-3 payloads are food names + grams only; `assertDeidentified` at the boundary. Raw LLM output and `llm_cache` purged after 90 days.                                                                                  |
| **Known limits**         | Fallback templates if the local model is down or guardrails fail. Groundedness tracks a fixed food lexicon — rare inventiveness outside that list may not fail closed.                                                    |

Update this card when promoting a new adapter: record dataset export date/hash, offline eval scores, and the promoted `adapterVersion`.
