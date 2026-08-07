FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo

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
COPY packages/platform/package.json packages/platform/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --ignore-scripts --filter @gymos/web...

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/ui packages/ui
COPY packages/app packages/app
COPY packages/core packages/core
COPY packages/contracts packages/contracts
COPY packages/platform packages/platform
COPY infra/tenants infra/tenants

ENV CI=1
RUN pnpm --filter @gymos/web build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
