# GymOS — technical investor brief

- **Status**: Living pitch doc (aligned with [platform roadmap](../roadmap.md))
- **Date**: 2026-08-12
- **Audience**: Technical investors and architecture-literate partners
- **Product posture**: Coaching-first gym platform. **Shipped:** Phase 0 pilot coaching loop + Phase 1 backend hardening (JWT sessions, tenant scoping/RLS, config registry). **In progress:** coach mobile (Phase 2–3). **Next:** self-signup + coach marketplace (Phase 4), then gym/org-admin (Phase 5). Same backend contracts for every surface.

Canonical product one-liner (also in root `README.md`):

> Coaching-first gym platform. Pilot: coach records vitals, generates draft meal plans (deterministic nutrition + optional local LLM for names/notes only), reviews before publish, runs weekly check-ins with adaptive adjustments — at near-$0 infrastructure cost.

---

## 90-second spoken script

GymOS is a coaching-first operating system for gyms. We are not building another chatbot that invents macros.

Nutrition is trust-sensitive. So we split the stack: physiology and a deterministic meal solver own calories, portions, allergens, and safety floors. An optional local language model only names meals and writes prep notes, under schema constraints and guardrails. If the model fails, templates take over — generation never dies because the LLM hiccuped. Every plan stays draft until a coach explicitly publishes.

Weekly progress uses the same philosophy: EMA weight trends, adherence gating, and vitals red flags are pure code. The model may narrate a recommendation; it never computes it.

That is the wedge we ship today on web, and the same screens are landing on Expo coach mobile — packaging, not a rewrite.

Underneath, Phase 1 already hardened the multi-tenant backend: JWT access + rotating refresh, per-request principals, org/outlet scoping with RLS backstop, and a per-org config registry. Role matrix, integer money, and audit trails are in core. Next product bets are self-signup / coach marketplace, then gym admin — all on one contracts layer.

Unit economics favor us: hard math scales on CPU; LLM spend stays on language, with cache, circuit breakers, canaries, and eval gates before we promote prompts or LoRA adapters. Coach edits feed ranking and later gold narrative data — a learning loop that increases coach capacity without training a medical oracle.

Ask: scale the coaching wedge with real coaches on web + mobile, then open marketplace acquisition. Safety and auditability are the go-to-market, not a slide afterthought.

---

## Problem

### Who hurts today

Independent and boutique coaches (and gyms that employ them) spend disproportionate time on:

1. **Meal plan assembly** — spreadsheet macros, copy-paste weeks, allergen mistakes, cuisine/budget/prep constraints.
2. **Weekly adjustments** — noisy weight data, unclear whether to change calories or fix adherence, weak audit trail of “why we changed the plan.”
3. **Tool sprawl** — WhatsApp + Google Sheets + generic calorie apps. Nothing is multi-outlet ready, white-labelable, or AI-safe.

### Why generic “AI meal planners” fail this buyer

| Failure mode                     | Investor implication                |
| -------------------------------- | ----------------------------------- |
| LLM invents kcal/macros/foods    | Liability, coach distrust, no audit |
| Auto-publish to client           | Regulatory and brand risk           |
| Hosted PII to third-party models | Privacy / regional data concerns    |
| No coach override path           | Does not fit real workflows         |
| No org/outlet/RBAC bones         | Dead end when selling to gyms       |

**Job to be done:** give coaches a system that drafts faster than spreadsheets, stays scientifically and operationally accountable, and can grow into the gym’s operating layer — not a disposable AI demo.

---

## Solution and wedge

### What ships today (Phase 0–1)

- Client onboarding (identity, goals, dietary constraints, consent/signature path)
- Vitals capture
- Hybrid meal plan generation → coach review / swap / portion edit → publish
- Weekly check-ins → deterministic adaptive recommendation → coach apply
- Coach web PWA with email/password JWT auth (access + rotating refresh; ADR-0002)
- Tenant isolation: app scoping + Postgres RLS; per-org config registry (ADR-0003 / 0004)

### What is in progress vs next (label clearly in rooms)

| State             | Scope                                                                                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **In progress**   | Coach Expo app (ADR-0005) + mobile CI/EAS/Maestro (Phases 2–3)                                                                                               |
| **Built in core** | Orgs → outlets; full RBAC matrix; integer money; audit log; shared `@gymos/app` screens                                                                      |
| **Roadmap**       | Phase 4 self-signup + coach marketplace (“coach is the tenant”); Phase 5 gym/org-admin; Phase 6 multi-region; queued narrate for multi-coach LLM concurrency |

Authoritative sequencing: [docs/roadmap.md](../roadmap.md).

---

## Why this is investable (technical thesis)

### 1. Hybrid AI is the product architecture, not a feature flag

See [ADR-0001](../adr/0001-hybrid-ai-nutrition.md) and [model card](../ai/model-card.md).

