# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/api/package*.json ./packages/api/
COPY packages/shared/package*.json ./packages/shared/

# Install dependencies
RUN npm ci --workspace=@mychristiancounselor/api --workspace=@mychristiancounselor/shared --include-workspace-root

# Copy source files
COPY nx.json ./
COPY tsconfig.json ./
COPY tsconfig.base.json ./
COPY packages/api ./packages/api
COPY packages/shared ./packages/shared

# Generate Prisma Client
RUN npm exec prisma generate -- --schema=./packages/api/prisma/schema.prisma

# Sync NX workspace
RUN NX_DAEMON=false npx nx sync

# Build the application
RUN NX_DAEMON=false npx nx build api --configuration=production

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nestjs -u 1001

# Copy built application and dependencies
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/dist ./
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/prisma ./prisma
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules

# Copy built shared package to node_modules
COPY --from=builder --chown=nestjs:nodejs /app/packages/shared ./node_modules/@mychristiancounselor/shared

# Copy content JSON files to root (where main.js __dirname resolves to)
COPY --from=builder --chown=nestjs:nodejs /app/packages/api/src/content/*.json ./

# Create logs directory
RUN mkdir -p /app/logs && chown -R nestjs:nodejs /app/logs

# Switch to non-root user
USER nestjs

# Expose port
EXPOSE 3697

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3697/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application with dumb-init
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "main.js"]
