#!/bin/bash
#
# PostgreSQL Database Backup Script for MyChristianCounselor
# Creates timestamped backups with compression
#
# Usage: ./scripts/backup-database.sh [environment]
# Example: ./scripts/backup-database.sh production
#

set -e  # Exit on error
set -u  # Exit on undefined variable

# ==============================================
# Configuration
# ==============================================

# Default environment
ENVIRONMENT="${1:-development}"

# Backup directory
BACKUP_DIR="./backups"
BACKUP_SUBDIR="${BACKUP_DIR}/${ENVIRONMENT}"

# Timestamp for backup file
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_SUBDIR}/mcc_backup_${ENVIRONMENT}_${TIMESTAMP}.sql.gz"

# Retention policy (days)
RETENTION_DAYS=30

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
# Format: postgresql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# ==============================================
# Functions
# ==============================================

create_backup_dir() {
    if [ ! -d "$BACKUP_SUBDIR" ]; then
        mkdir -p "$BACKUP_SUBDIR"
        echo "📁 Created backup directory: $BACKUP_SUBDIR"
    fi
}

perform_backup() {
    echo "🔄 Starting backup for environment: $ENVIRONMENT"
    echo "📊 Database: $DB_NAME on $DB_HOST:$DB_PORT"
    echo "📦 Backup file: $BACKUP_FILE"

    # Set password for pg_dump
    export PGPASSWORD="$DB_PASS"

    # Perform backup with compression
    pg_dump \
        -h "$DB_HOST" \
        -p "$DB_PORT" \
        -U "$DB_USER" \
        -d "$DB_NAME" \
        --clean \
        --if-exists \
        --no-owner \
        --no-acl \
        --verbose \
        | gzip > "$BACKUP_FILE"

    # Unset password
    unset PGPASSWORD

    # Check if backup was successful
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "✅ Backup completed successfully"
        echo "📏 Backup size: $BACKUP_SIZE"
        echo "📁 Location: $BACKUP_FILE"
    else
        echo "❌ Backup failed"
        exit 1
    fi
}

cleanup_old_backups() {
    echo "🧹 Cleaning up backups older than $RETENTION_DAYS days..."

    # Find and delete old backups
    OLD_BACKUPS=$(find "$BACKUP_SUBDIR" -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS)

    if [ -n "$OLD_BACKUPS" ]; then
        echo "$OLD_BACKUPS" | while read -r file; do
            echo "🗑️  Deleting: $file"
            rm "$file"
        done
        echo "✅ Cleanup completed"
    else
        echo "✅ No old backups to clean up"
    fi
}

list_backups() {
    echo ""
    echo "📋 Available backups for $ENVIRONMENT:"
    echo "----------------------------------------"

    if [ -d "$BACKUP_SUBDIR" ]; then
        ls -lh "$BACKUP_SUBDIR"/*.sql.gz 2>/dev/null | awk '{print $9, "(" $5 ")"}'  || echo "No backups found"
    else
        echo "No backup directory found"
    fi
}

# ==============================================
# Main execution
# ==============================================

echo "╔════════════════════════════════════════╗"
echo "║   MyChristianCounselor DB Backup       ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if pg_dump is available
if ! command -v pg_dump &> /dev/null; then
    echo "❌ Error: pg_dump not found"
    echo "Please install PostgreSQL client tools"
    exit 1
fi

# Create backup directory
create_backup_dir

# Perform backup
perform_backup

# Cleanup old backups
cleanup_old_backups

# List available backups
list_backups

echo ""
echo "✨ Backup process completed successfully!"
echo ""
