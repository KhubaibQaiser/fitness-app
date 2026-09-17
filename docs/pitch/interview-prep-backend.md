# GymOS — interview briefing + hostile backend Q&A

Handover for interview-prep coach. Grounded in the actual repo (`README`, ADRs 0001–0006, schema, API middleware). Do not invent features. Grill on mechanisms, SQL, races, and tradeoffs. If I cannot name a constraint, an isolation level, or a race, I do not know it yet.

---

# Part 1 — Repo briefing

## 1. What it is (30 seconds)

GymOS is a **coaching-first operating system for gyms**. Today it is **coach-only**: a coach onboard clients, records vitals as a time series, sets goals with safety floors, generates **DRAFT** meal plans, reviews/edits them, explicitly publishes, then runs weekly check-ins. There is **no client/member app yet**.

The product wedge is **not** “AI writes a diet.” It is: **nutrition numbers are code; language is optional; publish is always a human.** A language model may name meals and write prep notes. It must never invent kcal, macros, foods, or allergens.

Pilot economics are near $0/month (Neon Postgres, optional Vercel + Render or Oracle VM). The codebase is built as a **platform**, not a single-coach spreadsheet app, so a second gym or a future member app does not force a rewrite of auth, tenancy, or contracts.

## 2. Repo shape

**pnpm workspaces + Turborepo** application monorepo (not a published library). Node 22. TypeScript strict. Packages are `private: true`.

### Apps (deployable shells)

| App           | Role                                                                                                                    |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `apps/web`    | Next.js 16 coach PWA. Thin routes. Renders `@gymos/app`.                                                                |
| `apps/mobile` | Expo SDK 57 / Expo Router coach shell around the **same** screens. Native is packaging, not a fork.                     |
| `apps/api`    | Hono modular-monolith HTTP API (`/v1`). Composition root only: middleware, JWT, route registration.                     |
| `apps/worker` | pg-boss jobs: check-in roll, attention, food ranking, AI retention cleanup. Same domain packages, different entrypoint. |

### Packages (the real product)

