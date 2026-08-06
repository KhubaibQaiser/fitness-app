# One image for api AND worker — same artifact, different entrypoint
# (spec §5.1 carve-out #2). PROCESS=worker switches the entrypoint.
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

# Install with the full workspace context (source-exports monorepo, tsx runtime).
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
# Every workspace package.json must be present for --frozen-lockfile (lockfile importers).
COPY apps/api/package.json apps/api/
COPY apps/worker/package.json apps/worker/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/db/package.json packages/db/
COPY packages/ai/package.json packages/ai/
COPY packages/modules/package.json packages/modules/
COPY packages/contracts/package.json packages/contracts/
COPY packages/ui/package.json packages/ui/
COPY packages/app/package.json packages/app/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts \
      --filter @gymos/api... --filter @gymos/worker...

COPY tsconfig.base.json ./
COPY apps/api apps/api
COPY apps/worker apps/worker
COPY packages/core packages/core
COPY packages/db packages/db
COPY packages/ai packages/ai
COPY packages/modules packages/modules
COPY packages/contracts packages/contracts
COPY infra/tenants infra/tenants

ENV NODE_ENV=production
EXPOSE 8080

# tsx runtime keeps the single-artifact guarantee simple at pilot scale;
# a compiled dist is a Stage-0 optimization.
CMD ["sh", "-c", "if [ \"$PROCESS\" = worker ]; then exec ./node_modules/.bin/tsx apps/worker/src/index.ts; else exec ./node_modules/.bin/tsx apps/api/src/index.ts; fi"]
