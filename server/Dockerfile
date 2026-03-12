# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY src ./src

# Build TypeScript
RUN npm run build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install production dependencies only
COPY package*.json ./
RUN npm ci --only=production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create data directory for FAISS index
RUN mkdir -p /app/data/faiss-index

# Create logs directory
RUN mkdir -p /app/logs

# Set environment variables
ENV NODE_ENV=production

# Expose API port
EXPOSE 3000

# Default command (can be overridden in docker-compose)
CMD ["node", "dist/api/server.js"]