| Package              | Role                                                                                                                                               |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/app`       | Shared coach screens + TanStack Query hooks. Tamagui / RN primitives. Solito for navigation. **No raw `<div>`, no raw `fetch`, no `Platform.OS`.** |
| `packages/ui`        | Tamagui design system.                                                                                                                             |
| `packages/platform`  | Web/native façades: storage, theme, safe area, PDF share, `isWeb`. Platform splits live here so feature code stays universal.                      |
| `packages/contracts` | Committed OpenAPI 3.1 + typed HTTP client. The seam between UI and API.                                                                            |
| `packages/core`      | Pure TypeScript: nutrition math, money (`bigint` minor units), units, `can(actor, action, resource)`. Zero React, zero I/O.                        |
| `packages/modules`   | Backend domains with public `index.ts` barrels: identity, tenancy, coaching, nutrition, notifications. Domain writes go here, not into `apps/api`. |
| `packages/db`        | Drizzle schema, SQL migrations, seed.                                                                                                              |
| `packages/ai`        | Layer 3 only: local llama.cpp client + template fallback + `assertDeidentified`. Never computes a number.                                          |

Lint (`eslint-plugin-boundaries`) enforces this graph. New HTTP routes go in `apps/api/src/routes/`, not `app.ts`.

**Mental model:** apps are adapters. Domain lives in `core` + `modules`. UI is written once and shipped twice.

## 3. Why it is multi-tenant

The **buyer** is a gym (or an independent coach who is effectively their own gym). Real gyms have:

- **organizations** (the tenant)
- **outlets / branches** (timezone, caseload, local config)
- **coaches** assigned to clients
- **roles** that are not a single `users.role` column — they are **memberships** scoped org-wide or to an outlet

If you build a single-coach schema, selling tenant #2 (or adding a member app, gym-admin, marketplace) means a rewrite of every query. The repo’s rule is: **multi-tenant shape from day one; the pilot only seeds one tenant.**

Coach self-signup (ADR-0006) is explicit: **“coach is the tenant.”** Signup either provisions a new org + outlet + `tenant_configs` + `COACH`/`ORG_ADMIN` memberships, or joins an existing org via `join_code`.

Per-org config (branding, locale, units, currency, AI knobs) lives in Postgres `tenant_configs`, not a process-global JSON file (ADR-0004). Never `if (tenant === 'acme')`.

### Isolation model

This is **shared-schema multi-tenancy**, **not** database-per-tenant.

1. **Primary:** application scoping. List queries filter by `orgWide` → org, else `outletIds`, else `assignedClientIds`.
2. **Schema:** `org_id` / `outlet_id` denormalized onto tenant tables.
3. **Defense in depth:** Postgres RLS via session GUCs (`app.org_wide`, `app.outlet_ids`, `app.assigned_client_ids`). **ENABLE without FORCE** today because the pilot DB role is typically table owner (bypasses RLS). FORCE + a non-owner API role is the cheap hardening follow-up.

**Why shared-schema instead of DB-per-tenant:**

- One Neon project, one migration pipeline, one connection pool — matches $0 pilot and a small ops team.
- Marketplace / self-signup creates many small orgs; spinning a database per coach is operationally absurd at that stage.
- `org_id` is an evolutionary seam if an enterprise later needs isolation.

**Tradeoff we accepted:** retrofit to true DB-per-tenant later is a migration project, not a connection-string change. Do not sell “your own database” to tenant 2 until that work exists. Architecture v4 wanted DB-per-tenant from tenant #1; alignment ADR-0003 overrode that as a commercial/ops constraint.

**Honest gaps:** RLS not FORCE; some direct-ID reads may be org-unbound for org-wide actors (IDOR risk that grows with every new route); intra-`packages/modules` table sharing still exists.

## 4. Why Drizzle (and not Prisma / raw SQL)

There is no dedicated “Drizzle vs Prisma” ADR. The choice is visible in how `@gymos/db` is used.

**What we needed:**

- Postgres-first schema in TypeScript next to the domain, with **real SQL migrations** we can read and review (RLS policies, partial unique indexes, tenant-leading indexes).
- **No query-engine binary** (Prisma’s engine is a deploy/ops cost on Neon, serverless, and a small VM).
- Queries that look like SQL (`eq`, `and`, `inArray`) so tenant filters are obvious in code review — tenancy bugs hide inside magic `include:` graphs.
- **Driver-agnostic `Db` type:** production = `postgres.js` against Neon pooled endpoints; tests = **PGlite** in-process. Repos type against `Db`, never a driver.
- First-class **bigint / numeric**, jsonb typed columns, snake_case mapping, Luxon timestamps (no `new Date()` in persistence).
- Modular-monolith friendly: schema package is separate from use-case modules.

**Tradeoffs vs Prisma:** Prisma is faster CRUD, better GUI, worse SQL transparency, extra runtime, harder custom SQL/RLS. Drizzle is closer to SQL, lighter runtime; you write more query code and own migrations more carefully.

**Tradeoffs vs raw `postgres` / Knex:** Raw SQL is maximum control, zero schema-as-code, easy to drift types. Drizzle: schema is the type source; still escape to `sql` when needed.

## 5. Rest of the stack — why chosen, what we rejected

### Monorepo: pnpm + Turborepo

One contracts layer and one screen package must ship to web + mobile + API + worker. Splitting repos would duplicate auth/tenancy. Cost: workspace discipline, boundary lint, slower mental load for newcomers.

### API: Hono + Zod + `@hono/zod-openapi` (not Next Route Handlers, not Nest, not tRPC)

- Mobile and worker need the same API; it cannot live only inside Next.
- Hono is a small composition root: middleware, JWT, health, route registration.
- Zod is already the validation language; OpenAPI 3.1 is generated from routes into `packages/contracts/openapi/openapi.v1.json`.
- Nest would add DI ceremony we do not need. tRPC would couple clients to TS and make a future non-TS consumer (or public gym API) harder. Express is untyped by default.

**Tradeoff:** some auth routes are still plain `app.post` and missing from the spec; client types are still partly hand-maintained. Drift is a real risk before a member app (P4).

### Auth: first-party JWT + rotating refresh (not Clerk / Auth0 / Supabase Auth)

ADR-0002 / 0006. Every JWT must carry real `orgId` / `outletId` / `sid`. Logout must revoke immediately via an active `sessions` row check — not “wait 15 minutes for JWT expiry.”

- Access JWT ~15m HS256 (`jose`). Refresh is opaque, hashed (SHA-256) in Postgres, rotated, reuse-detected.
- Web: HttpOnly cookies. Mobile: SecureStore + Bearer.
- Passwords: scrypt. Signup/reset: hashed, peppered email OTP. No login MFA yet.

**Rejected hosted auth** because tenant claims, session revocation, and “coach is the tenant” provisioning would fight the vendor’s user model.

**Tradeoffs:** we own session security, OTP, and rate limits. No SSO/SAML yet. HS256 is fine while we control the signing key; asymmetric keys are a later scale/security step. Redis in front of `sid` lookup is explicitly deferred — Postgres is source of truth. Login throttling is a `rate_limits` table, not Redis.

### Frontend (context only): Next 16 + Tamagui + react-native-web + Solito + Expo Router

Write screens once in `packages/app`. Data fetching: TanStack Query + contracts client. No Redux/Zustand. Silent-refresh once on 401.

### Database: Postgres 17 on Neon

Relational health data, RLS, partial unique indexes (one PUBLISHED plan per client), tenant-leading indexes. Neon serverless + pooled endpoints fit the $0 pilot.

**No Redis in the pilot stack.** Queues and rate limits use Postgres. Worker uses a **separate ephemeral queue-db** so pg-boss polling does not keep Neon compute awake.

### Jobs: pg-boss (not Bull/Redis, not Inngest)

Same operational family as the DB. Jobs: overnight check-in roll, attention, food ranking, LLM cache purge.

### Domain: `packages/core` is sacred

- Nutrition: Mifflin–St Jeor / Katch–McArdle, safety floors, seeded deterministic solver.
- Money: `{ amountMinor: bigint, currency }` — no floats, no implicit currency.
- RBAC: `can(actor, action, resource)` from server-resolved scope. UI may hide buttons; server re-checks.

### Hybrid nutrition (one paragraph)

| Layer             | Owner                          | Learns?                    | Emits numbers?       |
| ----------------- | ------------------------------ | -------------------------- | -------------------- |
| 1 Physiology      | `packages/core`                | No                         | Yes — targets        |
| 2 Solver          | `packages/core` + food catalog | Rank scores only           | Yes — foods + grams  |
| 3 Language        | `packages/ai`                  | Prompt/adapter, eval-gated | **No**               |
| 4 Personalization | Coach edits → rankings         | Yes                        | Indirect via layer 2 |

Plans stay `DRAFT` until explicit coach publish. LLM failure → `fallbackNarrative`. PII never goes to the model (`assertDeidentified`).

### Testing / CI

Vitest (unit + API integration, PGlite). `packages/core` has a 100% coverage gate. CI: gitleaks, format, lint (boundaries), typecheck, OpenAPI drift, tests, web build, Playwright login smoke, prod audit, iOS Metro export.

## 6. How to talk about it in interviews

**One sentence:** “It’s a modular-monolith, shared-schema multi-tenant coaching platform: universal RN screens on Next + Expo, a Hono API, Drizzle/Postgres with org/outlet scoping and RLS, and a nutrition engine that refuses to let an LLM invent calories.”

**Design principles to defend:**

1. Apps are shells; domain is packages.
2. Tenant isolation is a query invariant, not a later feature.
3. Config/data, never tenant-name conditionals.
4. Safety-critical numbers stay in pure functions.
5. Defer Redis, Prisma, Clerk, DB-per-tenant, and a client app until the reason is concrete.

**What is unfinished (credibility):**

- Coach-only; member app is greenfield Phase 4.
- Shared-schema, not DB-per-tenant; RLS not FORCE.
- OpenAPI/client types not fully generated.
- No billing tables yet (money types exist in core).
- MFA / invite-only vs public coach self-signup is a product tension with the original PRD.
- Cross-module table reads still happen inside `packages/modules`.

---

# Part 2 — Hostile backend Q&A

Focus: database, SQL, migrations, API, auth, OpenAPI vs tRPC, Drizzle vs Prisma vs raw SQL. Answer the mechanism first, then the tradeoff, then what is still wrong.

---

## A. Postgres as the system of record

### A1. “Why Postgres and not Mongo / Dynamo / a BaaS?”

**Answer.** The domain is relational and invariant-heavy: orgs → outlets → clients → goals / vitals / plans; memberships are the authz source of truth; one PUBLISHED plan per client; one active dietary profile; one active assignment. Those are **constraints**, not application if-statements. Postgres gives transactions, partial unique indexes, RLS, `numeric`, `jsonb` where schemaless is actually useful, and a single ops surface (Neon).

**If they press “but vitals are time-series.”** Append-only rows with `(client_id, recorded_at DESC)` is enough at pilot volume. Partitioning is explicitly deferred. Dynamo would make “one published plan” and “tenant-scoped list + join to attention + latest weight” painful.

**Tradeoff.** You operate SQL. You do not get document-store schemaless evolution. Health data volume will eventually need partitioning or a warehouse, not a different OLTP.

### A2. “Walk me through your identifier strategy. Why not `serial`? Why not UUIDv4?”

**Answer.** PKs are **UUIDv7, generated in the app** (`uuidv7` via `$defaultFn`). Comment in schema: PG17 has no native `uuidv7()`.

- **Not `serial` / `bigint identity`:** leaking sequential IDs across tenants is an enumeration gift; merging DBs later is painful; client can know the id before insert (signup, audit, jobs).
- **Not v4:** v4 is random → terrible B-tree locality, index page splits, WAL amplification as the table grows. v7 is time-ordered, so inserts append, indexes stay healthier, and you can roughly sort by id as time.
- **App-side generation:** the API can stamp ids before a multi-row transaction (plan + items + generation row) without a round-trip `RETURNING` dependency. Tests and PGlite stay consistent.

**If they press “Postgres 18 has `uuidv7()`.”** Fine — move default to the database when we upgrade; keep the same type. Do not switch to v4.

**If they press “UUIDs are 16 bytes.”** True. For a roster of hundreds, irrelevant. For billions of events, talk partitioning first.

### A3. “Timestamps. Why `timestamptz` as strings and Luxon, not `Date`?”

**Answer.** Columns are `timestamp with time zone`, Drizzle `mode: 'string'`. All clock math in `@gymos/db` goes through Luxon (`nowIso()`, `DateTime.utc()`, outlet IANA timezone for “today”). `new Date()` is banned in `packages/db` / `packages/modules`.

Why:

- JS `Date` is a UTC instant with no zone; “today in Karachi” is not `toISOString().slice(0,10)`.
- Drivers return SQL timestamps (`2026-08-06 10:46:52.235+00`), not ISO. `DateTime.fromISO` **silently fails**; we parse ISO then SQL (`parseDbTimestamp`).
- String mode avoids ORM timezone mutation bugs (Prisma historically converted timestamptz through JS Date).

**Outlet timezone lives on `outlets.timezone`.** There is no app-global timezone. Worker jobs take `TENANT_TIMEZONE` because the worker has no JWT — that is a current single-tenant shortcut, not the model.

**Trap in our own code:** idempotency middleware in `apps/api` still does `new Date(Date.now() + 24h).toISOString()`. A senior should notice the inconsistency.

### A4. “Numeric vs float vs integer. Where do you use each?”

| Kind                         | Type                                | Why                                                                                                                                                                                                |
| ---------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Money (core)                 | `bigint` minor units + ISO currency | Floats cannot represent 0.10. No default currency.                                                                                                                                                 |
| Weight / macros / height     | `numeric(p,s)` `mode: 'number'`     | Decimal precision; still becomes JS number at the boundary — interviewers will ding this. For money we refuse that. For kg to 2 decimals it is acceptable until we need exact audit of every gram. |
| HR / BP                      | `smallint`                          | Integers.                                                                                                                                                                                          |
| Scores / versions / attempts | `integer`                           |                                                                                                                                                                                                    |
| IDs                          | `uuid`                              |                                                                                                                                                                                                    |
| Flags / intake / manifest    | `jsonb`                             | Shape varies; Zod-parsed at the boundary.                                                                                                                                                          |

**Hostile follow-up:** “`numeric` + `mode: 'number'` is still IEEE float in Node.” Correct. If an interviewer wants purity, store grams as integer milligrams the same way money is minor units. We did that for money because billing law cares; we have not yet for nutrition grams.

### A5. “Soft delete. How, and what breaks?”

**Answer.** `deleted_at timestamptz` on orgs, users, clients, coaches. Uniqueness is **partial**:

```sql
UNIQUE (phone) WHERE deleted_at IS NULL   -- users_phone_active_uq
UNIQUE (client_id) WHERE unassigned_at IS NULL  -- one active coach assignment
```

Queries always add `isNull(deletedAt)`. Unique constraints must match that filter or a deleted user permanently occupies an email/phone.

**What breaks if you forget the predicate:** (1) list still shows ghosts, (2) unique violation on re-signup, (3) FKs still point at “deleted” rows — we do **not** cascade-delete health data. Soft delete is a visibility flag, not GDPR erase (`data.erase` is a separate RBAC action, not implemented as a hard delete pipeline).

---

## B. Schema design and SQL that actually matters

### B1. “Show me three partial unique indexes and why they exist.”

Speak these from memory:

1. **`meal_plans_one_published_uq` on `client_id WHERE status = 'PUBLISHED'`**
   Product invariant: one live plan. Publish supersedes the previous row in the same transaction (`UPDATE ... PUBLISHED → SUPERSEDED`, then set the new one PUBLISHED). The index is the backstop if two publishes race.

2. **`dietary_profiles_one_active_uq` on `client_id WHERE is_active = true`**
   Profiles are **versioned, never overwritten**. Put-profile deactivates the old row, inserts `version+1`. Incident review needs history.

3. **`client_goals_one_active_uq` / `check_ins_one_due_per_goal_uq` / `coach_assignments_active_client_uq`**
   Same pattern: at most one “current” row; history is other rows.

**Why not a `is_current` boolean without a partial unique?** Two writers will both see `false` and insert. The unique index is the lock.

**Why not a separate `current_plan_id` on `clients`?** That denormalizes and still needs a FK + transaction. Partial unique on the status column keeps the invariant next to the data.

### B2. “Index design. What would you look at in `EXPLAIN ANALYZE`?”

Patterns we use:

- **Tenant-leading:** `clients_outlet_idx`, `*_outlet_idx` after denormalizing `outlet_id` onto child tables (ADR-0003). List-by-outlet should not start at `client_id`.
- **Time-series:** `vitals_client_time_idx (client_id, recorded_at DESC)` — latest weight subquery and charts.
- **Inbox:** `notifications_recipient_idx (recipient_user_id, read_at, created_at DESC)`.
- **Auth hot paths:** `sessions_refresh_hash_uq` (lookup by SHA-256), `sessions_family_idx` (revoke family), `otp_challenges_active_idx` filtered `WHERE consumed_at IS NULL`.

**Hostile:** “Your `listClients` has correlated subqueries for latest weight and active goal, ordered by attention, `LIMIT 200`. That is not 200k-row ready.” Correct. At 200 clients it is fine. Next step is a denormalized latest-vitals column or a lateral join with a proper index-only scan — **not** an ORM include of all vitals.

**Denormalized `outlet_id` on check_ins, goals, notes, dietary, plan_generations:** extra write stamp, cheaper tenant filters without joining `clients` every time, and RLS policies can key off `outlet_id` on the table itself.

### B3. “JSONB: when is it a smell?”

**OK:** `tenant_configs.manifest` (Zod-validated, whole-document replace), `users.unit_prefs`, `medical_flags`, `otp.payload` (hashed password + join code during signup — never a raw OTP), `audit_log.before/after`, `client_attention.reasons`.

**Smell:** querying inside JSON as a join key. We already do `config->>'idempotencyKey'` on `plan_generations` for generate-idempotency. That should be a real column + unique `(client_id, idempotency_key)` if it becomes a hot path.

**Never:** store money or macros only in JSON. Macros live on `meal_plan_items` as columns and recompute from `per100g × grams`.

### B4. “Vitals are append-only. Prove it.”

Schema comment: rows are **never updated or deleted**. There is no `updated_at` on `vitals`. Corrections = a new row with a new `recorded_at` / `source`. That is how you keep an audit trail for health data and how EMA / check-in math stays reproducible.

**Tradeoff.** Bad entries stay forever (except a future legal erase). That is the point.

### B5. “Isolation levels. What do your transactions actually buy?”

Default Postgres is **READ COMMITTED**. Our `db.transaction` uses that unless we set otherwise (we don’t).

What we rely on:

- **Signup confirm:** one transaction creates org, outlet, tenant_config, user, memberships, coach, session. Unique on email/phone is the race loser (second confirm gets `EMAIL_TAKEN` / `PHONE_TAKEN`).
- **Publish:** supersede + publish inside one transaction so the partial unique cannot see two PUBLISHED rows.
- **Refresh rotate:** not a single SQL transaction around “revoke + insert,” but the revoke is `UPDATE ... WHERE revoked_at IS NULL RETURNING` — **compare-and-swap**. Only one racer wins. Losers hit grace.

**If they ask SERIALIZABLE / SSI.** We do not use it. SSI would abort on concurrent roster updates; we prefer explicit unique constraints + CAS updates. A senior should know: SERIALIZABLE is for “write skew” (two transactions read a predicate and both insert). Partial unique indexes are often a cheaper, clearer fix for that class of bug.

**Write skew example:** two coaches publish two drafts. Without the partial unique, READ COMMITTED allows both. With it, one gets a unique violation. That is the right tool.

### B6. “Neon + pooling. Why two URLs?”

**Answer.**

- **Pooled URL** (`createDb`, `max: 4`): API/worker. Neon’s pooler is PgBouncer.
- **Direct URL** (`createMigrationDb`, `max: 1`): migrations. DDL, advisory locks, `drizzle` migrator session state.

**Must know about PgBouncer transaction mode:**

- Session-level `SET`, temp tables, prepared statements, `LISTEN` can break.
- Our RLS design uses **session GUCs** (`app.org_wide`, …). In transaction pooling you must `SET LOCAL` **inside the transaction**, every request, not `SET` on checkout.
- We currently **do not set those GUCs at all** in TypeScript. RLS policies exist in SQL and are ENABLE **without FORCE**. Table owner bypasses RLS. So RLS is documentation until a non-owner role + FORCE + `SET LOCAL` per request.

Say that last paragraph unprompted. It is the difference between “we have RLS” and “we have theater.”

**Pool size 4:** Neon free CU. Each Node process × 4. Two API instances = 8. Do not copy `max: 20` from a blog.

---

## C. Migrations

### C1. “How do migrations work here, end to end?”

1. Schema is TypeScript in `packages/db/src/schema/*`.
2. `drizzle-kit generate` diffs schema vs `migrations/meta` snapshots → SQL files (`0007_tenant_columns_rls.sql`, …).
3. `drizzle.config.ts`: `dialect: postgresql`, `casing: 'snake_case'` (TS `outletId` → `outlet_id`).
4. Apply: `migrate.ts` uses **direct** connection, `drizzle-orm/postgres-js/migrator`, folder `packages/db/migrations`.
5. Drizzle records applied files in `__drizzle_migrations`.

**Never run generate against production.** Never apply with the pooled URL.

**Expand/contract:** `0007` added `outlet_id` nullable → backfill from `clients` → `SET NOT NULL` → FK + index. That is the safe shape for a column that must exist. Do not add `NOT NULL` with no default on a live table in one statement if rows exist.

**RLS and custom SQL:** the interesting parts of `0007` are hand-written `CREATE POLICY`. Drizzle-kit will not invent that. Treat generated SQL as a draft; review like any other PR.

**If they ask expand/contract for a rename.** Add new column, dual-write, backfill, switch reads, drop old. We have not needed a rename yet; do not pretend we have a fancy system.

**PGlite in tests / OpenAPI generate:** in-process Postgres-compatible WASM. Migrations applied in tests so schema tests hit real unique indexes (`schema.test.ts` proves two PUBLISHED plans fail). That is why we care about SQL-level invariants, not only Jest mocks.

### C2. “What belongs in a migration vs in application code?”

| In SQL                                         | In app                                            |
| ---------------------------------------------- | ------------------------------------------------- |
| Unique / check / FK / partial indexes          | Zod input validation                              |
| RLS policies                                   | `listClients` scope filters (primary today)       |
| Backfills that must be true before next deploy | One-off scripts only if they are huge and batched |
| Enums (`plan_status`)                          | Mapping enums to domain unions                    |

Application checks are for UX. Constraints are for races and bugs. If an invariant matters, it is in SQL.

---

## D. Drizzle vs Prisma vs raw SQL

### D1. “Why Drizzle?”

Concrete reasons in _this_ repo, not Twitter:

1. **Schema is TypeScript.** Same language as `packages/core`. No Prisma DSL, no generate step to import the client.
2. **SQL-shaped queries.** `eq`, `and`, `inArray`, `` sql`false` `` for empty scope. Tenant `WHERE` is reviewable. Prisma `where: { outlet: { orgId } }` hides joins.
3. **Migrations are SQL files you read.** RLS, partial uniques, `CREATE POLICY` are first-class.
4. **No query engine binary.** Prisma’s Rust engine is another runtime, another deploy artifact, historically painful on serverless / Alpine / Neon.
5. **Driver-agnostic `Db` type.** `postgres.js` in prod, PGlite in tests. Repos never import a driver.
6. **`sql` template when needed** (rate limiter upsert, latest-weight subquery) without leaving the type world entirely.

### D2. “So why not Prisma?”

Prisma wins at: rapid CRUD, admin GUIs, `include` trees, a larger hiring pool.

Prisma costs here:

- Partial unique indexes / RLS / `USING`+`WITH CHECK` were historically awkward or raw-SQL escapes.
- `Date` on timestamptz.
- Middleware tenancy (`prisma.$use`) becomes a footgun: easy to forget on a new model.
- Generated client + engine version pinning in a pnpm monorepo.
- Nested writes look atomic but you still need to understand the SQL.

If the interviewer is a Prisma shop: “I would use Prisma and still put the same unique indexes and still forbid unscoped `findMany`. The ORM is not the isolation.”

### D3. “Why not raw `postgres` / Knex / Slonik?”

Raw SQL is the most honest. Cost: every DTO is hand-mapped; rename a column in 40 files; no typed `eq(s.clients.id, id)`. Drizzle is a thin typed layer over SQL, which is the right altitude when 30% of queries are tenant filters and 5% are genuinely custom.

Knex: query builder without schema-as-types. We would reinvent Drizzle.

### D4. “N+1, relations, transactions — how does Drizzle change the conversation?”

Drizzle does not magically dataloader. `listClients` chooses explicit columns + two scalar subqueries instead of loading graphs. Plan fetch is `plan + items` in two queries keyed by `plan_id`. That is a senior habit: **measure rows returned, not ORM convenience**.

Transactions: `db.transaction(async (tx) => …)`. Helpers take `DbOrTx` so `createGoalTx` works nested. With PgBouncer, a transaction holds a client connection — keep them short. Do not call llama.cpp inside a DB transaction (generate: compute outside or after; persist in a short tx). If our generate holds a tx across Layer 3, that is a bug to admit and fix.

### D5. “Prepared statements and pooling?”

`postgres.js` uses unnamed or named statements depending on config. Transaction-mode PgBouncer + named prepared statements = classic production incident. Know the knob (`prepare: false`) if Neon transaction mode is on. I should verify which Neon pooler mode we use before claiming we are safe — **do not bluff**.

---

## E. Auth

### E1. “Draw the token model on the whiteboard.”

- **Access JWT** (~15 min, HS256, `jose`): claims `sub`, `sid`, `orgId`, `outletId`, `roles`. Used as `Authorization: Bearer` or HttpOnly `gymos_access`.
- **Refresh** (30 days, **opaque**, 32 random bytes, **SHA-256 stored**, unique on hash): HttpOnly `gymos_refresh` cookie on web; JSON/body or header on mobile.
- **Session row:** `id` = `sid` in the JWT. `family_id` ties rotations. `revoked_at`, `expires_at`.

**Every protected `/v1/*` request:** verify signature **and** `isSessionActive(sid, sub)` (row exists, user matches, not revoked, not expired). Logout is immediate. A signed JWT is not enough.

**Principal is not the JWT.** After verify, `resolvePrincipal(db, sub)` reloads memberships, assignments, coach id. Roles in the token are a hint for the client. Authz uses DB state. Stolen 14-minute JWT after role revoke still works until session revoke or expiry — unless we revoke sessions (password reset does `revokeAllSessionsForUser`).

### E2. “Why HS256 not RS256 / EdDSA?”

HS256: one secret (`JWT_ACCESS_SECRET`), no JWKS, fine for a single API. Verification is a HMAC.

**Cost:** every verifier needs the secret — you cannot hand a public key to a third party. Horizontal scale is fine (secret is env). Key rotation is “deploy new secret, everyone re-logins” unless you support `kid` + two secrets. We do not.

RS256 when: multiple services verify, or you publish a JWKS. Not now.

### E3. “Refresh rotation. What happens if two tabs refresh at once?”

`rotateSessionByToken`:

1. Lookup by hash.
2. If live: `UPDATE SET revoked_at = now WHERE id = ? AND revoked_at IS NULL RETURNING`.
3. Winner inserts a new session with the **same `familyId`**.
4. Loser of the CAS → `reuse-grace` (10s): **do not kill the family**. Concurrent retries / double-submit.
5. If the presented token was already revoked **and** older than 10s → **reuse-detected**: revoke **entire family**. That is the theft signal (stolen refresh used after the legitimate client already rotated).

**If they say “that grace window lets an attacker in.”** Yes, a 10s window after rotation. We traded UX (mobile retry, Strict-mode double mount) against killing families. Window is tunable. Refresh tokens are still hashed at rest; XSS stealing HttpOnly cookies is not the threat — XSS stealing a Bearer in memory on mobile is.

### E4. “Cookies vs Bearer. CSRF.”

Web: both cookies HttpOnly, `Secure` when HTTPS, **`SameSite=Lax` not Strict**. Comment in code: WebKit drops Strict cookies on tab restore → Safari users logged out. Mutations are additionally blocked if `sec-fetch-site` is present and not `same-origin` / `none`.

Mobile: no cookies; SecureStore; Bearer access; refresh in body/header.

**CSRF classic:** cookie-authenticated POST from `evil.com`. Lax blocks that on POST from other sites. `sec-fetch-site` is defense in depth for browsers that send it. Non-browser clients won’t send it — they use Bearer.

**Do not set `Domain=.gymos.app` unless we want subdomain sharing.** Path `/`.

### E5. “Passwords.”

`scrypt$N$r$p$saltHex$hashHex`, N=16384, r=8, p=1, 16-byte salt, 64-byte key. `timingSafeEqual` on the derived bytes. Façade so we can swap argon2id later without touching call sites.

**Why not bcrypt?** 72-byte truncation; weaker memory-hardness. **Why not argon2id today?** scrypt is in Node `crypto` — no native addon in the deploy image. Argon2id is the compliance upgrade.

**Login timing:** if the email does not exist, we still `verifyPassword` against a **dummy hash** computed at module load. Mitigates user-enumeration via scrypt timing. We still return `INVALID_CREDENTIALS` vs `NO_PASSWORD` (user exists but client-without-password) — a careful attacker might distinguish those; forgot-password does **not** (`requestPasswordReset` always looks successful).

Signup **does** return `EMAIL_TAKEN` / `PHONE_TAKEN` because coaches need a clear UX and the account is being created in public. That is an explicit product leak. Forgot-password is the sensitive one.

### E6. “OTP.”

- 6-digit `randomInt`, SHA-256(`code:pepper`), pepper from env (≥32 chars in prod).
- 10 min TTL, 5 attempts, consume on success, invalidate previous unconsumed challenges for same email+purpose on create.
- Compare with `timingSafeEqual` on the **hashes** (same length).
- Signup payload stores **already hashed password**, not plaintext, in jsonb.

**Races:** attempt increment is read-modify-write, not `UPDATE attempts = attempts+1`. Two parallel guesses could both pass the max check. For 6-digit + 5 attempts + rate limit this is low severity; a senior mentions it. Consume uses `WHERE consumed_at IS NULL`.

**Rate limits (Postgres, not Redis):** login 10/min; signup 5/15min/IP and 3/15min/email; forgot 5/15min/IP and 3/hour/email. Implementation: single-row upsert by `key`, fixed window, **fail-open** if the store errors (login outage > brute force during a DB blip). Fail-open is a choice; say it.

**Fixed vs sliding window.** Fixed is cheaper (one row, no Redis). Burst at window edge is 2× limit. Sliding / token bucket is the upgrade.

**Do not take `X-Forwarded-For` as gospel** without a trusted proxy. We use the first hop. If the API is reachable directly, clients can spoof IP buckets.

### E7. “Why not Clerk / Auth0 / Supabase Auth?”

JWT must carry **our** `orgId` / `outletId` / `sid`. Signup must insert org+outlet+memberships+coach atomically. Logout must revoke **our** session family. Hosted auth gives you their user table and a webhook. We would still own tenancy. Cost of Clerk is worth it when SSO/SAML is the product; it is deferred on the roadmap.

### E8. “RBAC. Where is the bug you would fix before tenant 2?”

`can(actor, action, resource)` + matrix (ORG_ADMIN org-wide, COACH assigned, …).

`authorize` on deny throws **404** not 403 — no existence oracle.

**Bug:** `scopeAllows('org')` returns `scope.orgWide` and **does not compare `resource.orgId`**. An org-wide actor at gym A who guesses a UUID of gym B can pass `client.read` if the handler only `authorize`s with `{ clientId }` and then `select * from clients where id = $1` with no `org_id` predicate. List endpoints **do** filter (`listClients` joins outlets and predicates `orgId`). Isolation tests cover lists, not GET-by-id. **That is the IDOR.**

Fix: every by-id load joins to outlet/org and passes `orgId`/`outletId` into `can()`, and/or FORCE RLS so the select returns zero rows.

COACH scope is `assignedClientIds` from `coach_assignments` where `unassigned_at is null`. Good.

---

## F. HTTP API (Hono, errors, idempotency)

### F1. “Why Hono, not Nest / Express / Next route handlers?”

- Next handlers would trap the API inside the web app; Expo and the worker need the same `/v1`.
- Nest: DI, modules-as-framework — we already have package modules.
- Express: untyped, callback middleware, no first-class OpenAPI.
- Hono: `fetch` API, `@hono/zod-openapi`, Node adapter, one `buildApp({ db, env })` for tests.

Composition root: `app.ts` middleware + `routes/*.ts`. Domain stays in `packages/modules`.

### F2. “Error model.”

RFC 9457 `application/problem+json`: `{ type, title, status, code, detail?, requestId }`. Handlers throw `ProblemError`; `onError` maps. 422 from Zod `defaultHook`. 401 auth, 409 idempotency conflict, 429 limiter, 404 for both missing and forbidden.

**Why 404 on forbidden?** User enumeration of client UUIDs. Tradeoff: harder client debugging (coach thinks the client was deleted). Logs still have the real reason internally — we should not leak it.

### F3. “Idempotency-Key. Implement it correctly — then tell me how ours is wrong.”

Correct Stripe-style:

- Key scoped to **principal + route**.
- Store request hash, response, status, TTL.
- Concurrent same key: second waiter gets the same response, not a duplicate side effect (`INSERT ... ON CONFLICT` first, or advisory lock).
- 4xx/5xx: usually do not store, or store only 4xx that are deterministic.

**Ours:**

- Header optional; only POST/PUT.
- Hash = `sha256(path + body)` — **not method, not user**.
- Lookup by `key` PK **globally**. Two coaches can collide; a client can replay another user’s stored body if they guess the key. Audit called this out: scope by principal.
- Check-then-act: SELECT; if miss, `next()`; then INSERT `onConflictDoNothing`. Two concurrent first-time requests **both execute** the handler (double plan generate). The plan path has a second, better key on `plan_generations.config->>'idempotencyKey'` for generate — still not a unique constraint.
- Stores JSON responses with status < 500.

**Say: the HTTP middleware is a sketch; generate-plan has a domain-level replay; neither is watertight under concurrency.**

### F4. “Health checks.”

`/health/live` — process up (orchestrator, do not kill).
`/health/ready` — `SELECT 1` (do not send traffic if DB is gone).

Do not put live and ready on the same probe. Ready should not depend on llama.cpp; AI has a fallback.

### F5. “Rate limiter SQL. Why is the upsert that shape?”

```sql
INSERT INTO rate_limits AS r (key, window_start, count)
VALUES ($key, $windowStart, 1)
ON CONFLICT (key) DO UPDATE SET
  count = CASE WHEN r.window_start = excluded.window_start THEN r.count + 1 ELSE 1 END,
  window_start = CASE WHEN r.window_start = excluded.window_start THEN r.window_start ELSE excluded.window_start END
RETURNING count
```

PK is `key` only, so one row per bucket forever. Window rollover resets count in the same row. **Atomic**, multi-instance safe, no Redis. Fail-open on error.

**Hot row:** all logins for `ip:1.2.3.4` hit one tuple — fine at our QPS; at huge QPS you shard keys or move to Redis.

---

## G. OpenAPI vs tRPC

### G1. “tRPC is faster to write. Why didn’t you?”

tRPC is **TypeScript RPC over HTTP**. End-to-end types without a spec. Great for a single Next app.

We did not:

1. **More than one consumer:** Next, Expo, curl, future gym-admin, maybe a partner. OpenAPI is the lingua franca; Swift/Kotlin/Postman fall out. tRPC adapters for RN exist but you are now in the TS monoculture.
2. **Versioned public HTTP (`/v1`).** Breaking changes are spec diffs. CI already `openapi:generate` and fails on drift of `openapi.v1.json`.
3. **Auth is HTTP-native:** cookies, `Idempotency-Key`, `problem+json`, `sec-fetch-site`, Bearer. tRPC procedures hide that until you leak context everywhere.
4. **Zod is already the validator.** `@hono/zod-openapi` turns the same schema into the document. tRPC also uses Zod — we would still not get a committed contract.
5. **Non-goals of tRPC:** stable URLs for deep links, RFC errors, CDN caching of GET, tracing with standard route names.

**Cost we pay:** response Zod is incomplete (`anyObject`), so **client DTOs are hand-written**. Codegen from today’s spec would make everything `unknown`. That is documented in `docs/specs/openapi-codegen.md`. A senior’s next move is: type the responses, then hey-api, then delete `types.ts`.

### G2. “GraphQL?”

Overkill: few clients, no BFF fan-out, authz on every field is a famous footgun. REST + resources (`/clients/:id/meal-plan`) matches the domain. Revisit if a mobile team is over-fetching — we have not measured that.

### G3. “How do you prevent spec drift?”

Generate from the running OpenAPIHono app (PGlite dummy DB, fake JWT secret) → prettier → `git diff --exit-code` in CI. Auth routes still on `app.post` are **missing from the spec**. Mention that before they find it.

---

## H. Multi-tenant SQL

### H1. “Shared schema vs schema-per-tenant vs DB-per-tenant.”

|                    | Shared schema + `org_id` | Schema-per-tenant              | DB-per-tenant       |
| ------------------ | ------------------------ | ------------------------------ | ------------------- |
| Migrations         | One                      | × N search_path hell           | × N deploy          |
| Isolation          | App + RLS                | Accidental cross-schema grants | Strongest           |
| Connection         | One pool                 | One pool, SET search_path      | Pool per DB or many |
| Marketplace signup | Insert org row           | CREATE SCHEMA                  | CREATE DATABASE     |
| Noisy neighbor     | Real                     | Real                           | Isolated            |

We chose shared schema because coach self-signup **is** “create tenant,” and the pilot is one Neon project. `org_id`/`outlet_id` are the evolutionary seam. DB-per-tenant is an enterprise checkbox, not a default.

### H2. “How does a list query isolate?”

`listClients`: if `orgWide` → `outlets.org_id = principal.orgId`; else if outlet ids → `clients.outlet_id IN (...)`; else if assignments → `id IN (...)`; else `WHERE false`. Empty scope must not become “no filter” (SQL `IN ()` is a famous bug — we use `` sql`false` ``).

### H3. “RLS policy shape.”

`USING` (read) and `WITH CHECK` (insert/update). Org-wide GUC **or** outlet id in GUC list **or** client id in assigned list. WITH CHECK does **not** allow assigned-only coaches to insert outside their outlets.

**ENABLE without FORCE + table owner = policies never run.** FORCE RLS + `GRANT` to `gymos_app` (no BYPASSRLS, no owner) + `SET LOCAL` in a transaction after bind. Until then, application filters are the real control; tests must seed a **second org** and assert empty lists.

---

## I. Jobs, queues, and why Redis is not in the diagram

pg-boss on **`QUEUE_DATABASE_URL`**, a separate Postgres, because polling Neon 24/7 wakes compute (money). Jobs: check-in roll, attention, ranking, cleanup (OTP/idempotency TTL, LLM cache 90 days).

**Why not Bull/Redis?** Another HA system. Postgres is already there. At high throughput Redis wins; we have four cron jobs.

**Worker auth:** `resolvePilotCoachPrincipal` — first coach in the DB. That does not survive true multi-tenant workers. Nightly jobs must iterate orgs or run per-tenant. Admit this.

**Never hold the OLTP transaction while waiting on a queue lock across the network.** pg-boss is the lock.

---

## J. Things a senior backend is expected to know even if the interviewer leaves GymOS

Be ready to define, not recite:

- **ACID**, especially isolation anomalies: dirty read, nonrepeatable read, phantom, write skew.
- **Indexes:** B-tree vs GIN (jsonb, arrays) vs BRIN (time append-only). Our jsonb is not GIN-indexed — we do not query it that way yet.
- **`EXPLAIN (ANALYZE, BUFFERS)`:** Seq Scan vs Index Scan vs Bitmap, rows vs actual, cache hits.
- **TOCTOU**, CAS (`UPDATE ... WHERE stale_value`), idempotency, exactly-once vs at-least-once (pg-boss is at-least-once → jobs must be idempotent).
- **Password hashing** vs **token hashing** (scrypt/argon2 vs SHA-256). Refresh tokens are high-entropy; SHA-256 is enough. OTPs are low-entropy; pepper + rate limit + TTL matter more than the hash.
- **Cookie flags:** HttpOnly, Secure, SameSite, Path, Max-Age vs Expires.
- **JWT:** `iss`/`aud`/`exp`/`nbf`/`sub`, why we check `sid` in DB, why we pin `algorithms: ['HS256']` (algorithm confusion).
- **PgBouncer session vs transaction vs statement.**
- **Expand/contract migrations**, lock timeouts, `CREATE INDEX CONCURRENTLY` (not in a txn).
- **RFC 9457**, **idempotency keys**, **rate-limit headers** (we don’t emit `Retry-After` — gap).
- **PII:** OTP pepper, no raw refresh in logs, Layer-3 de-identify. Nutrition numbers never from the model.

---

## K. Kill-shot questions — short answers

**“Is your API stateless?”**
Access JWT is stateless to _verify_, stateful to _accept_ (`sessions` row). We chose revocation over pure statelessness.

**“Where is the source of truth for roles?”**
`memberships` table, not `users.role`, not the JWT.

**“What happens if I replay a refresh token from last week?”**
Family revoke. Re-login.

**“What happens if I `GET /clients/{other_org_uuid}` as ORG_ADMIN?”**
Possibly IDOR today. Lists are safe. I would not ship tenant 2 without by-id tests + org bind + FORCE RLS.

**“Why `` sql`false` ``?”**
Empty `IN ()` must not mean unrestricted. Fail closed.

**“Why fail-open rate limit?”**
Availability of login during a limiter outage vs brute force. Compensated by scrypt cost and lockouts. Could fail-closed for `/login` only.

**“Why 15 minutes?”**
Upper bound on a stolen access token after logout if `sid` check were skipped. With `sid` check it can be longer; we keep it short anyway.

**“Money in JSON?”**
Never. `bigint` + currency. No billing tables yet — types exist so we do not invent floats later.

**“Why snake_case in DB?”**
Postgres convention, Drizzle `casing: 'snake_case'`, camelCase in TS. One mapping, no quoted identifiers.

**“Could tRPC generate OpenAPI?”**
Plugins exist; you then own two systems. We already have HTTP + Zod + a committed spec.

---

## L. How to practice

Pick 8 of these and interrupt with “show the SQL.” I should be able to write on paper:

1. Partial unique one-PUBLISHED-plan
2. Refresh CAS update
3. Rate-limit upsert
4. `listClients` WHERE fail-closed
5. Signup unique race
6. RLS ENABLE/FORCE distinction
7. Idempotency TOCTOU
8. Pooled vs direct URL

If I cannot write the SQL, I am not ready for the senior backend loop. Architecture slides will not save me.
