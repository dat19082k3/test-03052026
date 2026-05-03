FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/backend/package.json ./apps/backend/package.json
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY apps/worker/package.json ./apps/worker/package.json
COPY packages/db/package.json ./packages/db/package.json
COPY packages/storage/package.json ./packages/storage/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY packages/ui/package.json ./packages/ui/package.json

RUN npm ci

FROM deps AS builder
COPY apps/backend ./apps/backend
COPY packages ./packages
RUN npm run build -w backend

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --chown=nodejs:nodejs package.json package-lock.json ./
COPY --chown=nodejs:nodejs apps/backend/package.json ./apps/backend/package.json
COPY --chown=nodejs:nodejs apps/frontend/package.json ./apps/frontend/package.json
COPY --chown=nodejs:nodejs apps/worker/package.json ./apps/worker/package.json
COPY --chown=nodejs:nodejs packages/db/package.json ./packages/db/package.json
COPY --chown=nodejs:nodejs packages/storage/package.json ./packages/storage/package.json
COPY --chown=nodejs:nodejs packages/types/package.json ./packages/types/package.json
COPY --chown=nodejs:nodejs packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY --chown=nodejs:nodejs packages/eslint-config/package.json ./packages/eslint-config/package.json
COPY --chown=nodejs:nodejs packages/ui/package.json ./packages/ui/package.json
RUN npm ci --omit=dev --workspace backend --workspace @repo/db --workspace @repo/types --workspace @repo/storage --include-workspace-root=false
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/package.json ./apps/backend/package.json
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/migrations ./apps/backend/migrations
COPY --from=builder --chown=nodejs:nodejs /app/apps/backend/seeders ./apps/backend/seeders
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/db/dist ./packages/db/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/package.json ./packages/types/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/types/dist ./packages/types/dist
COPY --from=builder --chown=nodejs:nodejs /app/packages/storage/package.json ./packages/storage/package.json
COPY --from=builder --chown=nodejs:nodejs /app/packages/storage/dist ./packages/storage/dist

USER nodejs
EXPOSE 4000

CMD ["node", "apps/backend/dist/server.js"]
