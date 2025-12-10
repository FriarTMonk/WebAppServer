#!/bin/bash
# Create manual database backup snapshot
# Usage: ./backup-database.sh [optional-description]

set -e

# Configuration
DB_INSTANCE="mychristiancounselor"
REGION="us-east-2"

# Generate snapshot ID with timestamp
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
DESCRIPTION=${1:-manual}
SNAPSHOT_ID="${DB_INSTANCE}-${DESCRIPTION}-${TIMESTAMP}"

echo "Creating manual snapshot: $SNAPSHOT_ID"

# Create snapshot
aws rds create-db-snapshot \
  --db-instance-identifier "$DB_INSTANCE" \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --region "$REGION"

echo "✅ Snapshot creation initiated: $SNAPSHOT_ID"
echo "Check status with: ./list-backups.sh"
