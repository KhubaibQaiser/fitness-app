FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /repo

COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json apps/web/
COPY packages/ui/package.json packages/ui/
COPY packages/app/package.json packages/app/
COPY packages/core/package.json packages/core/
COPY packages/contracts/package.json packages/contracts/
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @gymos/web...

COPY tsconfig.base.json ./
COPY apps/web apps/web
COPY packages/ui packages/ui
COPY packages/app packages/app
COPY packages/core packages/core
COPY packages/contracts packages/contracts
COPY infra/tenants infra/tenants

RUN cd apps/web && ./node_modules/.bin/next build || ../../node_modules/.bin/next build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static ./apps/web/.next/static
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
