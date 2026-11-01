# syntax=docker/dockerfile:1
#
# Image frontend (Next.js). Build context: thu muc goc cua repo
#   docker build -f frontend/Dockerfile \
#     --build-arg NEXT_PUBLIC_API_BASE_URL=http://localhost:8081/api/v1 \
#     -t multi-user-system-frontend .
#
# NEXT_PUBLIC_* duoc nhung vao bundle luc build -> doi gia tri thi build lai.

ARG NODE_VERSION=24

FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
FROM base AS build
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:8081/api/v1
ARG NEXT_PUBLIC_SESSION_COOKIE_NAME=sid
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
  NEXT_PUBLIC_SESSION_COOKIE_NAME=${NEXT_PUBLIC_SESSION_COOKIE_NAME}
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend
COPY frontend frontend
RUN npm run build --workspace=frontend && rm -rf frontend/.next/cache

# ---------------------------------------------------------------------------
FROM base AS production-dependencies
COPY package.json package-lock.json ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/
RUN npm ci --workspace=frontend --omit=dev --ignore-scripts \
  && mkdir -p frontend/node_modules \
  && npm cache clean --force

# ---------------------------------------------------------------------------
FROM base AS runtime
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=node:node /app/frontend/node_modules ./frontend/node_modules
COPY --from=build --chown=node:node /app/frontend/package.json /app/frontend/next.config.ts ./frontend/
COPY --from=build --chown=node:node /app/frontend/.next ./frontend/.next
WORKDIR /app/frontend
USER node
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:8080/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
CMD ["node", "../node_modules/next/dist/bin/next", "start", "-H", "0.0.0.0", "-p", "8080"]
