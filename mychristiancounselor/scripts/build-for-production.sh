#!/bin/bash

# Production Build Script
# Builds all packages for production deployment
# Usage: bash scripts/build-for-production.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  MyChristianCounselor${NC}"
echo -e "${BLUE}  Production Build Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command_exists node; then
    echo -e "${RED}ERROR: Node.js is not installed${NC}"
    exit 1
fi

if ! command_exists npx; then
    echo -e "${RED}ERROR: npx is not available${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Node.js is installed: $(node --version)${NC}"
echo -e "${GREEN}✅ npm is installed: $(npm --version)${NC}"
echo ""

# Check if .env.production exists
echo -e "${YELLOW}Checking production environment configuration...${NC}"
if [ ! -f "packages/web/.env.production" ]; then
    echo -e "${RED}ERROR: packages/web/.env.production not found${NC}"
    echo ""
    echo "Creating packages/web/.env.production with production settings..."
    cat > packages/web/.env.production <<EOF
NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online
NEXT_PUBLIC_SENTRY_DSN=https://450be74fd3d263728ebd3656fd772438@o4510468923326464.ingest.us.sentry.io/4510468927062016
EOF
    echo -e "${GREEN}✅ Created packages/web/.env.production${NC}"
else
    echo -e "${GREEN}✅ packages/web/.env.production exists${NC}"

    # Validate it contains production URL
    if grep -q "localhost" packages/web/.env.production; then
        echo -e "${RED}ERROR: packages/web/.env.production contains 'localhost'${NC}"
        echo "Please update it with production URLs"
        exit 1
    fi
fi
echo ""

# Confirm build
echo -e "${YELLOW}This will:${NC}"
echo "  1. Clean all previous builds"
echo "  2. Build shared package"
echo "  3. Build API package"
echo "  4. Build Web package (production mode)"
echo "  5. Run production validation"
echo ""
read -p "Continue with production build? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Build cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 1: Clean Previous Builds${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Cleaning build artifacts...${NC}"
rm -rf packages/shared/dist
rm -rf packages/api/dist
rm -rf packages/web/.next
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 2: Build Shared Package${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Building shared package...${NC}"
npx nx build shared

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Shared build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Shared package built successfully${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 3: Build API Package${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Building API package...${NC}"
npx nx build api

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: API build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ API package built successfully${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 4: Build Web Package${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}Building web package in production mode...${NC}"
echo -e "${YELLOW}Using .env.production configuration${NC}"

# Build with production environment
NODE_ENV=production npx nx build web --skip-nx-cache

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Web build failed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Web package built successfully${NC}"
echo ""

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Step 5: Validate Production Build${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

bash scripts/validate-production-build.sh

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Production build validation failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Production Build Complete! 🎉${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo ""
echo "1. ${GREEN}Review the builds:${NC}"
echo "   - Shared: packages/shared/dist/"
echo "   - API: packages/api/dist/"
echo "   - Web: packages/web/.next/"
echo ""
echo "2. ${GREEN}Deploy to production:${NC}"
echo "   bash scripts/deploy-soft-launch.sh"
echo ""
echo "3. ${GREEN}Or run database migration first (if needed):${NC}"
echo "   cd packages/api"
echo "   npx prisma migrate deploy"
echo ""
