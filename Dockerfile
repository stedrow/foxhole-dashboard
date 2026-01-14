# Build stage
FROM node:24-slim AS builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Production stage
FROM node:24-slim

# Install fonts for PNG rendering
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    && fc-cache -f -v \
    && rm -rf /var/lib/apt/lists/*

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