# Graph Report - fitness-app  (2026-09-09)

## Corpus Check
- 566 files · ~251,980 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 3082 nodes · 6842 edges · 198 communities (150 shown, 19 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `dfd88357`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- narrate.ts
- goal-form/index.tsx
- ui/src/index.ts
- client-detail/index.tsx
- worker/src/index.ts
- useFocusChain
- GymOS
- detail.tsx
- layer1.ts
- Muted
- app.ts
- home/index.tsx
- api/index.ts
- db/src/index.ts
- 0000_pilot_schema.sql
- solver.ts
- signup-coach.ts
- tenancy/manifest.ts
- nutrition/plans.ts
- api/package.json
- mobile/package.json
- schemas.ts
- dependencies
- step-sign.tsx
- ui/package.json
- client-onboarding/index.tsx
- tools-tdee.tsx
- db/package.json
- contracts/src/index.ts
- form-field.tsx
- pace-slider.tsx
- modules/package.json
- weight-chart.tsx
- worker/package.json
- platform/package.json
- tamagui.config.ts
- client-journey-node.tsx
- exports
- routes/clients.ts
- expo
- app-shell.tsx
- app/package.json
- dev-pglite.ts
- app/layout.tsx
- money.ts
- client-weight-journey-chart.tsx
- icons.ts
- contracts/src/types.ts
- adaptive.ts
- convert.ts
- enums.ts
- client-hub-header.tsx
- web/package.json
- client-journey.ts
- variables.tf
- can.ts
- prefetch-coach.ts
- dependencies
- journey-chart-model.ts
- plan-ops.ts
- pace-control.ts
- tenancy.ts
- goal-preview.ts
- goals-panel.tsx
- roster-row.tsx
- nutrition.ts
- compilerOptions
- dependencies
- Technical Investor Brief
- package.json
- devDependencies
- ai/package.json
- contracts/src/client.ts
- mobile/tsconfig.json
- GymOS Platform Roadmap
- contracts/package.json
- core/package.json
- tasks
- session-presence.ts
- scripts
- date-field.tsx
- ops.ts
- diet-plan-pdf.ts
- compilerOptions
- ADR-0015 Meal AI Planner Portion Realism
- restrictions.ts
- nutrition/coach-instructions.ts
- gate-guard.tsx
- renovate.json
- GymOS Coding Agent Contract
- markdown-preview.tsx
- ranking-refresh.ts
- mail.ts
- devDependencies
- scripts
- mobile-providers.tsx
- API Service
- /health/live
- Hybrid AI Nutrition System
- Caddy TLS Reverse Proxy
- seed-data/foods.ts
- gradient-ring.tsx
- metro.config.js
- scripts
- Deterministic Code Owns Anything That Must Be True
- OTP_PEPPER
- signature-pad.native.tsx
- app/tsconfig.json
- platform/tsconfig.json
- gymos-sheet.tsx
- ui/tsconfig.json
- devDependencies
- eval-agent-diff.sh Scorer
- Four Fail-Closed Guardrails
- Generation Always Creates DRAFT
- contracts/tsconfig.json
- theme-mode-provider.native.tsx
- weave-line.tsx
- proxy.ts
- dependencies
- Layer 3 Language Model
- eslint.config.mjs
- form-keyboard-root.tsx
- api/tsconfig.json
- next.config.mjs
- worker/tsconfig.json
- gymos-openapi
- ADR-0006 Coach Self-Signup + Email OTP
- pnpm Workspace
- ai/tsconfig.json
- journey-adherence-score.tsx
- core/tsconfig.json
- "coach_meal_instructions"
- db/tsconfig.json
- modules/tsconfig.json
- platform/src/index.ts
- storage.native.ts
- tsconfig.json
- env.d.ts
- next
- @playwright/test
- useFocusChain Named Order
- gymos-openapi MCP Server
- providers.tf
- .terraform.lock.hcl
- deploy.sh
- devDependencies
- peerDependenciesMeta
- scripts
- "sessions"
- "tenant_configs"
- eval-agent-diff.sh
- next-env.d.ts
- Prompt Canary
- Alert Must Have a Runbook
- engines
- 0009_coach_signup_otp.sql
- is-web.native.ts
- "vitals"
- macros-panel.tsx
- Hybrid AI Nutrition
- Local Development Stack
- client-hub-overview.tsx
- credentials-pdf.ts
- devDependencies
- scripts
- step-height.tsx
- archify-deliver.mjs
- Phase 3 Coach Feature Alignment

## God Nodes (most connected - your core abstractions)
1. `Muted` - 74 edges
2. `Card` - 54 edges
3. `Body` - 46 edges
4. `useFocusChain()` - 41 edges
5. `Db` - 40 edges
6. `schema` - 39 edges
7. `ok` - 37 edges
8. `nowIso()` - 36 edges
9. `buildApp()` - 34 edges
10. `err` - 30 edges

## Surprising Connections (you probably didn't know these)
- `AI_MODE=fallback` --conceptually_related_to--> `fallbackNarrative Templates`  [INFERRED]
  infra/paas/render.yaml → docs/interview-prep.pdf
- `Playwright Login Smoke` --semantically_similar_to--> `Maestro Login Flow`  [INFERRED] [semantically similar]
  .github/workflows/ci.yml → apps/mobile/maestro/login.yaml
- `Probes Must Hit /health/live Only` --semantically_similar_to--> `Ephemeral queue-db`  [INFERRED] [semantically similar]
  docs/runbooks/neon-cu-exhausted.md → infra/vm/compose.prod.yml
- `Incident to Eval Gate` --semantically_similar_to--> `Deterministic Code Owns Anything That Must Be True`  [INFERRED] [semantically similar]
  docs/runbooks/generation-failures.md → docs/interview-prep.pdf
- `Allergen Dual-Check` --semantically_similar_to--> `Four Fail-Closed Guardrails`  [INFERRED] [semantically similar]
  docs/specs/fr-c7-dietary-profile.md → docs/interview-prep.pdf

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Allergen Dual-Check Safety Path** — docs_specs_fr_c7_dietary_profile_dual_check, docs_specs_fr_c7_dietary_profile_assertnorestrictedfoods, docs_runbooks_generation_failures_allergen_postcheck_failed, docs_interview_prep_layer2_solver [EXTRACTED 1.00]
- **CI Merge Gates** — _github_workflows_ci_ci, _github_workflows_ci_secrets, _github_workflows_ci_quality, _github_workflows_ci_mobile_bundle, agents_merge_gates, readme_gymos [EXTRACTED 1.00]
- **Portion Realism Solver Path** — docs_adr_0015_meal_ai_planner_portion_realism_and_coach_overrides_d1_portion_realism, docs_adr_0015_meal_ai_planner_portion_realism_and_coach_overrides_solve_meal, docs_adr_0015_meal_ai_planner_portion_realism_and_coach_overrides_max_units [EXTRACTED 1.00]
- **Named Pace Calorie Safety Policy** — docs_adr_0008_pace_clamp_then_derive_clamp_then_derive, docs_adr_0008_pace_clamp_then_derive_named_pace, docs_adr_0014_coach_calorie_override_warn_dont_block [EXTRACTED 1.00]
- **Layer-3 Canary Promote Rollback Loop** — docs_ai_model_card_model_card, docs_ai_lora_ops_lora_ops, docs_ai_prompt_canary_prompt_canary [EXTRACTED 1.00]
- **Hybrid Nutrition Safety Stack** — docs_adr_0001_hybrid_ai_nutrition_hybrid_ai_nutrition, docs_adr_0001_hybrid_ai_nutrition_layer_1, docs_adr_0001_hybrid_ai_nutrition_layer_2, docs_adr_0001_hybrid_ai_nutrition_layer_3, docs_adr_0001_hybrid_ai_nutrition_mandatory_human_review, _github_pull_request_template_nutrition_ai_safety, claude_hybrid_four_layer_nutrition [EXTRACTED 1.00]
- **Hybrid Nutrition Fail-Closed Loop** — docs_interview_prep_hybrid_ai_nutrition, docs_interview_prep_four_guardrails, docs_interview_prep_fallback_narrative, docs_specs_fr_c6_plan_publish_draft_until_publish, docs_runbooks_generation_failures_circuit_breaker [INFERRED 0.85]
- **Coach OTP Production Secrets** — docs_runbooks_email_otp_otp_pepper, docs_specs_fr_c1_coach_signup_otp_frc1, infra_vm_compose_prod_api, infra_paas_render_gymos_api [INFERRED 0.85]
- **Shared-Schema Tenant Isolation** — docs_adr_0003_shared_schema_tenant_isolation_shared_schema_isolation, docs_adr_0003_shared_schema_tenant_isolation_postgres_rls, docs_adr_0004_tenant_config_registry_tenant_config_registry, claude_never_fork_per_customer [INFERRED 0.85]

## Communities (198 total, 19 thin omitted)

### Community 0 - "narrate.ts"
Cohesion: 0.06
Nodes (60): { db, close }, GoldRow, input, hashNarrativeInput(), LlmCacheStore, CIRCUIT, CircuitState, DEFAULT (+52 more)

### Community 1 - "goal-form/index.tsx"
Cohesion: 0.07
Nodes (27): useMealInstructions(), useSaveMealInstructions(), CheckInDetailSkeleton(), MealInstructionsScreen(), TOOLBAR, ADR-0015, AppScreen(), Props (+19 more)

### Community 2 - "ui/src/index.ts"
Cohesion: 0.04
Nodes (38): useUpdateMe(), NotFoundScreen(), SettingsScreen(), useThemeMode(), AlertBanner(), AlertBannerTone, TONE, AccentButton (+30 more)

### Community 3 - "client-detail/index.tsx"
Cohesion: 0.07
Nodes (28): unstable_settings, CheckInPage(), CheckInDetailPage(), DietaryPage(), GoalNewPage(), ClientHistoryPage(), ClientDetailPage(), ClientJourneyPage() (+20 more)

### Community 4 - "worker/src/index.ts"
Cohesion: 0.10
Nodes (24): boss, { db }, env, QUEUES, cleanupExpired(), refreshAttention(), rollCheckIns(), ADR-0008 (+16 more)

### Community 5 - "useFocusChain"
Cohesion: 0.07
Nodes (27): qk, OtpCodeField(), OtpCodeFieldProps, useLogout(), UseLogoutResult, ForgotRequestForm(), ForgotRequestFormProps, ForgotResetForm() (+19 more)

### Community 6 - "GymOS"
Cohesion: 0.12
Nodes (18): AI Live Eval Workflow, CI Workflow, Mobile Metro Bundle Check, OpenAPI Drift Check, Playwright Login Smoke, Format Lint Typecheck Test, Gitleaks Secret Scan, Mobile EAS Production Deploy (+10 more)

### Community 7 - "detail.tsx"
Cohesion: 0.13
Nodes (20): useCheckIn(), adherenceBarTone(), adherencePctToRating(), adherenceRatingToPct(), asAdherence(), asVerdict(), CheckInDetailScreen(), VERDICT_ICON_BG (+12 more)

### Community 8 - "layer1.ts"
Cohesion: 0.12
Nodes (32): assertSafeTargetKcal(), CALORIE_FLOOR_KCAL, calorieFloor(), clampToSafeKcal(), COACH_OVERRIDE_KCAL_MIN, explainPaceClamp(), MAX_DEFICIT_FRACTION, MAX_SURPLUS_FRACTION (+24 more)

### Community 9 - "Muted"
Cohesion: 0.07
Nodes (30): BreakfastPanel(), DinnerPanel(), MealCompositionScreen(), TabId, TABS, LunchPanel(), OverviewPanel(), SLOT_LABEL (+22 more)

### Community 10 - "app.ts"
Cohesion: 0.07
Nodes (60): buildApp(), AppDeps, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_HEADER_NAME, clearAccessCookie(), clearAuthCookies(), clearRefreshCookie() (+52 more)

### Community 11 - "home/index.tsx"
Cohesion: 0.06
Nodes (31): useClients(), useDueCheckIns(), useMarkAllRead(), useNotifications(), formatCoachDate(), formatCoachTitle(), greetingForHour(), HomeSkeleton() (+23 more)

### Community 12 - "api/index.ts"
Cohesion: 0.08
Nodes (36): invalidateClient(), Mutation, Query, useApplyAdjustment(), useCompleteCheckIn(), useDownloadDietPlanPdf(), useGeneratePlan(), useOnboardClient() (+28 more)

### Community 13 - "db/src/index.ts"
Cohesion: 0.06
Nodes (55): manifest, resolveWeeklyDeltaKg(), Result, migrationsFolder, { sql, close }, createMigrationDb(), Db, DbConnection (+47 more)

### Community 14 - "0000_pilot_schema.sql"
Cohesion: 0.08
Nodes (44): "access_gate_attempts", "ai_feedback_events", "audit_log", "check_ins", "client_attention", "client_dietary_profiles", "client_goals", "clients" (+36 more)

### Community 15 - "solver.ts"
Cohesion: 0.09
Nodes (43): allowedForSlot(), BREAKFAST_FOOD_NAMES, buildItems(), buildMealItems(), CandidateFood, cloneAsDay(), currentTotals(), DEFAULT_SOLVER_CONFIG (+35 more)

### Community 16 - "signup-coach.ts"
Cohesion: 0.05
Nodes (70): readRefreshToken(), problemResponse(), registerAuthRoutes(), newId(), dbTimestampToMillis(), nowIso(), parseDbTimestamp(), toStrictIso() (+62 more)

### Community 17 - "tenancy/manifest.ts"
Cohesion: 0.08
Nodes (22): App, app, db, doc, manifest, out, manifest, manifest (+14 more)

### Community 18 - "nutrition/plans.ts"
Cohesion: 0.08
Nodes (51): dietPlanFilename(), registerCheckInRoutes(), registerPlanRoutes(), assertNoRestrictedFoods(), err, ok, getCheckIn(), getCheckInDetail() (+43 more)

### Community 19 - "api/package.json"
Cohesion: 0.11
Nodes (17): description, drizzle-orm, @electric-sql/pglite, @gymos/ai, @gymos/core, @gymos/db, @gymos/modules, jose (+9 more)

### Community 20 - "mobile/package.json"
Cohesion: 0.05
Nodes (41): expo-file-system, expo-sharing, expo-skia-charts, @gymos/app, @gymos/contracts, @gymos/platform, @gymos/ui, react (+33 more)

### Community 21 - "schemas.ts"
Cohesion: 0.05
Nodes (39): activityLevelSchema, anyObject, clientIdParam, clientIntakeObject, clientIntakeSchema, completeCheckInBody, createClientBody, createGoalBody (+31 more)

### Community 22 - "dependencies"
Cohesion: 0.05
Nodes (38): dependencies, expo, expo-constants, expo-file-system, expo-font, @expo-google-fonts/inter, @expo-google-fonts/roboto-mono, expo-linking (+30 more)

### Community 23 - "step-sign.tsx"
Cohesion: 0.26
Nodes (15): OnboardingClientSummary(), sexLabel(), OnboardingGoalSummary(), optionLabel(), buildOnboardingPreview(), OnboardingDraft, SignaturePad(), StepGoal() (+7 more)

### Community 24 - "ui/package.json"
Cohesion: 0.05
Nodes (37): dependencies, @fontsource/inter, @fontsource/roboto-mono, react, react-native, react-native-svg, react-native-ui-datepicker, react-native-web (+29 more)

### Community 25 - "client-onboarding/index.tsx"
Cohesion: 0.15
Nodes (15): ClientOnboardingScreen(), OnboardingFooter(), OnboardingProgress(), INITIAL_DRAFT, STEP_META, StepId, BILATERAL, FIELD_ORDER (+7 more)

### Community 26 - "tools-tdee.tsx"
Cohesion: 0.14
Nodes (24): useMe(), usePublicConfig(), ClientHubJourney(), Props, activityLevelFrom(), GoalFormScreen(), BmiCategory, categorize() (+16 more)

### Community 27 - "db/package.json"
Cohesion: 0.05
Nodes (35): dependencies, drizzle-orm, @gymos/core, luxon, postgres, uuidv7, description, devDependencies (+27 more)

### Community 28 - "contracts/src/index.ts"
Cohesion: 0.11
Nodes (27): useFoods(), ACTIVITY_LABEL, ClientHubPlan(), GOAL_LABEL, PACE_LABEL, PLAN_TONE, Props, SignaturePadProps (+19 more)

### Community 29 - "form-field.tsx"
Cohesion: 0.10
Nodes (24): ChainActionKind, invokeOncePerTick(), resolveChainAction(), ResolveChainActionOptions, ResolvedChainAction, names, FormFieldProps, FormFieldHandle (+16 more)

### Community 30 - "pace-slider.tsx"
Cohesion: 0.13
Nodes (31): blurActiveElement(), captionColor(), clientXFromEvent(), extremeTickLabel(), fillToken(), floorTooltipId(), isMarkerEventTarget(), clampKcal() (+23 more)

### Community 31 - "modules/package.json"
Cohesion: 0.06
Nodes (34): dependencies, drizzle-orm, @gymos/ai, @gymos/core, @gymos/db, jose, luxon, zod (+26 more)

### Community 32 - "weight-chart.tsx"
Cohesion: 0.13
Nodes (28): HitTarget(), HitTargetProps, buildLayout(), ChartLayout, dashFor(), easeOutCubic(), formatChartDate(), AXIS_FONT_SIZE (+20 more)

### Community 33 - "worker/package.json"
Cohesion: 0.06
Nodes (32): dependencies, drizzle-orm, @gymos/core, @gymos/db, @gymos/modules, luxon, pg-boss, tsx (+24 more)

### Community 34 - "platform/package.json"
Cohesion: 0.06
Nodes (31): dependencies, expo-file-system, expo-sharing, @gymos/ui, react, react-native, @react-native-async-storage/async-storage, react-native-safe-area-context (+23 more)

### Community 35 - "tamagui.config.ts"
Cohesion: 0.08
Nodes (24): DESKTOP_MIN_WIDTH_PX, bodyFont, headingFont, interFace, monoFace, monoFont, monoLineHeights, monoSizes (+16 more)

### Community 36 - "client-journey-node.tsx"
Cohesion: 0.10
Nodes (20): ClientHubHistorySkeleton(), ClientHubSkeleton(), JourneyNode, journeyVerdictPresentation, ClientJourneyMap(), badgeFor(), ClientJourneyNode(), formatDate() (+12 more)

### Community 37 - "exports"
Cohesion: 0.07
Nodes (29): exports, ./api, ./features/check-in, ./features/check-in/detail, ./features/client-detail, ./features/client-onboarding, ./features/dietary, ./features/forgot-password (+21 more)

### Community 38 - "routes/clients.ts"
Cohesion: 0.17
Nodes (25): credentialsFilename(), registerClientRoutes(), registerVitalsGoalRoutes(), createClient(), getClient(), listClients(), onboardClient(), updateClient() (+17 more)

### Community 39 - "expo"
Cohesion: 0.07
Nodes (26): backgroundColor, adaptiveIcon, package, softwareKeyboardLayoutMode, projectId, typedRoutes, expo, android (+18 more)

### Community 40 - "app-shell.tsx"
Cohesion: 0.16
Nodes (18): useUnreadCount(), isClientHubPath(), isActive(), MobileTabBar(), navIcon(), SideNav(), PRIMARY_NAV, PRIMARY_NAV_PATHS (+10 more)

### Community 41 - "app/package.json"
Cohesion: 0.07
Nodes (26): expo-skia-charts, @gymos/contracts, @gymos/core, @gymos/platform, @gymos/ui, react, react-native, react-native-gesture-handler (+18 more)

### Community 42 - "dev-pglite.ts"
Cohesion: 0.09
Nodes (25): app, db, env, hashPasswordLocal(), manifest, manifestPath, pglite, scrypt() (+17 more)

### Community 43 - "app/layout.tsx"
Cohesion: 0.19
Nodes (16): metadata, RootLayout(), viewport, NextTamaguiProvider(), rnwStyleSheet, applyThemeToDocument(), parseThemeMode(), persistThemeModeCookie() (+8 more)

### Community 44 - "money.ts"
Cohesion: 0.21
Nodes (18): CURRENCY_MINOR_UNITS, CurrencyCode, isCurrencyCode(), minorUnitDigits(), SUPPORTED_CURRENCIES, formatMoney(), add(), allocate() (+10 more)

### Community 45 - "client-weight-journey-chart.tsx"
Cohesion: 0.16
Nodes (10): MacroDonut(), ProgressRing(), WeightTrendChart(), WeightTrendChartProps, WeightTrendPoint, BADGE_BG, BADGE_FG, BadgeTone (+2 more)

### Community 46 - "icons.ts"
Cohesion: 0.09
Nodes (23): ClientHubMenuRow(), Props, ClientHubMoreMenu(), Props, MenuLines(), MenuLinesProps, AlertTriangle, ClipboardList (+15 more)

### Community 47 - "contracts/src/types.ts"
Cohesion: 0.06
Nodes (31): ApplyResult, AttentionReason, AuthTokens, ClientDetail, ClientListItem, CoachMealInstructions, CurrencyCode, DueCheckIn (+23 more)

### Community 48 - "adaptive.ts"
Cohesion: 0.19
Nodes (19): ADAPTIVE, AdaptiveInput, AdjustmentRecommendation, confidenceScore(), detectRedFlags(), evaluateProgress(), mean(), netTrendChangeKg() (+11 more)

### Community 49 - "convert.ts"
Cohesion: 0.18
Nodes (21): CM_PER_IN, cmToFeetInches(), cmToIn(), DEFAULT_UNIT_PREFS, displayLength(), DisplayValue, displayWeight(), FeetInches (+13 more)

### Community 50 - "enums.ts"
Cohesion: 0.11
Nodes (21): ADR-0014, checkInStatusEnum, feedbackKindEnum, foodSourceEnum, generationKindEnum, generationStatusEnum, goalPresetEnum, goalRateEnum (+13 more)

### Community 51 - "client-hub-header.tsx"
Cohesion: 0.20
Nodes (12): ClientHubHeader(), Props, StatusKind, PhoneField(), StepContact(), formatInternational(), formatPhoneAsYouType(), isCountryCode() (+4 more)

### Community 52 - "web/package.json"
Cohesion: 0.09
Nodes (21): @gymos/app, @gymos/contracts, @gymos/platform, @gymos/ui, react, react-dom, react-native, react-native-svg (+13 more)

### Community 53 - "client-journey.ts"
Cohesion: 0.18
Nodes (20): addWeeks(), adherenceRatingToScore(), buildLiveJourney(), buildPreviewJourney(), checkInNode(), expectedWeightAt(), isoDate(), JourneyNodeKind (+12 more)

### Community 54 - "variables.tf"
Cohesion: 0.15
Nodes (17): neon_project.pilot, output.database_url_direct, output.database_url_pooled, output.neon_project_id, output.next_steps, output.render_api_url, output.vercel_project_id, var.git_production_branch (+9 more)

### Community 55 - "can.ts"
Cohesion: 0.23
Nodes (13): Action, ACTIONS, Actor, can(), ALL_ORG, Grants, MATRIX, Role (+5 more)

### Community 56 - "prefetch-coach.ts"
Cohesion: 0.21
Nodes (12): Page(), CoachShell(), CoachLayout(), Page(), CoachQuery, dehydrateCoachQueries(), FetchLike, isAuthBlockedStatus() (+4 more)

### Community 57 - "dependencies"
Cohesion: 0.10
Nodes (20): dependencies, expo-skia-charts, @gymos/contracts, @gymos/core, @gymos/platform, @gymos/ui, libphonenumber-js, react (+12 more)

### Community 58 - "journey-chart-model.ts"
Cohesion: 0.14
Nodes (17): ClientWeightJourneyChart(), trackBadge(), JourneyProjectionInput, buildJourneyChartModel(), chartableProjection(), JourneyChartDirection, JourneyChartMilestone, JourneyChartModel (+9 more)

### Community 59 - "plan-ops.ts"
Cohesion: 0.22
Nodes (17): applyAdd(), ApplyCtx, applyDayToWeek(), applyOverrideMacros(), applyPlanOp(), applyPlanOps(), applyRemove(), applySetPortion() (+9 more)

### Community 60 - "pace-control.ts"
Cohesion: 0.13
Nodes (22): GoalFields(), GoalFieldsValue, Props, PaceField(), ACTIVITY_LEVELS, ACTIVITY_OPTIONS, ActivityLevelValue, GOAL_PRESET_OPTIONS (+14 more)

### Community 61 - "tenancy.ts"
Cohesion: 0.14
Nodes (15): clientStatusEnum, coachTierEnum, sexEnum, createdAt(), deletedAt(), id(), tstz(), updatedAt() (+7 more)

### Community 62 - "goal-preview.ts"
Cohesion: 0.23
Nodes (14): GoalEnergySummary(), ageYearsFromDob(), buildGoalPreview(), estimateGoalWeeks(), formatGoalEta(), formatPreviewDate(), GoalPaceAdjustment, GoalPreviewInput (+6 more)

### Community 63 - "goals-panel.tsx"
Cohesion: 0.20
Nodes (15): GoalDeltaCard(), GoalsPanel(), paceColor(), PRESET_COPY, PRESET_ORDER, RATE_LABELS, RATE_ORDER, formatPaceKgPerWeek() (+7 more)

### Community 64 - "roster-row.tsx"
Cohesion: 0.24
Nodes (9): COL, GOAL_LABEL, isAttention(), isNew(), Props, RosterRow(), Avatar(), avatarInitials() (+1 more)

### Community 65 - "nutrition.ts"
Cohesion: 0.12
Nodes (16): aiFeedbackEvents, bytea, clientDietaryProfiles, coachMealInstructions, dietaryRestrictions, foodRankings, foods, foodServingUnits (+8 more)

### Community 66 - "compilerOptions"
Cohesion: 0.12
Nodes (16): compilerOptions, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 67 - "dependencies"
Cohesion: 0.12
Nodes (16): dependencies, @gymos/app, @gymos/contracts, @gymos/platform, @gymos/ui, next, react, react-dom (+8 more)

### Community 68 - "Technical Investor Brief"
Cohesion: 0.17
Nodes (20): OpenAPI Completeness Gap, Gold Narrative JSONL Export, LoRA Narrative Adapter, LoRA Adapter Ops Runbook, assertDeidentified Boundary, Qwen3 Layer-3 Model Card, Qwen3 Instruct GGUF, Adapter Version Canary (+12 more)

### Community 69 - "package.json"
Cohesion: 0.12
Nodes (15): description, typescript, vitest, name, packageManager, private, version, eslint (+7 more)

### Community 70 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-prettier, eslint-import-resolver-typescript, eslint-plugin-boundaries, fast-check, globals, @ianvs/prettier-plugin-sort-imports (+7 more)

### Community 71 - "ai/package.json"
Cohesion: 0.13
Nodes (14): dependencies, @gymos/core, zod, description, exports, @gymos/core, zod, name (+6 more)

### Community 72 - "contracts/src/client.ts"
Cohesion: 0.21
Nodes (10): ClientConfig, config, parseProblem(), performRefresh(), refreshAccessToken(), request(), requestBlob(), RequestOptions (+2 more)

### Community 73 - "mobile/tsconfig.json"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, paths, types, exclude, extends, include (+5 more)

### Community 74 - "GymOS Platform Roadmap"
Cohesion: 0.15
Nodes (19): Security and Tenancy Checklist, Never Fork Per Customer, JWT Refresh Sessions, Per-request Principal Resolution, Postgres RLS, Shared-Schema Tenant Isolation, Tenant Config Registry, ADR-0005 Expo Router + Solito Mobile (+11 more)

### Community 75 - "contracts/package.json"
Cohesion: 0.14
Nodes (13): dependencies, @gymos/core, description, exports, ./openapi.json, @gymos/core, name, private (+5 more)

### Community 76 - "core/package.json"
Cohesion: 0.14
Nodes (13): description, exports, ./money, ./nutrition, ./rbac, ./units, name, private (+5 more)

### Community 77 - "tasks"
Cohesion: 0.14
Nodes (13): dependsOn, outputs, cache, persistent, envMode, $schema, tasks, build (+5 more)

### Community 78 - "session-presence.ts"
Cohesion: 0.22
Nodes (14): RootLayout(), configureMobileApiClient(), hasStoredMobileSession(), getServerSessionPresenceSnapshot(), getSessionPresence(), listeners, subscribeSessionPresence(), useSessionPresence() (+6 more)

### Community 79 - "scripts"
Cohesion: 0.13
Nodes (15): scripts, archify:deliver, archify:validate, build, db:migrate, db:seed, dev, format (+7 more)

### Community 80 - "date-field.tsx"
Cohesion: 0.28
Nodes (11): StepIdentity(), calendarDateYearsAgo(), DateField(), DateFieldCalendar(), DateFieldCalendarProps, formatDisplay(), fromPickerDate(), pad2() (+3 more)

### Community 81 - "ops.ts"
Cohesion: 0.15
Nodes (12): notificationPriorityEnum, notificationTypeEnum, otpPurposeEnum, auditLog, clientAttention, idempotencyKeys, notifications, otpChallenges (+4 more)

### Community 82 - "diet-plan-pdf.ts"
Cohesion: 0.32
Nodes (11): createSpacer(), MARGIN, PdfDoc, renderDietPlanPdf(), Spacer, writeBulletItem(), writeFlatSection(), writeLine() (+3 more)

### Community 83 - "compilerOptions"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, incremental, jsx, lib, module, plugins, exclude (+3 more)

### Community 84 - "ADR-0015 Meal AI Planner Portion Realism"
Cohesion: 0.14
Nodes (21): ADR-0008 Named Pace Clamp-Then-Derive, Clamp-Then-Derive Calories, GOAL_DELTA TDEE Percents, Named Pace Intensity, ADR-0014 Coach Calorie Override, COACH_OVERRIDE_KCAL_MIN 800, Warn Don't Block Calorie Override, ADR-0015 Meal AI Planner Portion Realism (+13 more)

### Community 85 - "restrictions.ts"
Cohesion: 0.24
Nodes (10): AllergenCode, ALLERGENS, isAllergenCode(), isReligiousCode(), RELIGIOUS_CODES, ReligiousCode, RESTRICTION_TYPES, RestrictionType (+2 more)

### Community 86 - "nutrition/coach-instructions.ts"
Cohesion: 0.33
Nodes (8): CoachInstructions, deriveInstructionsPlainText(), getActiveInstructions(), sanitizeInstructionsText(), saveInstructions(), SaveInstructionsResult, stripMarkdownLine(), ADR-0015

### Community 87 - "gate-guard.tsx"
Cohesion: 0.43
Nodes (3): AppShell(), GateGuard(), AUTH_HINT_KEY

### Community 88 - "renovate.json"
Cohesion: 0.18
Nodes (10): config:recommended, :pinAllExceptPeerDependencies, extends, lockFileMaintenance, enabled, schedule, prConcurrentLimit, $schema (+2 more)

### Community 89 - "GymOS Coding Agent Contract"
Cohesion: 0.22
Nodes (13): Copilot Instructions, GymOS PR Contract, GymOS Coding Agent Contract, Graphify Knowledge Graph, CODEOWNERS Human Gate, CI Merge Gates, Next.js Agent Rules, Web CLAUDE Redirect (+5 more)

### Community 90 - "markdown-preview.tsx"
Cohesion: 0.31
Nodes (6): MarkdownSubsetPreview(), ParsedLine, ParsedSegment, parseInlineSegments(), parseMarkdownSubset(), ADR-0015

### Community 91 - "ranking-refresh.ts"
Cohesion: 0.24
Nodes (11): aggregateRankings(), FoodRankingRow, keyOf(), RANKING, RankingSignal, RankingSignalKind, scoreFromSignals(), weightFor() (+3 more)

### Community 92 - "mail.ts"
Cohesion: 0.33
Nodes (9): bodyFor(), createEmailSender(), emailFromError(), EmailSender, fromAddressUsesResendTestingDomain(), ResendMailConfig, SendOtpEmailInput, subjectFor() (+1 more)

### Community 93 - "devDependencies"
Cohesion: 0.22
Nodes (9): devDependencies, jest, jest-expo, @react-native/jest-preset, react-test-renderer, @testing-library/react-native, @types/jest, @types/react (+1 more)

### Community 94 - "scripts"
Cohesion: 0.22
Nodes (9): scripts, android, dev, export:check, ios, maestro:login, start, test (+1 more)

### Community 95 - "mobile-providers.tsx"
Cohesion: 0.28
Nodes (6): MobileProviders(), mockedUseFonts, expo-font, @expo-google-fonts/inter, @expo-google-fonts/roboto-mono, @testing-library/react-native

### Community 96 - "API Service"
Cohesion: 0.25
Nodes (9): App Down Runbook, deploy.sh --rollback, Error-Rate Spike Runbook, Neon Compute Quota Runbook, Probes Must Hit /health/live Only, Neon Instant Restore, R2 Nightly pg_dump Fallback, Stateless Pet VM (+1 more)

### Community 97 - "/health/live"
Cohesion: 0.28
Nodes (9): /health/live, UptimeRobot, OpenTofu PaaS Stack, PaaS Pilot Infra, Stripped Worker PaaS Tradeoff, AI_MODE=fallback, Render gymos-api Service, Oracle Always Free VM (+1 more)

### Community 98 - "Hybrid AI Nutrition System"
Cohesion: 0.25
Nodes (8): Hybrid AI Nutrition System, Layer 1 Physiology, Layer 2 Deterministic Solver, Layer 4 Personalization Rankings, Portion Realism, Seeded Plan Reproducibility, SOLVER_INFEASIBLE, Worker Service

### Community 99 - "Caddy TLS Reverse Proxy"
Cohesion: 0.29
Nodes (8): DNS-01 via DuckDNS, Let's Encrypt Staging CA Debug, TLS Certificate Issues Runbook, Never Prune Docker Volumes Blindly, VM Disk Full Runbook, Caddy TLS Reverse Proxy, Ephemeral queue-db, Web Service

### Community 100 - "seed-data/foods.ts"
Cohesion: 0.25
Nodes (6): DietaryFlags, Per100g, FOOD_SEED, FoodSeed, MealSlotSeed, ADR-0015

### Community 101 - "gradient-ring.tsx"
Cohesion: 0.32
Nodes (6): DualRings(), DualRingsProps, clampPct(), GradientRing(), GradientRingProps, GradientRingRole

### Community 102 - "metro.config.js"
Cohesion: 0.29
Nodes (5): config, expoNavRoot, { getDefaultConfig }, path, workspaceRoot

### Community 103 - "scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, start, test, typecheck

### Community 104 - "Deterministic Code Owns Anything That Must Be True"
Cohesion: 0.29
Nodes (7): Adaptive Check-in Engine, Deterministic Code Owns Anything That Must Be True, fallbackNarrative Templates, Incident to Eval Gate, Layer-3 SLOs, queryGenerationKpis, fallbackNarrative

### Community 105 - "OTP_PEPPER"
Cohesion: 0.38
Nodes (7): Production Mail Fail-Closed Boot, OTP_PEPPER, Email OTP via Resend, FR-C1 Coach Self-Signup OTP, OTP TTL and Lock, Feature Specs, Machine-Checkable Acceptance

### Community 106 - "signature-pad.native.tsx"
Cohesion: 0.29
Nodes (5): SignaturePadProps, styles, WebView, WebViewMessageEvent, WebViewProps

### Community 107 - "app/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 108 - "platform/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 109 - "gymos-sheet.tsx"
Cohesion: 0.43
Nodes (5): GymosSheet(), GymosSheetProps, gymosSheetFrameRadius, gymosSheetOverlayColor, gymosSheetTransition

### Community 110 - "ui/tsconfig.json"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 111 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, @playwright/test, @types/node, @types/react, @types/react-dom, typescript

### Community 112 - "eval-agent-diff.sh Scorer"
Cohesion: 0.33
Nodes (6): Eval Task Split API Routes, Agent Evals Harness, No LLM-as-Judge Scorer, eval-agent-diff.sh Scorer, Eval Result Split API Routes 2026-08-19, Fail-Closed Narrative Guardrails

### Community 113 - "Four Fail-Closed Guardrails"
Cohesion: 0.40
Nodes (6): Constrained JSON Schema Decoding, Four Fail-Closed Guardrails, ALLERGEN_POSTCHECK_FAILED, assertNoRestrictedFoods, Allergen Dual-Check, FR-C7 Dietary Profile Dual-Check

### Community 114 - "Generation Always Creates DRAFT"
Cohesion: 0.40
Nodes (6): Human-in-the-Loop Publish, acknowledgeDrift, Generation Always Creates DRAFT, FR-C6 Plan Generate Edit Publish, Publish Requires reviewed true, PLAN_NEEDS_REVIEW

### Community 115 - "contracts/tsconfig.json"
Cohesion: 0.33
Nodes (5): compilerOptions, lib, extends, include, ../../tsconfig.base.json

### Community 116 - "theme-mode-provider.native.tsx"
Cohesion: 0.24
Nodes (6): memory, storage, readStored(), ThemeModeContext, ThemeModeContextValue, ThemeModeProvider()

### Community 117 - "weave-line.tsx"
Cohesion: 0.47
Nodes (5): clamp(), easeOutCubic(), WeaveLine(), WeaveLineMode, WeaveLineProps

### Community 118 - "proxy.ts"
Cohesion: 0.50
Nodes (4): config, isPublicPath(), proxy(), PUBLIC_PATHS

### Community 119 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @gymos/ai, @gymos/core, @gymos/db, @gymos/modules, hono, @hono/node-server, @hono/zod-openapi (+4 more)

### Community 120 - "Layer 3 Language Model"
Cohesion: 0.50
Nodes (5): assertDeidentified, narrate Circuit Breaker, Layer 3 Language Model, Layer-3 Circuit Breaker, llama.cpp LLM Service

### Community 121 - "eslint.config.mjs"
Cohesion: 0.40
Nodes (3): eslint-config-prettier, eslint-plugin-boundaries, typescript-eslint

### Community 123 - "api/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 125 - "worker/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 126 - "gymos-openapi"
Cohesion: 0.50
Nodes (3): gymos-openapi, npx, @modelcontextprotocol/server-filesystem

### Community 127 - "ADR-0006 Coach Self-Signup + Email OTP"
Cohesion: 0.25
Nodes (8): ADR-0006 Coach Self-Signup + Email OTP, Coach Is the Tenant, Email OTP Signup and Reset, otp_challenges Table, FR-C1 vs Public Coach Signup, Roadmap Phase 4 Coach Marketplace, Roadmap Phase 5 Gym Org-Admin, Roadmap Phase 7 Payments

### Community 128 - "pnpm Workspace"
Cohesion: 0.50
Nodes (4): Lefthook Pre-commit Gitleaks, image-size CVE Audit Ignores, nanoid 3.3.18 Override, pnpm Workspace

### Community 129 - "ai/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 130 - "journey-adherence-score.tsx"
Cohesion: 0.67
Nodes (3): adherenceScoreTone(), JourneyAdherenceScore(), TONE

### Community 131 - "core/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 132 - ""coach_meal_instructions""
Cohesion: 0.50
Nodes (3): "coach_meal_instructions", "public"."coaches", "public"."users"

### Community 133 - "db/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 134 - "modules/tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 135 - "platform/src/index.ts"
Cohesion: 0.26
Nodes (5): downloadBlob(), isWeb, SafeAreaInsets, useSafeAreaInsets(), useDebouncedValue()

### Community 137 - "tsconfig.json"
Cohesion: 0.50
Nodes (3): extends, files, ./tsconfig.base.json

### Community 141 - "useFocusChain Named Order"
Cohesion: 0.67
Nodes (3): ADR-0009 Form Keyboard Focus Chain, FormKeyboardRoot, useFocusChain Named Order

### Community 142 - "gymos-openapi MCP Server"
Cohesion: 1.00
Nodes (3): gymos-openapi MCP Server, Committed OpenAPI Spec, Hand-Written Client DTOs

### Community 146 - "devDependencies"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

### Community 147 - "peerDependenciesMeta"
Cohesion: 0.67
Nodes (3): peerDependenciesMeta, react-native-webview, optional

### Community 148 - "scripts"
Cohesion: 0.67
Nodes (3): scripts, test, typecheck

### Community 188 - "macros-panel.tsx"
Cohesion: 0.20
Nodes (9): CriteriaRow(), MacrosPanel(), PRESET_ORDER, PRESET_TITLES, FAT_G_PER_KG_DEFAULT, FAT_G_PER_KG_MIN, FIBER_G_PER_1000_KCAL, KCAL_PER_G (+1 more)

### Community 189 - "Hybrid AI Nutrition"
Cohesion: 0.61
Nodes (8): Nutrition and AI Safety Checklist, Four-Layer Meal Plan Architecture, Hybrid AI Nutrition, Layer 1 Physiology, Layer 2 Deterministic Solver, Layer 3 Narrative LLM, Layer 4 Personalization, Mandatory Human Review

### Community 190 - "Local Development Stack"
Cohesion: 0.32
Nodes (8): GHCR Image Build, PaaS Neon Migrate, Pilot VM Deploy, Tenant Postgres, Local Development Stack, Local MinIO Object Storage, Ephemeral Queue Postgres, Pilot Architecture

### Community 191 - "client-hub-overview.tsx"
Cohesion: 0.39
Nodes (7): ClientHubOverview(), computeBmi(), paceDisplay(), Props, Client, DietaryProfile, formatWeight()

### Community 192 - "credentials-pdf.ts"
Cohesion: 0.43
Nodes (6): dash(), fmtCm(), fmtKg(), renderCredentialsPdf(), CredentialsPdfData, pdfkit

### Community 193 - "devDependencies"
Cohesion: 0.33
Nodes (6): devDependencies, drizzle-orm, @electric-sql/pglite, @types/node, @types/pdfkit, vitest

### Community 194 - "scripts"
Cohesion: 0.33
Nodes (6): scripts, dev, dev:pglite, openapi:generate, test, typecheck

### Community 195 - "step-height.tsx"
Cohesion: 0.40
Nodes (4): StepHeight(), HeightFields(), HeightFieldsProps, HeightUnit

### Community 196 - "archify-deliver.mjs"
Cohesion: 0.33
Nodes (5): cli, out, result, root, spec

### Community 197 - "Phase 3 Coach Feature Alignment"
Cohesion: 0.50
Nodes (4): Coach-Only Product, FR-C1 Coach Auth, Phase 3 Coach Feature Alignment, Phase 4 Client Member App

## Ambiguous Edges - Review These
- `Roadmap Phase 1 Backend Hardening` → `Alignment P1 Re-skin`  [AMBIGUOUS]
  docs/adr/0007-alignment-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **1158 isolated node(s):** `npx`, `@modelcontextprotocol/server-filesystem`, `name`, `version`, `private` (+1153 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1329 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **19 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Roadmap Phase 1 Backend Hardening` and `Alignment P1 Re-skin`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `libphonenumber-js` connect `client-hub-header.tsx` to `app/package.json`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `expo-router` connect `client-detail/index.tsx` to `mobile/package.json`, `session-presence.ts`, `gate-guard.tsx`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `mobile/package.json`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `npx`, `@modelcontextprotocol/server-filesystem`, `name` to the rest of the system?**
  _1158 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `narrate.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.062342342342342344 - nodes in this community are weakly interconnected._
- **Should `goal-form/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.07400555041628122 - nodes in this community are weakly interconnected._