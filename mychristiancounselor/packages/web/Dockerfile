# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/web/package*.json ./packages/web/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@mychristiancounselor/web --workspace=@mychristiancounselor/shared --include-workspace-root

# Copy source files
COPY nx.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY packages/web ./packages/web
COPY packages/shared ./packages/shared

# Sync NX workspace
RUN NX_DAEMON=false npx nx sync

# Build the application
ARG NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online
ARG NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_SENTRY_DSN=${NEXT_PUBLIC_SENTRY_DSN}
RUN NX_DAEMON=false npx nx build web --configuration=production

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nextjs -u 1001

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/.next/static ./packages/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/packages/web/public ./packages/web/public

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3699

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3699', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "packages/web/server.js"]
