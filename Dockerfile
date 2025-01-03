# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Create a non-root user
RUN useradd -r -u 1001 -g root gitlab-cleaner
USER gitlab-cleaner

# Set environment variables
ENV NODE_ENV=production

# Run the application
CMD ["node", "dist/index.js"]
