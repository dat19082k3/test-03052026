# Stage 1: Prune
FROM node:24-alpine AS base
RUN npm install -g turbo && \
    npm config set fetch-retry-maxtimeout 600000 && \
    npm config set fetch-retry-mintimeout 100000 && \
    npm config set fetch-retries 10

FROM base AS pruner
WORKDIR /app
COPY . .
RUN turbo prune worker --docker --out-dir=out

# Stage 2: Build
FROM base AS builder
WORKDIR /app
COPY --from=pruner /app/out/json/ .
COPY --from=pruner /app/out/package-lock.json ./package-lock.json
RUN --mount=type=cache,target=/root/.npm-worker npm ci
COPY --from=pruner /app/out/full/ .
RUN npm run build --filter=worker...

# Stage 3: Runner
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

# Copy pruned dependencies
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules

# Copy app and internal packages
COPY --from=builder /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=builder /app/apps/worker/dist ./apps/worker/dist
COPY --from=builder /app/packages/db/package.json ./packages/db/package.json
COPY --from=builder /app/packages/db/dist ./packages/db/dist
COPY --from=builder /app/packages/storage/package.json ./packages/storage/package.json
COPY --from=builder /app/packages/storage/dist ./packages/storage/dist

USER nodejs
ENV WORKER_HEALTH_PORT=9090
EXPOSE 9090
CMD ["node", "apps/worker/dist/index.js"]
