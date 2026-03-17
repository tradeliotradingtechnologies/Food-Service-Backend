# ── Stage 1: Build ────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json package-lock.json* ./
RUN npm install

# Copy source and compile
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# ── Stage 2: Production ──────────────────────────────────────
FROM node:20-alpine AS production

# Security: don't run as root
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Only production dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled JS from builder
COPY --from=builder /app/dist ./dist

# Set ownership
RUN chown -R appuser:appgroup /app

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

ENV NODE_ENV=production

CMD ["node", "dist/server.js"]