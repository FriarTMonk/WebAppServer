#!/bin/bash
set -e

echo "🔍 Pre-migration checks..."

# Check Prisma schema is valid
echo "Validating Prisma schema..."
cd packages/api
npx prisma validate
echo "✅ Prisma schema is valid"

# Check for pending migrations
echo "Checking for pending migrations..."
PENDING=$(npx prisma migrate status | grep "pending" || echo "")
if [ -n "$PENDING" ]; then
  echo "✅ Found pending migrations:"
  npx prisma migrate status
else
  echo "ℹ️  No pending migrations"
fi

# Check database connectivity
echo "Testing database connection..."
if psql $DATABASE_URL -c "SELECT 1;" > /dev/null 2>&1; then
  echo "✅ Database connection successful"
else
  echo "❌ Database connection failed"
  exit 1
fi

# Check all tests pass
echo "Running test suite..."
npm run test
echo "✅ All tests passing"

# Check TypeScript compilation
echo "Checking TypeScript compilation..."
npx tsc --noEmit
echo "✅ TypeScript compilation successful"

# Verify backup confirmation
echo ""
echo "⚠️  CRITICAL: Ensure you have created a backup before proceeding!"
echo "   - RDS Snapshot: aws rds create-db-snapshot --db-instance-identifier <instance> --db-snapshot-identifier pre-migration-\$(date +%Y%m%d-%H%M%S)"
echo "   - Or pg_dump: pg_dump \$DATABASE_URL > backup-\$(date +%Y%m%d-%H%M%S).sql"
echo ""
read -p "Have you created and verified a backup? (yes/no): " backup_confirm
if [ "$backup_confirm" != "yes" ]; then
  echo "❌ Please create a backup first"
  exit 1
fi

echo ""
echo "✅ Pre-migration checks complete!"
echo "Ready to run: npx prisma migrate deploy"
