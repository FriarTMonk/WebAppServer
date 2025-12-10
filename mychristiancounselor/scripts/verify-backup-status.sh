#!/bin/bash
# Verify backup configuration is correct
# Usage: ./verify-backup-status.sh

set -e

DB_INSTANCE="mychristiancounselor"
REGION="us-east-2"

echo "═══════════════════════════════════════════════════════════"
echo "🔍 BACKUP CONFIGURATION CHECK"
echo "═══════════════════════════════════════════════════════════"

# Get backup configuration
BACKUP_INFO=$(aws rds describe-db-instances \
  --db-instance-identifier "$DB_INSTANCE" \
  --region "$REGION" \
  --query 'DBInstances[0].{BackupRetention:BackupRetentionPeriod,BackupWindow:PreferredBackupWindow,LatestBackup:LatestRestorableTime,Status:DBInstanceStatus}' \
  --output json)

echo "$BACKUP_INFO" | python3 -c "
import json, sys
data = json.load(sys.stdin)

print(f\"Database Instance: $DB_INSTANCE\")
print(f\"Status: {data['Status']}\")
print(f\"Backup Retention: {data['BackupRetention']} days\")
print(f\"Backup Window: {data['BackupWindow']} UTC\")
print(f\"Latest Restorable Time: {data['LatestBackup']}\")
print()

# Validation
errors = []
warnings = []

if data['BackupRetention'] == 0:
    errors.append('❌ Backups are DISABLED!')
elif data['BackupRetention'] < 7:
    warnings.append(f\"⚠️  Backup retention is only {data['BackupRetention']} days (recommended: 7+)\")
else:
    print(f\"✅ Backup retention: {data['BackupRetention']} days (good)\")

if data['Status'] != 'available':
    warnings.append(f\"⚠️  Database status: {data['Status']} (not available)\")
else:
    print('✅ Database is available')

if errors:
    print()
    print('ERRORS:')
    for error in errors:
        print(error)
    sys.exit(1)

if warnings:
    print()
    print('WARNINGS:')
    for warning in warnings:
        print(warning)
else:
    print()
    print('✅ Backup configuration looks good!')
"

# Count recent backups
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "📊 RECENT BACKUP HISTORY"
echo "═══════════════════════════════════════════════════════════"

AUTOMATED_COUNT=$(aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE" \
  --snapshot-type automated \
  --region "$REGION" \
  --query 'length(DBSnapshots)' \
  --output text)

MANUAL_COUNT=$(aws rds describe-db-snapshots \
  --db-instance-identifier "$DB_INSTANCE" \
  --snapshot-type manual \
  --region "$REGION" \
  --query 'length(DBSnapshots)' \
  --output text)

echo "Automated backups: $AUTOMATED_COUNT"
echo "Manual backups: $MANUAL_COUNT"
echo ""
echo "✅ Backup status check complete!"
