# syntax=docker/dockerfile:1

# ---------- deps: install workspace packages ----------
FROM node:20-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --no-audit --no-fund

# ---------- build: prisma + backend + frontend ----------
FROM deps AS build
COPY backend ./backend
COPY frontend ./frontend
COPY assets ./assets

WORKDIR /app/backend
RUN npx prisma generate
RUN npm run build

WORKDIR /app/frontend
RUN npm run build

# ---------- runtime ----------
FROM node:20-slim AS runtime
ENV NODE_ENV=production \
    PORT=1081 \
    CLUSTER_WORKERS=2

# Prisma 引擎与健康检查
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# production node_modules
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/
RUN npm ci --omit=dev --no-audit --no-fund

# generated Prisma client from build stage
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma

# app artifacts
COPY --from=build /app/backend/dist ./backend/dist
COPY --from=build /app/backend/prisma ./backend/prisma
COPY --from=build /app/frontend/dist ./frontend/dist
COPY --from=build /app/assets ./assets

# writable dirs for SQLite / uploads
RUN mkdir -p /app/backend/uploads \
    && chown -R node:node /app

USER node
WORKDIR /app/backend
EXPOSE 1081
CMD ["node", "dist/src/main.js"]
