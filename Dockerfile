FROM node:20

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the client and backend server bundle
RUN npm run build

# Prune dev dependencies to keep image size reasonable while keeping built assets
RUN npm prune --omit=dev

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]

