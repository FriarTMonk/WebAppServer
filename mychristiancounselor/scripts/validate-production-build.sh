#!/bin/bash

# Production Build Validation Script
# Prevents deployment of builds with localhost URLs or development configurations

set -e

echo "🔍 Validating production build..."
echo ""

ERRORS=0

# =============================================
# Check 1: Web build directory exists
# =============================================
echo "Checking web build..."
if [ ! -d "packages/web/.next" ]; then
  echo "❌ Error: packages/web/.next directory not found."
  echo "   Run: npx nx build web"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Web build directory exists"
fi

# =============================================
# Check 2: Search for localhost URLs in Web build
# =============================================
echo "Checking for localhost URLs in web build..."

# Check for various localhost patterns (excluding generic http://localhost which appears in webpack deps)
LOCALHOST_PATTERNS=(
  "localhost:3697"
  "localhost:3699"
  "127.0.0.1:3697"
  "127.0.0.1:3699"
)

for pattern in "${LOCALHOST_PATTERNS[@]}"; do
  FOUND=$(grep -r "$pattern" packages/web/.next/static 2>/dev/null || true)
  if [ -n "$FOUND" ]; then
    echo "❌ ERROR: Found '$pattern' in web build!"
    echo "   Location: packages/web/.next/static"
    ERRORS=$((ERRORS + 1))
  fi
done

if [ $ERRORS -eq 0 ]; then
  echo "✅ No localhost URLs found in web build"
fi

# =============================================
# Check 3: Verify Web .env.production exists and is correct
# =============================================
echo "Checking web .env.production..."
if [ ! -f "packages/web/.env.production" ]; then
  echo "❌ Error: packages/web/.env.production not found"
  ERRORS=$((ERRORS + 1))
else
  # Check that it contains production URL
  if grep -q "https://api.mychristiancounselor.online" packages/web/.env.production; then
    echo "✅ Web .env.production contains production API URL"
  else
    echo "❌ Error: packages/web/.env.production does not contain production API URL"
    echo "   Expected: NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online"
    ERRORS=$((ERRORS + 1))
  fi
fi

# =============================================
# Check 4: API build exists
# =============================================
echo "Checking API build..."
if [ ! -f "packages/api/dist/main.js" ]; then
  echo "❌ Error: packages/api/dist/main.js not found."
  echo "   Run: npx nx build api"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ API build exists"
fi

# =============================================
# Check 5: Verify API .env doesn't have localhost (warning only)
# =============================================
echo "Checking API environment configuration..."
if [ -f "packages/api/.env" ]; then
  if grep -q "localhost" packages/api/.env; then
    echo "⚠️  WARNING: packages/api/.env contains 'localhost'"
    echo "   This file should not be used in production"
    echo "   Ensure Lightsail environment variables are set correctly"
  else
    echo "✅ API .env does not contain localhost"
  fi
fi

# =============================================
# Check 6: Verify Docker files exist
# =============================================
echo "Checking Docker files..."
if [ ! -f "Dockerfile.api-prebuilt" ]; then
  echo "❌ Error: Dockerfile.api-prebuilt not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Dockerfile.api-prebuilt exists"
fi

if [ ! -f "Dockerfile.web-prebuilt" ]; then
  echo "❌ Error: Dockerfile.web-prebuilt not found"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Dockerfile.web-prebuilt exists"
fi

# =============================================
# Check 7: Verify shared package is built
# =============================================
echo "Checking shared package..."
if [ ! -d "packages/shared/dist" ]; then
  echo "❌ Error: packages/shared/dist not found"
  echo "   Run: npx nx build shared"
  ERRORS=$((ERRORS + 1))
else
  echo "✅ Shared package is built"
fi

echo ""
echo "=========================================="

if [ $ERRORS -eq 0 ]; then
  echo "✅ Production build validation PASSED!"
  echo ""
  echo "Ready to deploy with:"
  echo "  bash scripts/deploy-soft-launch.sh"
  echo ""
  exit 0
else
  echo "❌ Production build validation FAILED with $ERRORS error(s)"
  echo ""
  echo "To fix:"
  echo ""
  echo "1. Ensure packages/web/.env.production exists with:"
  echo "   NEXT_PUBLIC_API_URL=https://api.mychristiancounselor.online"
  echo ""
  echo "2. Clear cache and rebuild:"
  echo "   rm -rf packages/web/.next packages/api/dist packages/shared/dist"
  echo "   npx nx build shared"
  echo "   npx nx build api"
  echo "   NODE_ENV=production npx nx build web --skip-nx-cache"
  echo ""
  echo "3. Run validation again:"
  echo "   bash scripts/validate-production-build.sh"
  echo ""
  exit 1
fi
