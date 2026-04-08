# ── Stage 1: build the React/Vite client ─────────────────────────────────────
FROM node:20-alpine AS web-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# ── Stage 2: compile the TypeScript server ────────────────────────────────────
FROM node:20-bullseye-slim AS api-builder

WORKDIR /app/server
COPY server/package*.json ./
COPY server/tsconfig.json ./
RUN npm ci
COPY server/src ./src
RUN npm run build

# ── Stage 3: production runner ────────────────────────────────────────────────
FROM node:20-bullseye-slim AS runner

WORKDIR /app

# Install only production dependencies in the runner image
# so native binaries are compiled for the correct OS/arch
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy compiled server output and client static assets
COPY --from=api-builder /app/server/dist ./dist
COPY --from=web-builder /app/client/dist ./dist/client

# Copy runtime supervisor
COPY server/start.js ./start.js

ENV NODE_ENV=production

EXPOSE 3000

CMD ["node", "/app/start.js"]
