#!/bin/bash
#
# PostgreSQL Database Restore Script for MyChristianCounselor
# Restores database from backup file
#
# Usage: ./scripts/restore-database.sh <backup_file> [environment]
# Example: ./scripts/restore-database.sh backups/production/mcc_backup_production_20251201_120000.sql.gz production
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# ==============================================
# Configuration
# ==============================================

# Check if backup file is provided
if [ $# -lt 1 ]; then
    echo "❌ Error: Backup file not specified"
    echo "Usage: $0 <backup_file> [environment]"
    echo "Example: $0 backups/production/mcc_backup_production_20251201_120000.sql.gz production"
    exit 1
fi

BACKUP_FILE="$1"
ENVIRONMENT="${2:-development}"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Error: Backup file not found: $BACKUP_FILE"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Database connection details
if [ -z "${DATABASE_URL:-}" ]; then
    echo "❌ Error: DATABASE_URL not set"
    echo "Please set DATABASE_URL in .env file or environment variables"
    exit 1
fi

# Parse DATABASE_URL
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# ==============================================
# Functions
# ==============================================

confirm_restore() {
    echo "⚠️  WARNING: This will replace all data in the database!"
    echo "📊 Database: $DB_NAME on $DB_HOST:$DB_PORT"
    echo "📦 Backup file: $BACKUP_FILE"
    echo ""
    read -p "Are you sure you want to continue? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Restore cancelled"
        exit 0
    fi
}

create_backup_before_restore() {
    echo "🔄 Creating safety backup before restore..."

    SAFETY_BACKUP_DIR="./backups/pre-restore"
    mkdir -p "$SAFETY_BACKUP_DIR"

    TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
    SAFETY_BACKUP_FILE="${SAFETY_BACKUP_DIR}/pre_restore_${TIMESTAMP}.sql.gz"

    export PGPASSWORD="$DB_PASS"

    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        | gzip > "$SAFETY_BACKUP_FILE"

    unset PGPASSWORD

    echo "✅ Safety backup created: $SAFETY_BACKUP_FILE"
}

perform_restore() {
    echo "🔄 Starting restore process..."
    echo "📊 Database: $DB_NAME"
    echo "📦 Backup file: $BACKUP_FILE"

    # Set password for psql
    export PGPASSWORD="$DB_PASS"

    # Restore from compressed backup
    gunzip -c "$BACKUP_FILE" | psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --single-transaction

    # Unset password
    unset PGPASSWORD

    echo "✅ Restore completed successfully"
}

verify_restore() {
    echo "🔍 Verifying restore..."

    export PGPASSWORD="$DB_PASS"

    # Check if database is accessible
    TABLE_COUNT=$(psql \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")

    unset PGPASSWORD

    echo "✅ Verification complete"
    echo "📊 Number of tables: $(echo $TABLE_COUNT | tr -d ' ')"
}

# ==============================================
# Main execution
# ==============================================

echo "╔════════════════════════════════════════╗"
echo "║   MyChristianCounselor DB Restore      ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if psql is available
if ! command -v psql &> /dev/null; then
    echo "❌ Error: psql not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Confirm restore
confirm_restore

# Create safety backup
create_backup_before_restore

# Perform restore
perform_restore

# Verify restore
verify_restore

echo ""
echo "✨ Database restore completed successfully!"
echo "⚠️  Don't forget to run database migrations if needed:"
echo "   npx prisma migrate deploy"
echo ""
