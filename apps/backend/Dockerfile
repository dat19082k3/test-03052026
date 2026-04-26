FROM node:20-alpine AS base
WORKDIR /app
COPY package.json package-lock.json turbo.json ./
COPY patches* ./patches/ 
# Ignore error if patches doesn't exist
COPY apps/backend/package.json ./apps/backend/
COPY packages/ ./packages/
COPY . .

RUN npm install
RUN npm run build -w backend

EXPOSE 4000
CMD ["npm", "run", "start", "-w", "backend"]
