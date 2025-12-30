# Build stage
FROM node:20-alpine AS builder

# Install build dependencies for native modules (better-sqlite3)
RUN apk add --no-cache \
    sqlite-dev \
    make \
    g++

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Production stage
FROM node:20-alpine

# Install only runtime dependencies (sqlite-libs for better-sqlite3)
RUN apk add --no-cache sqlite-libs

WORKDIR /app

# Copy node_modules from builder stage
COPY --from=builder /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY public ./public
COPY package.json ./

# Set environment variable for production
ENV NODE_ENV=production

# Create directories for outputs and data
RUN mkdir -p /app/output /app/data

# Expose port for web interface
EXPOSE 3000

# Default command (matches docker-compose.yml)
CMD ["node", "src/server-with-tracking.js"]