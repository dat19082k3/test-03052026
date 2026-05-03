FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json turbo.json ./
COPY apps/frontend/package.json ./apps/frontend/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json
COPY packages/typescript-config/package.json ./packages/typescript-config/package.json
COPY packages/eslint-config/package.json ./packages/eslint-config/package.json

RUN npm ci

FROM deps AS builder
WORKDIR /app
COPY apps/frontend ./apps/frontend
COPY packages ./packages
RUN npm run build -w web

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0

RUN addgroup -S nodejs && adduser -S nodejs -G nodejs

COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/standalone ./
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/.next/static ./apps/frontend/.next/static
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/public ./apps/frontend/public
COPY --from=builder --chown=nodejs:nodejs /app/apps/frontend/i18n ./apps/frontend/i18n

USER nodejs
EXPOSE 3000

CMD ["node", "apps/frontend/server.js"]
