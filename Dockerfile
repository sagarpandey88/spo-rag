FROM node:20-bullseye AS builder

WORKDIR /app

# Build client
COPY client/package*.json ./client/
RUN cd client && npm ci
COPY client/ ./client/
RUN cd client && npm run build

# Build server
COPY server/package*.json ./server/
COPY server/tsconfig.json ./server/
RUN cd server && npm ci
COPY server/ ./server/
RUN cd server && npm run build

FROM node:20-bullseye
WORKDIR /app

# Install production deps for server
COPY server/package*.json ./
RUN npm ci --production

# Copy server dist and built client into server dist/client
COPY --from=builder /app/server/dist ./dist
COPY --from=builder /app/client/dist ./dist/client

# Ensure logs and certs directories exist
RUN mkdir -p /app/logs /app/certs

ENV NODE_ENV=production

EXPOSE 3000

# Use server-provided entrypoint to start API + crawler
COPY server/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

CMD ["/usr/local/bin/docker-entrypoint.sh"]
