# syntax=docker/dockerfile:1
#
# Image backend (NestJS + Prisma). Build context: thu muc goc cua repo
#   docker build -f backend/Dockerfile -t multi-user-system-backend .
#
# Target:
#   build    - du dependency + ma nguon da build; dung de chay migration/seed.
#   runtime  - (mac dinh) chi dependency production + dist, chay bang user node.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app

# ---------------------------------------------------------------------------
FROM base AS build
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# postinstall cua backend chay `prisma generate` -> can schema truoc khi cai.
COPY backend/prisma backend/prisma
COPY backend/prisma.config.ts backend/
RUN npm ci --workspace=backend
COPY backend backend
RUN npm run build --workspace=backend

# ---------------------------------------------------------------------------
FROM base AS production-dependencies
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
# --ignore-scripts: Prisma Client da duoc generate va bien dich vao dist o
# stage build; bcrypt dung prebuild co san trong package.
RUN npm ci --workspace=backend --omit=dev --ignore-scripts \
  && mkdir -p backend/node_modules \
  && npm cache clean --force

# ---------------------------------------------------------------------------
FROM base AS runtime
ENV PORT=8081
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/backend/node_modules ./backend/node_modules
COPY --from=build --chown=node:node /app/backend/package.json ./backend/
COPY --from=build --chown=node:node /app/backend/dist ./backend/dist
WORKDIR /app/backend
USER node
EXPOSE 8081
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "dist/main.js"]
