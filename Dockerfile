# -----------------
# Builder Stage
# -----------------
FROM node:20 AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Prune development dependencies so only production packages remain in node_modules
RUN npm prune --omit=dev

# -----------------
# Production Stage
# -----------------
FROM node:20-slim

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_PATH=/data/ambers_healthcare.db

WORKDIR /app

# Copy built app and production dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/ambers_healthcare.db ./ambers_healthcare.db

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]
