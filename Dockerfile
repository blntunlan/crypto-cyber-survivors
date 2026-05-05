# =============================================================================
# Crypto Survivors — Frontend Dockerfile
#
# Security notes:
#   - No secrets are baked into this image. Sensitive variables
#     (VITE_SUPABASE_ANON_KEY, TWITTER_CLIENT_SECRET, etc.) are injected at
#     runtime by Railway's environment variable system.
#   - Only non-sensitive, build-time configuration is accepted as ARG/ENV.
#   - $NIXPACKS_PATH is not used; standard Node.js paths are used instead.
# =============================================================================

# ---- Build stage ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy dependency manifests first for better layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDependencies needed for the build)
RUN npm ci

# Copy source files
COPY . .

# Build the Vite app.
# Sensitive VITE_* variables are NOT baked in here — they are injected at
# runtime via Railway environment variables and read by the Node server.
# Non-sensitive build metadata can be passed as --build-arg if needed.
RUN npm run build

# ---- Production stage ----
FROM node:20-alpine

WORKDIR /app

# Copy dependency manifests and install only production dependencies
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Copy the compiled static assets from the build stage
COPY --from=builder /app/dist ./dist

# Copy the production server
COPY server.js ./

# Expose the port the server listens on (Railway sets $PORT at runtime)
EXPOSE 3000

# Start the production server.
# PORT, and all VITE_* / secret env vars are provided by Railway at runtime.
CMD ["node", "server.js"]