```
Layer 1  Physiology + goals → macro targets (code)
Layer 2  Deterministic meal solver over food catalog (seeded, reproducible)
Layer 3  Optional LLM: meal names + prep notes only (schema + guardrails)
Layer 4  Coach feedback → food rankings; later eval-gated LoRA for style only
         Adaptive check-ins: deterministic engine; LLM narrates, never judges
```

**Tradeoff we accept:** operate solver + LLM. **Why:** auditable nutrition, safe degradation, measurable narrative quality, preference learning without turning weights into a medical authority.

**Explicit non-goals (credibility with technical buyers):** unsupervised client chat agents; RAG meal planners that invent foods; free-form medical advice; auto-publish; replacing the adaptive engine with an LLM judge.

### 2. Failure modes are designed, not discovered in production

- Generation never fails solely because Layer 3 failed (`fellBack` path + circuit breaker).
- Allergen SQL hard filter + independent post-check; disagreement is SEV-1 ([runbook](../runbooks/generation-failures.md)).
- De-identified Layer-3 payloads (`assertDeidentified`); raw LLM output / cache purged (90-day retention job).
- Prompt canary + adapter version flags; promote only after offline eval CI and online KPIs do not regress.
- LLM container intended with no egress when on the VM path.

### 3. Coach time → learning moat

Feedback events (edit, swap, regenerate, publish unchanged, adjustment apply) drive deterministic `food_rankings` (nightly worker when enabled). Later: gold JSONL from published day-1 names for LoRA — de-identified, eval-gated ([lora-ops](../ai/lora-ops.md)).

Moat story for investors: **every coach session improves ranking and narrative fit for that cuisine/tenant**, while macros stay engine-owned. Switching cost is workflow + data flywheel, not a prettier chat UI.

### 4. Unit economics and scale path are explicit

| Concern            | Pilot                                                                                           | Scale path                                                                                       |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Infra              | $0 path: Oracle Always Free + Neon + R2, or PaaS strip (Vercel + Render + Neon, worker/LLM off) | Same modular apps; paid tiers when SLO requires                                                  |
| Nutrition math     | Pure CPU                                                                                        | Horizontal API/worker; solver cost predictable                                                   |
| Narration          | Single API + llama.cpp `--parallel 1`, or `AI_MODE=fallback`                                    | Serialize via pg-boss before raising concurrency; hosted OpenAI-compatible mode exists as config |
| Tenancy            | Shared schema + RLS + org config registry (shipped)                                             | More orgs via marketplace signup; multi-region later                                             |
| Health data volume | Pilot volume                                                                                    | Partitioning deferred consciously (schema notes)                                                 |

Technical investors should hear: we know where free tiers break (Neon CU, LLM concurrency, multi-instance narrate) and have written the remediation path instead of hand-waving “scale later.”

### 5. One product surface across devices

Monorepo (Turborepo + pnpm): `packages/app` screens → Next web PWA and Expo Router coach app (`.native` / `.web` platform splits). Mobile CI must keep the Metro bundle green. Native is packaging of the same coaching UX, not a second product — preserves CAC on phone-first coaches and protects burn toward store release.

---

## Architecture snapshot (for deep technical diligence)

```
┌─────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│ apps/web    │────▶│ apps/api (Hono)      │────▶│ Neon Postgres 17    │
│ Next PWA    │     │ JWT + RLS + modules  │     │ shared-schema+RLS   │
└─────────────┘     └──────────┬───────────┘     └─────────────────────┘
┌─────────────┐              │
│ apps/mobile │──────────────┘
│ Expo Router │              ▼
└─────────────┘      apps/worker (pg-boss) ──▶ ranking refresh, AI retention
       ▲             packages/ai ──▶ local llama.cpp / fallback / hosted
packages/app         packages/modules (nutrition, coaching, identity, tenancy, …)
packages/{ui,platform,contracts,core,db}
```

**Separation of concerns technical buyers care about:**

- `@gymos/core` — pure domain (nutrition, money, RBAC, units); testable without I/O
- `@gymos/ai` — narration, guardrails, evals, cache interface
- `@gymos/modules` — use-cases against DB (plans, check-ins, sessions, KPIs)
- Apps are thin adapters (HTTP, queue, web/mobile shells) on one contracts client

Security posture: no secrets in repo; gitleaks in hooks/CI; HTTPS; Bearer JWT on `/v1/*` with refresh rotation; RLS as defense-in-depth.

---

## Competitive frame (honest)

| Pattern                               | GymOS stance                                           |
| ------------------------------------- | ------------------------------------------------------ |
| Calorie trackers (MyFitnessPal-class) | Client logging tools; weak coach OS and gym tenancy    |
| Generic GPT wrappers                  | Fast demos; weak audit, weak allergens, weak org model |
| Legacy gym management (billing/class) | Strong ops, weak adaptive nutrition intelligence       |
| Spreadsheet + WhatsApp                | Status quo we displace with workflow + audit           |

