# Clocky – React 19 + Express clock studio
# Multi-stage: build the Vite bundle + bundled server, then run on slim Node.
# Base image pinned per house rules (no :latest).
FROM node:22-bookworm-slim AS builder

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund

# Build production assets + bundled server
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

# dist/server.cjs bundles local code only (--packages=external), so the
# production node_modules tree must ship with the image.
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Internal port 3000 (house convention). Reached by Traefik as http://clocky:3000.
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=5 \
  CMD curl -fsS http://localhost:3000/api/community-clocks >/dev/null || exit 1

CMD ["node", "dist/server.cjs"]
