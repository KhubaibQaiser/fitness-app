Copy everything below this line into Claude Project instructions.

---

Read this before any plan or answer. Do not skip it.

What this product is
- GymOS is a coach-only coaching platform. There is no client or member app yet.
- One feature codebase. Two deployments: Next.js web and Expo iOS/Android.
- Expo web is out of scope. Web is Next.js plus react-native-web.

The one rule
- Apps are empty shells. Screens, hooks, and navigation live once in packages.
- If a change would be done twice, once in web and once in mobile, the design is wrong.
- Default: adapt existing code. Do not rewrite. Do not fork per customer.

Where code goes
- packages/app: shared screens, Solito navigation, TanStack Query hooks
- packages/ui: Tamagui components and tokens. No second theme system.
- packages/platform: web vs native façades (storage, theme, safe area, download)
- packages/core: pure TypeScript. Nutrition, money, units, RBAC. Zero React.
- packages/modules: backend domains. Public index.ts only. No cross-module table reads.
- packages/contracts: API types and client from OpenAPI. Do not hand-write drifting DTOs.
- packages/db: Drizzle schema and migrations
- packages/ai: meal names and notes only. Never calories or macros.
- apps/web and apps/mobile: thin routes that import screens. Nothing else.
- apps/api and apps/worker: HTTP and jobs. They wire modules. They are not the UI.

Cross-platform
- Feature UI is React Native primitives through Tamagui. No raw div. No Tailwind className in features.
- Solito owns Link and useRouter inside packages/app. Next and Expo Router only mount screens.
- Platform-native code is allowed only in packages/ui or packages/platform via .native / .ios files.
- Never Platform.OS or localStorage inside packages/app.
- Never raw fetch in features. Use the contracts API client.
- Web auth: HttpOnly cookies. Mobile auth: SecureStore plus Bearer. Same session model.

Production invariants
- No process-global user or tenant cache. Principal is per request.
- Tenant scope on every query: org_id, outlet_id, or assignment.
- Server can(actor, action, resource) is authorization truth. Client role checks are display only.
- Money is bigint minor units plus currency. No floats. No default currency.
- Nutrition has four layers. Physiology and solver never learn. LLM never emits a number. Plans stay draft until a coach publishes.
- Never if (tenant === "..."). Config or data only.
- Read the actual file before claiming what it does. ADRs in docs/adr/ are current law. Do not silently reverse them.

Before you answer or plan, ask
- Which package does this belong in?
- Would this same work be needed on both web and mobile? If yes, put it in a package.
- Is this pixels only, or data / auth / routing / nutrition / tenancy?
- Does a second tenant, a second API instance, and a second concurrent user still work?
- Does this introduce a banned pattern?
- Does an existing ADR already decide this?

Locked
- This repo is coach-only.
- Root CLAUDE.md wins on conflict with architecture v4.
- Do not edit apps/web/CLAUDE.md.
- Figma is out of scope until reopened.
