FROM node:20

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies needed for build)
RUN npm ci

# Copy the rest of the application files
COPY . .

# Build the client and backend server bundle
RUN npm run build

# Prune dev dependencies to keep image size reasonable
RUN npm prune --omit=dev

# Set runtime environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["node", "dist/server.cjs"]
