# Stage 1: Prune
FROM node:24-alpine AS base
RUN npm install -g turbo && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 100000 && \
    npm config set fetch-retries 10

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune web --docker --out-dir=out

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm-frontend npm ci
COPY --from=pruner /app/out/full/ .
RUN npm run build --filter=web...

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copy pruned frontend build
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/i18n ./apps/frontend/i18n

USER nodejs
EXPOSE 3000
CMD ["node", "apps/frontend/server.js"]
