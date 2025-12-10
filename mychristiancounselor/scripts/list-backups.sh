#!/bin/bash
# List all database backups (automated and manual)
# Usage: ./list-backups.sh

set -e

DB_INSTANCE="mychristiancounselor"
REGION="us-east-2"

echo "═══════════════════════════════════════════════════════════"
echo "📅 AUTOMATED BACKUPS (7-day retention)"
echo "═══════════════════════════════════════════════════════════"

aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE" \
  --snapshot-type automated \
  --region "$REGION" \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status,SizeGB:AllocatedStorage}' \
  --output table

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📦 MANUAL SNAPSHOTS (never expire)"
echo "═══════════════════════════════════════════════════════════"

aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE" \
  --snapshot-type manual \
  --region "$REGION" \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Status:Status,SizeGB:AllocatedStorage}' \
  --output table

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🔄 POINT-IN-TIME RECOVERY INFO"
echo "═══════════════════════════════════════════════════════════"

aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE" \
  --region "$REGION" \
  --query 'DBInstances[0].{LatestRestorableTime:LatestRestorableTime,EarliestRestorableTime:EarliestRestorableTime}' \
  --output table

echo ""
echo "💡 Can restore to any second between earliest and latest time above"
