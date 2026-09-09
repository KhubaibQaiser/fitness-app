# Graph Report - fitness-app  (2026-09-09)

## Corpus Check
- Large corpus: 580 files · ~194,190 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 3074 nodes · 6821 edges · 188 communities (139 shown, 20 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 63 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- AI Nutrition Layer
- Coach App UI
- UI Primitives
- Coach Mobile App
- Domain Modules
- Coach App UI Index
- Claude Md
- Coach App UI Page
- Core Domain Logic
- Coach App UI Meals
- Hono API Server
- Coach App UI 11
- Coach App UI 12
- Domain Modules Vitals Goals
- Database Persistence
- Core Domain Logic Solver
- Domain Modules Mail
- Domain Modules App
- Domain Modules Diet Plan Pdf
- Hono API Server Package
- Coach Mobile App Package
- Hono API Server Schemas
- Coach Mobile App 22
- Coach App UI Goal Energy
- UI Primitives Package
- Coach App UI New
- Coach App UI 26
- Database Persistence Drizzle Config
- Domain Modules Auth Cookies
- UI Primitives Focus Chain
- UI Primitives Pace Slider
- Domain Modules Package
- UI Primitives Hit Target
- Background Worker
- Platform Facade
- UI Primitives Breakpoints
- Coach App UI Client Hub
- Coach App UI Package
- Domain Modules Credentials Pdf
- Coach Mobile App App
- Coach App UI Layout
- Coach App UI 41
- Hono API Server Dev Pglite
- Platform Facade Layout
- Core Domain Logic Currency
- Domain Modules Client
- UI Primitives Client Hub Menu
- OpenAPI Contracts
- Core Domain Logic Adaptive
- Core Domain Logic Convert
- Database Persistence Health
- Domain Modules Http
- Coach Web App
- Coach App UI Client Journey
- PaaS Infra
- Core Domain Logic Actions
- Coach Web App Page
- Coach App UI 57
- Coach App UI Client Weight
- Domain Modules Foods
- Coach App UI Goal Fields
- Database Persistence Enums
- Coach App UI 62
- Coach App UI Goal Delta
- Coach App UI 64
- Database Persistence Nutrition
- Tsconfig Base Json
- Coach Web App Package
- AI Ops Docs
- Package Json
- Package Json Package
- AI Nutrition Layer Package
- OpenAPI Contracts Client
- Coach Mobile App Tsconfig
- Architecture Decisions
- OpenAPI Contracts Package
- Core Domain Logic Package
- Turbo Json
- Coach Mobile App Layout
- Package Json 79
- UI Primitives Step Identity
- Database Persistence 81
- Hono API Server Diet Plan
- Coach Web App Tsconfig
- Architecture Decisions 0015 Meal Ai
- Core Domain Logic Restrictions
- Domain Modules Coach Instructions
- Coach App UI Session Presence
- Renovate Json
- Architecture Decisions 0008 Pace Clamp
- Coach App UI Markdown Preview
- Core Domain Logic Ranking
- Domain Modules 92
- Coach Mobile App 93
- Coach Mobile App 94
- Coach Mobile App Mobile Providers
- Ops Runbooks
- PaaS Infra Down
- Docs Interview Prep Pdf
- Ops Runbooks Cert Renewal
- Database Persistence 100
- UI Primitives Dual Rings
- Coach Mobile App Metro Config
- Coach Web App 103
- Docs Interview Prep Pdf Interview
- Feature Specs
- Coach App UI Signature Pad
- Coach App UI Tsconfig
- Platform Facade Tsconfig
- UI Primitives Gymos Sheet
- UI Primitives Tsconfig
- Coach Web App 111
- Agent Evals
- Feature Specs Interview Prep
- Feature Specs 114
- OpenAPI Contracts Tsconfig
- Platform Facade Theme Mode Provider
- UI Primitives Weave Line
- Coach Web App Proxy
- Architecture Decisions 0005 Expo Router
- Docs Interview Prep Pdf 120
- Package Json Eslint Config
- UI Primitives Form Keyboard Root
- Hono API Server Tsconfig
- Coach Web App Next Config
- Background Worker Tsconfig
- Cursor Mcp Json
- Docs Roadmap Md
- Pnpm Workspace Yaml
- AI Nutrition Layer Tsconfig
- Coach App UI 130
- Core Domain Logic Tsconfig
- Database Persistence 0018 Coach Meal
- Database Persistence Tsconfig
- Domain Modules Tsconfig
- Platform Facade Safe Area
- Platform Facade Storage Native
- Tsconfig Json
- Coach Mobile App Env D
- Coach Web App Manifest
- Coach Web App Login Smoke
- Architecture Decisions 0009 Form Keyboard
- Feature Specs 142
- PaaS Infra Providers
- PaaS Infra Terraform Lock
- VM Infra
- Coach App UI 146
- Coach App UI 147
- Coach App UI 148
- Database Persistence 0006 Auth Sessions
- Database Persistence 0008 Tenant Configs
- Scripts Eval Agent Diff
- Coach Web App Next Env
- Docs Interview Prep Pdf 155
- Ops Runbooks Readme
- Package Json 157
- Database Persistence 0009 Coach Signup
- Platform Facade Is Web Native
- Misc

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
- `Playwright Login Smoke` --semantically_similar_to--> `Maestro Login Flow`  [INFERRED] [semantically similar]
  .github/workflows/ci.yml → apps/mobile/maestro/login.yaml
- `Probes Must Hit /health/live Only` --semantically_similar_to--> `Ephemeral queue-db`  [INFERRED] [semantically similar]
  docs/runbooks/neon-cu-exhausted.md → infra/vm/compose.prod.yml
- `AI_MODE=fallback` --conceptually_related_to--> `fallbackNarrative Templates`  [INFERRED]
  infra/paas/render.yaml → docs/interview-prep.pdf
- `Incident to Eval Gate` --semantically_similar_to--> `Deterministic Code Owns Anything That Must Be True`  [INFERRED] [semantically similar]
  docs/runbooks/generation-failures.md → docs/interview-prep.pdf
- `Allergen Dual-Check` --semantically_similar_to--> `Four Fail-Closed Guardrails`  [INFERRED] [semantically similar]
  docs/specs/fr-c7-dietary-profile.md → docs/interview-prep.pdf

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Merge Gates** — _github_workflows_ci_ci, _github_workflows_ci_secrets, _github_workflows_ci_quality, _github_workflows_ci_mobile_bundle, agents_merge_gates, readme_gymos [EXTRACTED 1.00]
- **Hybrid Nutrition Safety Stack** — docs_adr_0001_hybrid_ai_nutrition_hybrid_ai_nutrition, docs_adr_0001_hybrid_ai_nutrition_layer_1, docs_adr_0001_hybrid_ai_nutrition_layer_2, docs_adr_0001_hybrid_ai_nutrition_layer_3, docs_adr_0001_hybrid_ai_nutrition_mandatory_human_review, _github_pull_request_template_nutrition_ai_safety, claude_hybrid_four_layer_nutrition [EXTRACTED 1.00]
- **Shared-Schema Tenant Isolation** — docs_adr_0003_shared_schema_tenant_isolation_shared_schema_isolation, docs_adr_0003_shared_schema_tenant_isolation_postgres_rls, docs_adr_0004_tenant_config_registry_tenant_config_registry, claude_never_fork_per_customer [INFERRED 0.85]
- **Layer-3 Canary Promote Rollback Loop** — docs_ai_model_card_model_card, docs_ai_lora_ops_lora_ops, docs_ai_prompt_canary_prompt_canary [EXTRACTED 1.00]
- **Named Pace Calorie Safety Policy** — docs_adr_0008_pace_clamp_then_derive_clamp_then_derive, docs_adr_0008_pace_clamp_then_derive_named_pace, docs_adr_0014_coach_calorie_override_warn_dont_block [EXTRACTED 1.00]
- **Portion Realism Solver Path** — docs_adr_0015_meal_ai_planner_portion_realism_and_coach_overrides_d1_portion_realism, docs_adr_0015_meal_ai_planner_portion_realism_and_coach_overrides_solve_meal, docs_adr_0015_meal_ai_planner_portion_realism_and_coach_overrides_max_units [EXTRACTED 1.00]
- **Allergen Dual-Check Safety Path** — docs_specs_fr_c7_dietary_profile_dual_check, docs_specs_fr_c7_dietary_profile_assertnorestrictedfoods, docs_runbooks_generation_failures_allergen_postcheck_failed, docs_interview_prep_layer2_solver [EXTRACTED 1.00]
- **Coach OTP Production Secrets** — docs_runbooks_email_otp_otp_pepper, docs_specs_fr_c1_coach_signup_otp_frc1, infra_vm_compose_prod_api, infra_paas_render_gymos_api [INFERRED 0.85]
- **Hybrid Nutrition Fail-Closed Loop** — docs_interview_prep_hybrid_ai_nutrition, docs_interview_prep_four_guardrails, docs_interview_prep_fallback_narrative, docs_specs_fr_c6_plan_publish_draft_until_publish, docs_runbooks_generation_failures_circuit_breaker [INFERRED 0.85]

## Communities (188 total, 20 thin omitted)

### Community 0 - "AI Nutrition Layer"
Cohesion: 0.06
Nodes (61): { db, close }, GoldRow, input, hashNarrativeInput(), LlmCacheStore, CIRCUIT, CircuitState, DEFAULT (+53 more)

### Community 1 - "Coach App UI"
Cohesion: 0.06
Nodes (51): useClientDetail(), useMealInstructions(), useSaveMealInstructions(), useVitals(), ACTIVITY_LABEL, ClientHubPlan(), GOAL_LABEL, PACE_LABEL (+43 more)

### Community 2 - "UI Primitives"
Cohesion: 0.05
Nodes (37): SignaturePadProps, NotFoundScreen(), AlertBannerTone, TONE, AccentButton, baseButton, DangerButton, focusRing (+29 more)

### Community 3 - "Coach Mobile App"
Cohesion: 0.06
Nodes (33): unstable_settings, CheckInPage(), CheckInDetailPage(), DietaryPage(), GoalNewPage(), ClientHistoryPage(), ClientDetailPage(), ClientJourneyPage() (+25 more)

### Community 4 - "Domain Modules"
Cohesion: 0.06
Nodes (47): boss, { db }, env, QUEUES, cleanupExpired(), refreshAttention(), rollCheckIns(), ADR-0008 (+39 more)

### Community 5 - "Coach App UI Index"
Cohesion: 0.06
Nodes (32): qk, useUpdateMe(), OtpCodeField(), OtpCodeFieldProps, useLogout(), UseLogoutResult, ForgotRequestForm(), ForgotRequestFormProps (+24 more)

### Community 6 - "Claude Md"
Cohesion: 0.06
Nodes (58): Copilot Instructions, Nutrition and AI Safety Checklist, GymOS PR Contract, Security and Tenancy Checklist, AI Live Eval Workflow, CI Workflow, Mobile Metro Bundle Check, OpenAPI Drift Check (+50 more)

### Community 7 - "Coach App UI Page"
Cohesion: 0.07
Nodes (37): useApplyAdjustment(), useCheckIn(), useCompleteCheckIn(), useUpdateCheckIn(), MacroDonut(), ProgressRing(), WeightTrendChart(), WeightTrendChartProps (+29 more)

### Community 8 - "Core Domain Logic"
Cohesion: 0.08
Nodes (49): CriteriaRow(), MacrosPanel(), PRESET_ORDER, PRESET_TITLES, buildPaceControlView(), PaceControlInput, loseTicks, assertSafeTargetKcal() (+41 more)

### Community 9 - "Coach App UI Meals"
Cohesion: 0.08
Nodes (27): BreakfastPanel(), DinnerPanel(), MealCompositionScreen(), TabId, TABS, LunchPanel(), OverviewPanel(), SLOT_LABEL (+19 more)

### Community 10 - "Hono API Server"
Cohesion: 0.10
Nodes (39): buildApp(), AppDeps, ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_HEADER_NAME, clearAccessCookie(), clearAuthCookies(), clearRefreshCookie() (+31 more)

### Community 11 - "Coach App UI 11"
Cohesion: 0.07
Nodes (27): useDueCheckIns(), useMarkAllRead(), useNotifications(), formatCoachDate(), formatCoachTitle(), greetingForHour(), HomeSkeleton(), HomeScreen() (+19 more)

### Community 12 - "Coach App UI 12"
Cohesion: 0.09
Nodes (36): invalidateClient(), Mutation, Query, useDownloadDietPlanPdf(), useFoods(), useGeneratePlan(), usePatchPlan(), usePlan() (+28 more)

### Community 13 - "Domain Modules Vitals Goals"
Cohesion: 0.08
Nodes (36): registerVitalsGoalRoutes(), ClientIntake, SignedClientIntake, Soft, DbOrTx, ClientListItem, CreateClientInput, ListClientsOpts (+28 more)

### Community 14 - "Database Persistence"
Cohesion: 0.08
Nodes (44): "access_gate_attempts", "ai_feedback_events", "audit_log", "check_ins", "client_attention", "client_dietary_profiles", "client_goals", "clients" (+36 more)

### Community 15 - "Core Domain Logic Solver"
Cohesion: 0.10
Nodes (40): allowedForSlot(), BREAKFAST_FOOD_NAMES, buildItems(), buildMealItems(), CandidateFood, cloneAsDay(), currentTotals(), DEFAULT_SOLVER_CONFIG (+32 more)

### Community 16 - "Domain Modules Mail"
Cohesion: 0.08
Nodes (38): createMemoryEmailSender(), EmailSender, codesEqual(), createChallenge(), CreateChallengeInput, CreatedChallenge, findActiveChallenge(), generateCode() (+30 more)

### Community 17 - "Domain Modules App"
Cohesion: 0.07
Nodes (30): App, app, db, doc, manifest, out, manifest, manifest (+22 more)

### Community 18 - "Domain Modules Diet Plan Pdf"
Cohesion: 0.09
Nodes (41): dietPlanFilename(), registerPlanRoutes(), assertNoRestrictedFoods(), FoodGroup, SolvedDay, SolverError, err, restrictedAllergenCodes() (+33 more)

### Community 19 - "Hono API Server Package"
Cohesion: 0.05
Nodes (41): dependencies, @gymos/ai, @gymos/core, @gymos/db, @gymos/modules, hono, @hono/node-server, @hono/zod-openapi (+33 more)

### Community 20 - "Coach Mobile App Package"
Cohesion: 0.05
Nodes (41): expo-file-system, expo-sharing, expo-skia-charts, @gymos/app, @gymos/contracts, @gymos/platform, @gymos/ui, react (+33 more)

### Community 21 - "Hono API Server Schemas"
Cohesion: 0.05
Nodes (39): activityLevelSchema, anyObject, clientIdParam, clientIntakeObject, clientIntakeSchema, completeCheckInBody, createClientBody, createGoalBody (+31 more)

### Community 22 - "Coach Mobile App 22"
Cohesion: 0.05
Nodes (38): dependencies, expo, expo-constants, expo-file-system, expo-font, @expo-google-fonts/inter, @expo-google-fonts/roboto-mono, expo-linking (+30 more)

### Community 23 - "Coach App UI Goal Energy"
Cohesion: 0.15
Nodes (28): GoalEnergySummary(), OnboardingClientSummary(), sexLabel(), OnboardingGoalSummary(), optionLabel(), buildOnboardingPreview(), OnboardingDraft, SignaturePad() (+20 more)

### Community 24 - "UI Primitives Package"
Cohesion: 0.05
Nodes (37): dependencies, @fontsource/inter, @fontsource/roboto-mono, react, react-native, react-native-svg, react-native-ui-datepicker, react-native-web (+29 more)

### Community 25 - "Coach App UI New"
Cohesion: 0.10
Nodes (23): useOnboardClient(), ClientOnboardingScreen(), OnboardingFooter(), OnboardingProgress(), INITIAL_DRAFT, STEP_META, StepId, PhoneField() (+15 more)

### Community 26 - "Coach App UI 26"
Cohesion: 0.12
Nodes (26): useMe(), usePublicConfig(), ClientHubJourney(), Props, ClientHubOverview(), computeBmi(), paceDisplay(), Props (+18 more)

### Community 27 - "Database Persistence Drizzle Config"
Cohesion: 0.05
Nodes (35): dependencies, drizzle-orm, @gymos/core, luxon, postgres, uuidv7, description, devDependencies (+27 more)

### Community 28 - "Domain Modules Auth Cookies"
Cohesion: 0.12
Nodes (29): readRefreshToken(), problemResponse(), registerAuthRoutes(), DUMMY_HASH_PROMISE, LoginFailure, LoginResult, LoginSuccess, loginWithPassword() (+21 more)

### Community 29 - "UI Primitives Focus Chain"
Cohesion: 0.10
Nodes (24): ChainActionKind, invokeOncePerTick(), resolveChainAction(), ResolveChainActionOptions, ResolvedChainAction, names, FormFieldProps, FormFieldHandle (+16 more)

### Community 30 - "UI Primitives Pace Slider"
Cohesion: 0.13
Nodes (32): blurActiveElement(), captionColor(), clientXFromEvent(), extremeTickLabel(), fillToken(), floorTooltipId(), isMarkerEventTarget(), clampKcal() (+24 more)

### Community 31 - "Domain Modules Package"
Cohesion: 0.06
Nodes (34): dependencies, drizzle-orm, @gymos/ai, @gymos/core, @gymos/db, jose, luxon, zod (+26 more)

### Community 32 - "UI Primitives Hit Target"
Cohesion: 0.13
Nodes (28): HitTarget(), HitTargetProps, buildLayout(), ChartLayout, dashFor(), easeOutCubic(), formatChartDate(), AXIS_FONT_SIZE (+20 more)

### Community 33 - "Background Worker"
Cohesion: 0.06
Nodes (32): dependencies, drizzle-orm, @gymos/core, @gymos/db, @gymos/modules, luxon, pg-boss, tsx (+24 more)

### Community 34 - "Platform Facade"
Cohesion: 0.06
Nodes (31): dependencies, expo-file-system, expo-sharing, @gymos/ui, react, react-native, @react-native-async-storage/async-storage, react-native-safe-area-context (+23 more)

### Community 35 - "UI Primitives Breakpoints"
Cohesion: 0.08
Nodes (24): DESKTOP_MIN_WIDTH_PX, bodyFont, headingFont, interFace, monoFace, monoFont, monoLineHeights, monoSizes (+16 more)

### Community 36 - "Coach App UI Client Hub"
Cohesion: 0.10
Nodes (20): ClientHubHistorySkeleton(), ClientHubSkeleton(), JourneyNode, journeyVerdictPresentation, ClientJourneyMap(), badgeFor(), ClientJourneyNode(), formatDate() (+12 more)

### Community 37 - "Coach App UI Package"
Cohesion: 0.07
Nodes (29): exports, ./api, ./features/check-in, ./features/check-in/detail, ./features/client-detail, ./features/client-onboarding, ./features/dietary, ./features/forgot-password (+21 more)

### Community 38 - "Domain Modules Credentials Pdf"
Cohesion: 0.16
Nodes (20): credentialsFilename(), dash(), fmtCm(), fmtKg(), renderCredentialsPdf(), registerClientRoutes(), createClient(), getClient() (+12 more)

### Community 39 - "Coach Mobile App App"
Cohesion: 0.07
Nodes (26): backgroundColor, adaptiveIcon, package, softwareKeyboardLayoutMode, projectId, typedRoutes, expo, android (+18 more)

### Community 40 - "Coach App UI Layout"
Cohesion: 0.13
Nodes (19): useUnreadCount(), AppShell(), isActive(), MobileTabBar(), navIcon(), SideNav(), PRIMARY_NAV, PRIMARY_NAV_PATHS (+11 more)

### Community 41 - "Coach App UI 41"
Cohesion: 0.07
Nodes (26): expo-skia-charts, @gymos/contracts, @gymos/core, @gymos/platform, @gymos/ui, react, react-native, react-native-gesture-handler (+18 more)

### Community 42 - "Hono API Server Dev Pglite"
Cohesion: 0.10
Nodes (22): app, db, env, hashPasswordLocal(), manifest, manifestPath, pglite, scrypt() (+14 more)

### Community 43 - "Platform Facade Layout"
Cohesion: 0.17
Nodes (18): metadata, RootLayout(), viewport, NextTamaguiProvider(), rnwStyleSheet, isWeb, applyThemeToDocument(), parseThemeMode() (+10 more)

### Community 44 - "Core Domain Logic Currency"
Cohesion: 0.20
Nodes (20): CURRENCY_MINOR_UNITS, CurrencyCode, isCurrencyCode(), minorUnitDigits(), SUPPORTED_CURRENCIES, formatMoney(), add(), allocate() (+12 more)

### Community 45 - "Domain Modules Client"
Cohesion: 0.16
Nodes (22): Tx, hasMedicalFlags(), dbTimestampToMillis(), nowIso(), parseDbTimestamp(), toStrictIso(), assembleWeighIns(), attentionReasonsFor() (+14 more)

### Community 46 - "UI Primitives Client Hub Menu"
Cohesion: 0.10
Nodes (20): ClientHubMenuRow(), Props, ClientHubMoreMenu(), Props, MenuLines(), MenuLinesProps, Download, Dumbbell (+12 more)

### Community 47 - "OpenAPI Contracts"
Cohesion: 0.08
Nodes (24): ApplyResult, AttentionReason, AuthTokens, ClientDetail, ClientListItem, CoachMealInstructions, CurrencyCode, DueCheckIn (+16 more)

### Community 48 - "Core Domain Logic Adaptive"
Cohesion: 0.16
Nodes (22): ADAPTIVE, AdaptiveInput, AdjustmentRecommendation, confidenceScore(), detectRedFlags(), evaluateProgress(), mean(), netTrendChangeKg() (+14 more)

### Community 49 - "Core Domain Logic Convert"
Cohesion: 0.19
Nodes (22): CM_PER_IN, cmToFeetInches(), cmToIn(), DEFAULT_UNIT_PREFS, displayLength(), DisplayValue, displayWeight(), FeetInches (+14 more)

### Community 50 - "Database Persistence Health"
Cohesion: 0.11
Nodes (21): ADR-0014, checkInStatusEnum, feedbackKindEnum, foodSourceEnum, generationKindEnum, generationStatusEnum, goalPresetEnum, goalRateEnum (+13 more)

### Community 51 - "Domain Modules Http"
Cohesion: 0.19
Nodes (18): GymosApp, json(), problemDocs(), registerCheckInRoutes(), ADR-0015, registerNotificationRoutes(), getCheckIn(), getCheckInDetail() (+10 more)

### Community 52 - "Coach Web App"
Cohesion: 0.09
Nodes (21): @gymos/app, @gymos/contracts, @gymos/platform, @gymos/ui, react, react-dom, react-native, react-native-svg (+13 more)

### Community 53 - "Coach App UI Client Journey"
Cohesion: 0.18
Nodes (20): addWeeks(), adherenceRatingToScore(), buildLiveJourney(), buildPreviewJourney(), checkInNode(), expectedWeightAt(), isoDate(), JourneyNodeKind (+12 more)

### Community 54 - "PaaS Infra"
Cohesion: 0.15
Nodes (17): neon_project.pilot, output.database_url_direct, output.database_url_pooled, output.neon_project_id, output.next_steps, output.render_api_url, output.vercel_project_id, var.git_production_branch (+9 more)

### Community 55 - "Core Domain Logic Actions"
Cohesion: 0.23
Nodes (13): Action, ACTIONS, Actor, can(), ALL_ORG, Grants, MATRIX, Role (+5 more)

### Community 56 - "Coach Web App Page"
Cohesion: 0.21
Nodes (12): Page(), CoachShell(), CoachLayout(), Page(), CoachQuery, dehydrateCoachQueries(), FetchLike, isAuthBlockedStatus() (+4 more)

### Community 57 - "Coach App UI 57"
Cohesion: 0.10
Nodes (20): dependencies, expo-skia-charts, @gymos/contracts, @gymos/core, @gymos/platform, @gymos/ui, libphonenumber-js, react (+12 more)

### Community 58 - "Coach App UI Client Weight"
Cohesion: 0.14
Nodes (17): ClientWeightJourneyChart(), trackBadge(), JourneyProjectionInput, buildJourneyChartModel(), chartableProjection(), JourneyChartDirection, JourneyChartMilestone, JourneyChartModel (+9 more)

### Community 59 - "Domain Modules Foods"
Cohesion: 0.23
Nodes (17): foodsById(), applyAdd(), ApplyCtx, applyDayToWeek(), applyOverrideMacros(), applyPlanOp(), applyPlanOps(), applyRemove() (+9 more)

### Community 60 - "Coach App UI Goal Fields"
Cohesion: 0.17
Nodes (13): GoalFields(), GoalFieldsValue, Props, PaceField(), ACTIVITY_LEVELS, ACTIVITY_OPTIONS, ActivityLevelValue, GOAL_PRESET_OPTIONS (+5 more)

### Community 61 - "Database Persistence Enums"
Cohesion: 0.14
Nodes (16): clientStatusEnum, coachTierEnum, sexEnum, createdAt(), deletedAt(), id(), newId(), tstz() (+8 more)

### Community 62 - "Coach App UI 62"
Cohesion: 0.14
Nodes (11): TOOLS, ToolsScreen(), TabId, TABS, ToolsCalculators(), KCAL_PER_G, MacroPreset, parsePositive() (+3 more)

### Community 63 - "Coach App UI Goal Delta"
Cohesion: 0.20
Nodes (15): GoalDeltaCard(), GoalsPanel(), paceColor(), PRESET_COPY, PRESET_ORDER, RATE_LABELS, RATE_ORDER, formatPaceKgPerWeek() (+7 more)

### Community 64 - "Coach App UI 64"
Cohesion: 0.17
Nodes (13): useClients(), COL, FilterId, FILTERS, isAttention(), isNew(), RosterScreen(), COL (+5 more)

### Community 65 - "Database Persistence Nutrition"
Cohesion: 0.12
Nodes (16): aiFeedbackEvents, bytea, clientDietaryProfiles, coachMealInstructions, dietaryRestrictions, foodRankings, foods, foodServingUnits (+8 more)

### Community 66 - "Tsconfig Base Json"
Cohesion: 0.12
Nodes (16): compilerOptions, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleResolution, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 67 - "Coach Web App Package"
Cohesion: 0.12
Nodes (16): dependencies, @gymos/app, @gymos/contracts, @gymos/platform, @gymos/ui, next, react, react-dom (+8 more)

### Community 68 - "AI Ops Docs"
Cohesion: 0.22
Nodes (16): Gold Narrative JSONL Export, LoRA Narrative Adapter, LoRA Adapter Ops Runbook, assertDeidentified Boundary, Qwen3 Layer-3 Model Card, Qwen3 Instruct GGUF, Adapter Version Canary, Prompt Canary Promote/Rollback (+8 more)

### Community 69 - "Package Json"
Cohesion: 0.12
Nodes (15): description, typescript, vitest, name, packageManager, private, version, eslint (+7 more)

### Community 70 - "Package Json Package"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-prettier, eslint-import-resolver-typescript, eslint-plugin-boundaries, fast-check, globals, @ianvs/prettier-plugin-sort-imports (+7 more)

### Community 71 - "AI Nutrition Layer Package"
Cohesion: 0.13
Nodes (14): dependencies, @gymos/core, zod, description, exports, @gymos/core, zod, name (+6 more)

### Community 72 - "OpenAPI Contracts Client"
Cohesion: 0.21
Nodes (10): ClientConfig, config, parseProblem(), performRefresh(), refreshAccessToken(), request(), requestBlob(), RequestOptions (+2 more)

### Community 73 - "Coach Mobile App Tsconfig"
Cohesion: 0.14
Nodes (13): compilerOptions, jsx, lib, paths, types, exclude, extends, include (+5 more)

### Community 74 - "Architecture Decisions"
Cohesion: 0.18
Nodes (14): ADR-0006 Coach Self-Signup + Email OTP, Email OTP Signup and Reset, otp_challenges Table, ADR-0007 Alignment Phase 0 Gap Audit, Alignment Prompt v5, FR-C1 vs Public Coach Signup, OpenAPI Completeness Gap, Org-Unbound RBAC / IDOR Gap (+6 more)

### Community 75 - "OpenAPI Contracts Package"
Cohesion: 0.14
Nodes (13): dependencies, @gymos/core, description, exports, ./openapi.json, @gymos/core, name, private (+5 more)

### Community 76 - "Core Domain Logic Package"
Cohesion: 0.14
Nodes (13): description, exports, ./money, ./nutrition, ./rbac, ./units, name, private (+5 more)

### Community 77 - "Turbo Json"
Cohesion: 0.14
Nodes (13): dependsOn, outputs, cache, persistent, envMode, $schema, tasks, build (+5 more)

### Community 78 - "Coach Mobile App Layout"
Cohesion: 0.23
Nodes (9): RootLayout(), configureMobileApiClient(), hasStoredMobileSession(), configureApiClient(), hydrateStorage(), memory, expo-secure-store, expo-splash-screen (+1 more)

### Community 79 - "Package Json 79"
Cohesion: 0.15
Nodes (13): scripts, build, db:migrate, db:seed, dev, format, format:check, lint (+5 more)

### Community 80 - "UI Primitives Step Identity"
Cohesion: 0.28
Nodes (11): StepIdentity(), calendarDateYearsAgo(), DateField(), DateFieldCalendar(), DateFieldCalendarProps, formatDisplay(), fromPickerDate(), pad2() (+3 more)

### Community 81 - "Database Persistence 81"
Cohesion: 0.15
Nodes (12): notificationPriorityEnum, notificationTypeEnum, otpPurposeEnum, auditLog, clientAttention, idempotencyKeys, notifications, otpChallenges (+4 more)

### Community 82 - "Hono API Server Diet Plan"
Cohesion: 0.32
Nodes (11): createSpacer(), MARGIN, PdfDoc, renderDietPlanPdf(), Spacer, writeBulletItem(), writeFlatSection(), writeLine() (+3 more)

### Community 83 - "Coach Web App Tsconfig"
Cohesion: 0.17
Nodes (11): compilerOptions, allowJs, incremental, jsx, lib, module, plugins, exclude (+3 more)

### Community 84 - "Architecture Decisions 0015 Meal Ai"
Cohesion: 0.24
Nodes (12): ADR-0015 Meal AI Planner Portion Realism, D1 Per-Food Serving Ceilings, D2 Coach Meal Instructions, D3 Per-Meal Regenerate, D4 Per-Meal Kcal Split, D5 Rotating Template Week Mode, D6 PREFERRED Restriction Type, Layer 3 Narration-Only Boundary (+4 more)

### Community 85 - "Core Domain Logic Restrictions"
Cohesion: 0.24
Nodes (10): AllergenCode, ALLERGENS, isAllergenCode(), isReligiousCode(), RELIGIOUS_CODES, ReligiousCode, RESTRICTION_TYPES, RestrictionType (+2 more)

### Community 86 - "Domain Modules Coach Instructions"
Cohesion: 0.31
Nodes (9): registerCoachInstructionsRoutes(), CoachInstructions, deriveInstructionsPlainText(), getActiveInstructions(), sanitizeInstructionsText(), saveInstructions(), SaveInstructionsResult, stripMarkdownLine() (+1 more)

### Community 87 - "Coach App UI Session Presence"
Cohesion: 0.36
Nodes (8): AUTH_HINT_KEY, getServerSessionPresenceSnapshot(), getSessionPresence(), listeners, subscribeSessionPresence(), useSessionPresence(), AppProviders(), storage

### Community 88 - "Renovate Json"
Cohesion: 0.18
Nodes (10): config:recommended, :pinAllExceptPeerDependencies, extends, lockFileMaintenance, enabled, schedule, prConcurrentLimit, $schema (+2 more)

### Community 89 - "Architecture Decisions 0008 Pace Clamp"
Cohesion: 0.29
Nodes (10): ADR-0008 Named Pace Clamp-Then-Derive, Clamp-Then-Derive Calories, GOAL_DELTA TDEE Percents, Named Pace Intensity, ADR-0014 Coach Calorie Override, COACH_OVERRIDE_KCAL_MIN 800, Warn Don't Block Calorie Override, Four-Layer Hybrid Nutrition (+2 more)

### Community 90 - "Coach App UI Markdown Preview"
Cohesion: 0.31
Nodes (6): MarkdownSubsetPreview(), ParsedLine, ParsedSegment, parseInlineSegments(), parseMarkdownSubset(), ADR-0015

### Community 91 - "Core Domain Logic Ranking"
Cohesion: 0.31
Nodes (8): aggregateRankings(), FoodRankingRow, keyOf(), RANKING, RankingSignal, RankingSignalKind, scoreFromSignals(), weightFor()

### Community 92 - "Domain Modules 92"
Cohesion: 0.38
Nodes (8): bodyFor(), createEmailSender(), emailFromError(), fromAddressUsesResendTestingDomain(), ResendMailConfig, SendOtpEmailInput, subjectFor(), willCallResend()

### Community 93 - "Coach Mobile App 93"
Cohesion: 0.22
Nodes (9): devDependencies, jest, jest-expo, @react-native/jest-preset, react-test-renderer, @testing-library/react-native, @types/jest, @types/react (+1 more)

### Community 94 - "Coach Mobile App 94"
Cohesion: 0.22
Nodes (9): scripts, android, dev, export:check, ios, maestro:login, start, test (+1 more)

### Community 95 - "Coach Mobile App Mobile Providers"
Cohesion: 0.28
Nodes (6): MobileProviders(), mockedUseFonts, expo-font, @expo-google-fonts/inter, @expo-google-fonts/roboto-mono, @testing-library/react-native

### Community 96 - "Ops Runbooks"
Cohesion: 0.25
Nodes (9): App Down Runbook, deploy.sh --rollback, Error-Rate Spike Runbook, Neon Compute Quota Runbook, Probes Must Hit /health/live Only, Neon Instant Restore, R2 Nightly pg_dump Fallback, Stateless Pet VM (+1 more)

### Community 97 - "PaaS Infra Down"
Cohesion: 0.28
Nodes (9): /health/live, UptimeRobot, OpenTofu PaaS Stack, PaaS Pilot Infra, Stripped Worker PaaS Tradeoff, AI_MODE=fallback, Render gymos-api Service, Oracle Always Free VM (+1 more)

### Community 98 - "Docs Interview Prep Pdf"
Cohesion: 0.25
Nodes (8): Hybrid AI Nutrition System, Layer 1 Physiology, Layer 2 Deterministic Solver, Layer 4 Personalization Rankings, Portion Realism, Seeded Plan Reproducibility, SOLVER_INFEASIBLE, Worker Service

### Community 99 - "Ops Runbooks Cert Renewal"
Cohesion: 0.29
Nodes (8): DNS-01 via DuckDNS, Let's Encrypt Staging CA Debug, TLS Certificate Issues Runbook, Never Prune Docker Volumes Blindly, VM Disk Full Runbook, Caddy TLS Reverse Proxy, Ephemeral queue-db, Web Service

### Community 100 - "Database Persistence 100"
Cohesion: 0.25
Nodes (6): DietaryFlags, Per100g, FOOD_SEED, FoodSeed, MealSlotSeed, ADR-0015

### Community 101 - "UI Primitives Dual Rings"
Cohesion: 0.32
Nodes (6): DualRings(), DualRingsProps, clampPct(), GradientRing(), GradientRingProps, GradientRingRole

### Community 102 - "Coach Mobile App Metro Config"
Cohesion: 0.29
Nodes (5): config, expoNavRoot, { getDefaultConfig }, path, workspaceRoot

### Community 103 - "Coach Web App 103"
Cohesion: 0.29
Nodes (7): scripts, build, dev, e2e, start, test, typecheck

### Community 104 - "Docs Interview Prep Pdf Interview"
Cohesion: 0.29
Nodes (7): Adaptive Check-in Engine, Deterministic Code Owns Anything That Must Be True, fallbackNarrative Templates, Incident to Eval Gate, Layer-3 SLOs, queryGenerationKpis, fallbackNarrative

### Community 105 - "Feature Specs"
Cohesion: 0.38
Nodes (7): Production Mail Fail-Closed Boot, OTP_PEPPER, Email OTP via Resend, FR-C1 Coach Self-Signup OTP, OTP TTL and Lock, Feature Specs, Machine-Checkable Acceptance

### Community 106 - "Coach App UI Signature Pad"
Cohesion: 0.29
Nodes (5): SignaturePadProps, styles, WebView, WebViewMessageEvent, WebViewProps

### Community 107 - "Coach App UI Tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 108 - "Platform Facade Tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 109 - "UI Primitives Gymos Sheet"
Cohesion: 0.43
Nodes (5): GymosSheet(), GymosSheetProps, gymosSheetFrameRadius, gymosSheetOverlayColor, gymosSheetTransition

### Community 110 - "UI Primitives Tsconfig"
Cohesion: 0.29
Nodes (6): compilerOptions, jsx, lib, extends, include, ../../tsconfig.base.json

### Community 111 - "Coach Web App 111"
Cohesion: 0.33
Nodes (6): devDependencies, @playwright/test, @types/node, @types/react, @types/react-dom, typescript

### Community 112 - "Agent Evals"
Cohesion: 0.33
Nodes (6): Eval Task Split API Routes, Agent Evals Harness, No LLM-as-Judge Scorer, eval-agent-diff.sh Scorer, Eval Result Split API Routes 2026-08-19, Fail-Closed Narrative Guardrails

### Community 113 - "Feature Specs Interview Prep"
Cohesion: 0.40
Nodes (6): Constrained JSON Schema Decoding, Four Fail-Closed Guardrails, ALLERGEN_POSTCHECK_FAILED, assertNoRestrictedFoods, Allergen Dual-Check, FR-C7 Dietary Profile Dual-Check

### Community 114 - "Feature Specs 114"
Cohesion: 0.40
Nodes (6): Human-in-the-Loop Publish, acknowledgeDrift, Generation Always Creates DRAFT, FR-C6 Plan Generate Edit Publish, Publish Requires reviewed true, PLAN_NEEDS_REVIEW

### Community 115 - "OpenAPI Contracts Tsconfig"
Cohesion: 0.33
Nodes (5): compilerOptions, lib, extends, include, ../../tsconfig.base.json

### Community 116 - "Platform Facade Theme Mode Provider"
Cohesion: 0.40
Nodes (4): readStored(), ThemeModeContext, ThemeModeContextValue, ThemeModeProvider()

### Community 117 - "UI Primitives Weave Line"
Cohesion: 0.47
Nodes (5): clamp(), easeOutCubic(), WeaveLine(), WeaveLineMode, WeaveLineProps

### Community 118 - "Coach Web App Proxy"
Cohesion: 0.50
Nodes (4): config, isPublicPath(), proxy(), PUBLIC_PATHS

### Community 119 - "Architecture Decisions 0005 Expo Router"
Cohesion: 0.40
Nodes (5): ADR-0005 Expo Router + Solito Mobile, Expo Router Native Shell, Platform Splits in @gymos/platform, Solito Cross-Platform Navigation, Roadmap Phase 2 Coach Mobile

### Community 120 - "Docs Interview Prep Pdf 120"
Cohesion: 0.50
Nodes (5): assertDeidentified, narrate Circuit Breaker, Layer 3 Language Model, Layer-3 Circuit Breaker, llama.cpp LLM Service

### Community 121 - "Package Json Eslint Config"
Cohesion: 0.40
Nodes (3): eslint-config-prettier, eslint-plugin-boundaries, typescript-eslint

### Community 123 - "Hono API Server Tsconfig"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 125 - "Background Worker Tsconfig"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 126 - "Cursor Mcp Json"
Cohesion: 0.50
Nodes (3): gymos-openapi, npx, @modelcontextprotocol/server-filesystem

### Community 127 - "Docs Roadmap Md"
Cohesion: 0.50
Nodes (4): Coach Is the Tenant, Roadmap Phase 4 Coach Marketplace, Roadmap Phase 5 Gym Org-Admin, Roadmap Phase 7 Payments

### Community 128 - "Pnpm Workspace Yaml"
Cohesion: 0.50
Nodes (4): Lefthook Pre-commit Gitleaks, image-size CVE Audit Ignores, nanoid 3.3.18 Override, pnpm Workspace

### Community 129 - "AI Nutrition Layer Tsconfig"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 130 - "Coach App UI 130"
Cohesion: 0.67
Nodes (3): adherenceScoreTone(), JourneyAdherenceScore(), TONE

### Community 131 - "Core Domain Logic Tsconfig"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 132 - "Database Persistence 0018 Coach Meal"
Cohesion: 0.50
Nodes (3): "coach_meal_instructions", "public"."coaches", "public"."users"

### Community 133 - "Database Persistence Tsconfig"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 134 - "Domain Modules Tsconfig"
Cohesion: 0.50
Nodes (3): extends, include, ../../tsconfig.base.json

### Community 137 - "Tsconfig Json"
Cohesion: 0.50
Nodes (3): extends, files, ./tsconfig.base.json

### Community 141 - "Architecture Decisions 0009 Form Keyboard"
Cohesion: 0.67
Nodes (3): ADR-0009 Form Keyboard Focus Chain, FormKeyboardRoot, useFocusChain Named Order

### Community 142 - "Feature Specs 142"
Cohesion: 1.00
Nodes (3): gymos-openapi MCP Server, Committed OpenAPI Spec, Hand-Written Client DTOs

### Community 146 - "Coach App UI 146"
Cohesion: 0.67
Nodes (3): devDependencies, @types/react, typescript

### Community 147 - "Coach App UI 147"
Cohesion: 0.67
Nodes (3): peerDependenciesMeta, react-native-webview, optional

### Community 148 - "Coach App UI 148"
Cohesion: 0.67
Nodes (3): scripts, test, typecheck

## Ambiguous Edges - Review These
- `Alignment P1 Re-skin` → `Roadmap Phase 1 Backend Hardening`  [AMBIGUOUS]
  docs/adr/0007-alignment-audit.md · relation: conceptually_related_to

## Knowledge Gaps
- **1151 isolated node(s):** `npx`, `@modelcontextprotocol/server-filesystem`, `name`, `version`, `private` (+1146 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 1322 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Alignment P1 Re-skin` and `Roadmap Phase 1 Backend Hardening`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `libphonenumber-js` connect `Coach App UI New` to `Coach App UI 41`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `expo-router` connect `Coach Mobile App` to `Coach App UI Layout`, `Coach Mobile App Package`, `Coach Mobile App Layout`?**
  _High betweenness centrality (0.044) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Coach Mobile App 22` to `Coach Mobile App Package`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `npx`, `@modelcontextprotocol/server-filesystem`, `name` to the rest of the system?**
  _1151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Nutrition Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.061052631578947365 - nodes in this community are weakly interconnected._
- **Should `Coach App UI` be split into smaller, more focused modules?**
  _Cohesion score 0.05517503805175038 - nodes in this community are weakly interconnected._