We do not claim we already out-feature mature gym MGMs on scheduling/POS. We claim the **highest-trust AI coaching wedge on platform rails that can grow into MGM**, which is a cleaner diligence story than “AI gym that does everything.”

---

## Risks and mitigations (say these out loud)

| Risk                                | Mitigation                                                                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
| LLM narrative quality plateau       | Offline evals + canary; LoRA on de-identified gold; templates always available                           |
| Coach does not trust AI             | Human publish gate; macros recomputed from DB; drift ack on off-target edits                             |
| Multi-coach LLM stampede            | Documented: queue narrate before raising `--parallel`; fallback mode                                     |
| Free-tier infra limits              | Runbooks (Neon CU, disk, certs); PaaS vs VM dual path                                                    |
| Regulatory / medical perception     | Model card intended-use boundaries; no diagnosis; red-flag vitals escalate to coach                      |
| Scope creep into full MGM too early | Pilot KPI = coach time-to-publish + retention on check-ins; platform bones without building every module |

---

## Traction narrative (fill with live numbers)

Use this section in the room; keep metrics factual.

- Pilot hostname / environment: see go-live docs
- Coach count / client count / plans published / check-ins completed: _update before each pitch_
- Generation KPIs: `fellBackRate`, cache hit, allergen reject (target: allergen reject explained; fellBack &lt; 5% when local AI healthy — ADR SLOs)
- Infra burn: pilot designed for ~$0/mo until paid SLO needed

---

## Slide outline (10–12 slides)

1. **Title** — GymOS: coaching-first gym OS; hybrid AI, coach authority
2. **Problem** — coach time, tool sprawl, unsafe AI meal planners
3. **Wedge** — draft → review → publish → adaptive check-in (demo screenshot later)
4. **Architecture** — Layers 1–4 diagram + fail-closed narrate
5. **Why not end-to-end LLM** — liability, audit, unit economics
6. **Platform** — JWT + RLS + registry shipped; mobile in flight; marketplace next
7. **Learning loop** — feedback → rankings → eval-gated adapters
8. **Scale & cost** — CPU for science, tokens for language; queue path
9. **Go-to-market** — pilot coaches → self-signup marketplace → gym/org-admin
10. **Risks** — table above (builds trust with technical investors)
11. **Ask** — capital / intro / design partners; milestones next 2 quarters
12. **Appendix** — roadmap, ADRs, model card, runbooks links

Optional deep-dive appendix slides: guardrail suite, allergen dual-check, tenant AI canary, money type, RBAC matrix.

---

## Suggested ask and near-term milestones

**Ask (adapt per room):** design-partner coaches and/or seed to finish mobile store readiness, fund multi-coach LLM concurrency (queued narrate + paid compute when free tiers cap), and build Phase 4 self-signup / marketplace acquisition.

**Near-term milestones (aligned with roadmap):**

1. Proven coaching loop KPIs: publish rate, edit distance, check-in completion
2. Coach mobile parity + installable EAS previews (Phases 2–3 exit)
3. Phase 4: coach/client self-signup + public coach directory (“coach is the tenant”)
4. Queued narrate + generation KPI dashboards under multi-coach load
5. Phase 5 gym/org-admin once marketplace retention is real

---

## Appendix — diligence links

| Topic                         | Doc                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Platform roadmap (phases)     | [docs/roadmap.md](../roadmap.md)                                                                 |
| Hybrid AI decision            | [docs/adr/0001-hybrid-ai-nutrition.md](../adr/0001-hybrid-ai-nutrition.md)                       |
| JWT / refresh sessions        | [docs/adr/0002-jwt-refresh-sessions.md](../adr/0002-jwt-refresh-sessions.md)                     |
| Tenant isolation + RLS        | [docs/adr/0003-shared-schema-tenant-isolation.md](../adr/0003-shared-schema-tenant-isolation.md) |
| Tenant config registry        | [docs/adr/0004-tenant-config-registry.md](../adr/0004-tenant-config-registry.md)                 |
| Expo coach mobile             | [docs/adr/0005-expo-router-solito-mobile.md](../adr/0005-expo-router-solito-mobile.md)           |
| Model card / privacy / eval   | [docs/ai/model-card.md](../ai/model-card.md)                                                     |
| Prompt canary                 | [docs/ai/prompt-canary.md](../ai/prompt-canary.md)                                               |
| LoRA ops                      | [docs/ai/lora-ops.md](../ai/lora-ops.md)                                                         |
| Generation / allergen runbook | [docs/runbooks/generation-failures.md](../runbooks/generation-failures.md)                       |
| Pilot $0 VM path              | [docs/pilot-go-live.md](../pilot-go-live.md)                                                     |
| Pilot PaaS strip              | [docs/pilot-go-live-paas.md](../pilot-go-live-paas.md)                                           |
| Product/security overview     | [README.md](../../README.md)                                                                     |

When claims change in code, update this brief in the same PR so the pitch cannot drift from reality.
