# Build stage
FROM node:23-slim AS builder

WORKDIR /app

# Install build dependencies for native modules (better-sqlite3)
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --production

# Production stage
FROM node:23-slim

# Install fonts and dependencies for ImageMagick 7
RUN apt-get update && apt-get install -y \
    fonts-liberation \
    fonts-dejavu-core \
    fontconfig \
    wget \
    && rm -rf /var/lib/apt/lists/*

# Install ImageMagick 7 from official binary
RUN wget https://imagemagick.org/archive/binaries/magick -O /usr/local/bin/magick \
    && chmod +x /usr/local/bin/magick \
    && ln -s /usr/local/bin/magick /usr/local/bin/convert \
    && ln -s /usr/local/bin/magick /usr/local/bin/identify

# Cache fonts
RUN fc-cache -f -v

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