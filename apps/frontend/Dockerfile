FROM node:20-alpine AS base
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build -w web

EXPOSE 3000
CMD ["npm", "run", "start", "-w", "web"]
