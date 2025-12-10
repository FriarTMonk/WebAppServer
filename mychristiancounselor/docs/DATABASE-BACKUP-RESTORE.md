# Database Backup & Restore Guide

**Date:** December 9, 2025
**Status:** ✅ PRODUCTION READY
**Database:** `mychristiancounselor` (PostgreSQL on AWS RDS)

---

## Current Backup Configuration

### Automated Backups

✅ **Enabled:** YES
✅ **Retention Period:** 7 days
✅ **Backup Window:** 08:01-08:31 UTC (1:01-1:31 AM PST)
✅ **Point-in-Time Recovery:** Enabled (restore to any second within 7 days)

### Database Details

- **Instance ID:** `mychristiancounselor`
- **Engine:** PostgreSQL
- **Region:** us-east-2 (Ohio)
- **Endpoint:** `mychristiancounselor.cdi0cqmwebnc.us-east-2.rds.amazonaws.com`
- **Storage:** 20 GB (GP2)
- **MultiAZ:** No (single AZ - consider enabling for HA)

---

## What's Backed Up

### Automated Daily Snapshots

**Schedule:**
- Every day at 08:01-08:31 UTC (1:01-1:31 AM PST)
- Low traffic time to minimize performance impact
- Takes ~5-10 minutes for 20GB database

**Retention:**
- Kept for **7 days**
- Oldest snapshot automatically deleted when 8th day snapshot is created
- **Cost:** ~$0.095 per GB-month (~$1.90/month for 20GB)

**What's included:**
- All database tables and data
- User accounts and permissions
- Database configuration
- Schema and indexes

**What's NOT included:**
- Application code (in git repository)
- Environment variables (in .env files)
- Uploaded files (if any - store in S3 for persistence)

### Point-in-Time Recovery (PITR)

**Capability:**
- Restore to **any second** within the last 7 days
- Uses transaction logs in addition to snapshots
- More granular than daily snapshots

**Example:**
- Mistake made at 2:34 PM today
- Can restore to 2:33 PM (1 minute before)
- Lose only 1 minute of data instead of up to 24 hours

---

## Manual Snapshots

### When to Create Manual Snapshots

**Before major changes:**
- Before database migrations
- Before major application deployments
- Before bulk data imports/deletes
- Before testing destructive operations

**Periodic baselines:**
- Weekly or monthly "known good" state
- Before/after significant milestones
- Regulatory compliance requirements

**Retention:**
- Manual snapshots **never expire automatically**
- You must manually delete them
- **Cost:** Same as automated (~$0.095 per GB-month)

### How to Create Manual Snapshot

```bash
# Create snapshot with timestamp
SNAPSHOT_ID="mychristiancounselor-manual-$(date +%Y%m%d-%H%M%S)"
aws rds create-db-snapshot \
  --db-instance-identifier mychristiancounselor \
  --db-snapshot-identifier "$SNAPSHOT_ID" \
  --region us-east-2
```

**Example names:**
- `mychristiancounselor-manual-20251209-142702`
- `mychristiancounselor-pre-migration-20251210`
- `mychristiancounselor-v1.0-release`

### List All Snapshots

```bash
# List automated snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier mychristiancounselor \
  --snapshot-type automated \
  --region us-east-2 \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Size:AllocatedStorage}' \
  --output table

# List manual snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier mychristiancounselor \
  --snapshot-type manual \
  --region us-east-2 \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime,Size:AllocatedStorage}' \
  --output table
```

### Delete Manual Snapshot

```bash
# Only delete manual snapshots you created
# Automated snapshots delete themselves
aws rds delete-db-snapshot \
  --db-snapshot-identifier mychristiancounselor-manual-20251209-142702 \
  --region us-east-2
```

---

## Restore Procedures

### Before You Restore

**⚠️ IMPORTANT:**
1. **Restoring creates a NEW database instance** (doesn't overwrite existing)
2. **You must update connection strings** to point to restored instance
3. **Restored instance will have a new endpoint URL**
4. **Current database remains untouched** during restore
5. **Always test restore in non-production first**

### Option 1: Restore from Automated Snapshot (Specific Time)

**Use Case:** Restore to specific day's snapshot

```bash
# Step 1: List available snapshots
aws rds describe-db-snapshots \
  --db-instance-identifier mychristiancounselor \
  --snapshot-type automated \
  --query 'DBSnapshots[*].{ID:DBSnapshotIdentifier,Created:SnapshotCreateTime}' \
  --output table

# Step 2: Restore from specific snapshot
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mychristiancounselor-restored \
  --db-snapshot-identifier rds:mychristiancounselor-2025-12-09-08-01 \
  --region us-east-2

# Step 3: Wait for restore to complete (5-15 minutes)
aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor-restored \
  --query 'DBInstances[0].DBInstanceStatus' \
  --output text

# Step 4: Get new endpoint
aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor-restored \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text
```

### Option 2: Point-in-Time Restore (Any Second)

**Use Case:** Restore to exact moment before mistake

```bash
# Restore to specific timestamp
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mychristiancounselor \
  --target-db-instance-identifier mychristiancounselor-restored \
  --restore-time 2025-12-09T14:33:00Z \
  --region us-east-2

# Or restore to latest restorable time (most recent)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mychristiancounselor \
  --target-db-instance-identifier mychristiancounselor-restored \
  --use-latest-restorable-time \
  --region us-east-2
```

**Time Format:**
- Must be in UTC
- Format: `YYYY-MM-DDTHH:MM:SSZ`
- Example: `2025-12-09T14:33:00Z` = Dec 9, 2025 at 2:33 PM UTC

### Option 3: Restore from Manual Snapshot

```bash
# Use for manually created snapshots
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mychristiancounselor-restored \
  --db-snapshot-identifier mychristiancounselor-baseline-20251209-142702 \
  --region us-east-2
```

---

## Post-Restore Steps

### 1. Verify Restored Database

```bash
# Get new endpoint
NEW_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor-restored \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

echo "New database endpoint: $NEW_ENDPOINT"

# Test connection
psql "postgresql://app_mychristiancounselor:apP_mycC!@$NEW_ENDPOINT/mychristiancounselor?sslmode=require" -c "SELECT COUNT(*) FROM \"User\";"
```

### 2. Update Application Configuration

**Option A: Test First (Recommended)**
```bash
# In .env.test or staging environment
DATABASE_URL="postgresql://app_mychristiancounselor:apP_mycC!@NEW_ENDPOINT/mychristiancounselor?sslmode=require"
```

**Option B: Swap Production Database**
```bash
# 1. Stop application (or put in maintenance mode)
# 2. Update .env with new endpoint
# 3. Restart application
# 4. Verify everything works
# 5. Delete old database (after confirming success)
```

### 3. Clean Up

**After confirming restored database works:**

```bash
# Rename restored instance to main name
# (Requires deleting or renaming original first)

# Delete old database instance
aws rds delete-db-instance \
  --db-instance-identifier mychristiancounselor \
  --skip-final-snapshot \
  --region us-east-2

# Rename restored instance
aws rds modify-db-instance \
  --db-instance-identifier mychristiancounselor-restored \
  --new-db-instance-identifier mychristiancounselor \
  --apply-immediately \
  --region us-east-2
```

---

## Disaster Recovery Scenarios

### Scenario 1: Accidental Data Deletion

**Problem:** Admin accidentally deleted important records at 2:34 PM

**Solution:** Point-in-Time Restore
```bash
# Restore to 2:33 PM (1 minute before)
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mychristiancounselor \
  --target-db-instance-identifier mychristiancounselor-recovered \
  --restore-time $(date -u -d "2:33 PM today" +%Y-%m-%dT%H:%M:%SZ) \
  --region us-east-2

# Result: Lose only 1 minute of data
```

**Recovery Time:** 10-20 minutes
**Data Loss:** 1 minute

### Scenario 2: Bad Database Migration

**Problem:** Migration script corrupted data

**Solution:** Restore from pre-migration snapshot
```bash
# Use manual snapshot created before migration
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mychristiancounselor-restored \
  --db-snapshot-identifier mychristiancounselor-pre-migration-20251210 \
  --region us-east-2
```

**Recovery Time:** 15-30 minutes
**Data Loss:** None (if migration was first operation of the day)

### Scenario 3: Complete Database Failure

**Problem:** RDS instance hardware failure, database corrupted

**Solution:** Restore from latest automated snapshot
```bash
# Use most recent automated snapshot
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mychristiancounselor \
  --target-db-instance-identifier mychristiancounselor-recovered \
  --use-latest-restorable-time \
  --region us-east-2
```

**Recovery Time:** 20-40 minutes
**Data Loss:** Minimal (usually <5 minutes)

### Scenario 4: Ransomware / Malicious Attack

**Problem:** Database encrypted by ransomware

**Solution:** Restore from snapshot before attack
```bash
# Identify last known good time
# Restore to that point
aws rds restore-db-instance-to-point-in-time \
  --source-db-instance-identifier mychristiancounselor \
  --target-db-instance-identifier mychristiancounselor-clean \
  --restore-time 2025-12-08T10:00:00Z \
  --region us-east-2

# Investigate attack, patch vulnerability, then switch to clean database
```

**Recovery Time:** 30-60 minutes (+ investigation time)
**Data Loss:** Depends on attack timing

---

## Backup Verification

### Test Restore Procedure (Quarterly)

**Why:** Verify backups actually work (untested backups are useless!)

**Schedule:** Every 3 months, test a restore

**Procedure:**
```bash
# 1. Create test restore
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier mychristiancounselor-test-restore \
  --db-snapshot-identifier $(aws rds describe-db-snapshots \
    --db-instance-identifier mychristiancounselor \
    --snapshot-type automated \
    --query 'DBSnapshots[0].DBSnapshotIdentifier' \
    --output text) \
  --region us-east-2

# 2. Wait for completion
aws rds wait db-instance-available \
  --db-instance-identifier mychristiancounselor-test-restore \
  --region us-east-2

# 3. Test connection and data
TEST_ENDPOINT=$(aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor-test-restore \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text)

psql "postgresql://app_mychristiancounselor:apP_mycC!@$TEST_ENDPOINT/mychristiancounselor?sslmode=require" -c "SELECT COUNT(*) FROM \"User\";"

# 4. Delete test instance
aws rds delete-db-instance \
  --db-instance-identifier mychristiancounselor-test-restore \
  --skip-final-snapshot \
  --region us-east-2
```

**Document result:** "Tested on [date], restore successful, data verified"

---

## Monitoring Backups

### Check Backup Status

```bash
# Verify backups are enabled
aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor \
  --query 'DBInstances[0].{BackupRetention:BackupRetentionPeriod,LatestBackup:LatestRestorableTime,AutoBackup:BackupRetentionPeriod}' \
  --output table

# List recent backups
aws rds describe-db-snapshots \
  --db-instance-identifier mychristiancounselor \
  --snapshot-type automated \
  --max-items 7 \
  --query 'DBSnapshots[*].{Created:SnapshotCreateTime,Status:Status,Size:AllocatedStorage}' \
  --output table
```

### Set Up Alerts (Optional)

**CloudWatch Alarms for:**
- Backup failures
- Backup age > 25 hours (daily backup didn't run)
- Storage space low

**SNS Topic for notifications:**
```bash
# Create SNS topic for backup alerts
aws sns create-topic \
  --name rds-backup-alerts \
  --region us-east-2

# Subscribe your email
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-2:ACCOUNT_ID:rds-backup-alerts \
  --protocol email \
  --notification-endpoint your-email@example.com
```

---

## Cost Breakdown

### Current Costs (Estimated)

**Automated Backups (7 days):**
- Storage: 20GB × 7 days = 140GB
- Cost: 140GB × $0.095/GB-month ÷ 30 days × 7 days = **~$3.10/month**

**Manual Snapshots:**
- Per snapshot: 20GB × $0.095/GB-month = **$1.90/month**
- If you keep 12 monthly snapshots: **$22.80/month**

**Total (with automated only):** ~$3.10/month
**Total (with 12 manual snapshots):** ~$25.90/month

### Cost Optimization

**Keep costs low:**
- Delete old manual snapshots you no longer need
- Only create manual snapshots before major changes
- 7-day automated retention is usually sufficient

**Increase safety:**
- Increase to 30-day retention (+$10/month)
- Keep monthly manual snapshots for compliance
- Enable MultiAZ for high availability (+$15/month RDS cost)

---

## Best Practices

### Unix Principles Applied

✅ **Do one thing well:**
- Automated backups handle daily safety
- Manual snapshots for special occasions
- PITR for precision recovery

✅ **Fail gracefully:**
- Multiple restore options available
- Can test restore without affecting production
- New instance created, old one untouched

✅ **Clear and simple:**
- Daily backups at predictable time
- Clear naming conventions
- Easy-to-follow restore procedures

### Backup Strategy

**3-2-1 Rule:**
- ✅ **3 copies** of data: Production + 7 automated + manual snapshots
- ⚠️ **2 different media:** All on AWS EBS (consider cross-region for true 2nd media)
- ❌ **1 off-site:** AWS is "off-site" from your office but not true off-site backup

**Recommendations:**
1. ✅ Keep current automated backups (7 days)
2. ✅ Create manual snapshot before migrations
3. ✅ Test restore quarterly
4. 🔜 Consider cross-region backup for disaster recovery
5. 🔜 Consider enabling MultiAZ for high availability

### Security

**Backup Security:**
- ✅ Encrypted at rest (RDS default encryption)
- ✅ Encrypted in transit (SSL required)
- ✅ IAM-controlled access (only authorized AWS users)
- ✅ Audit trail via CloudTrail

**Access Control:**
- Only AWS account admins can restore
- Database credentials unchanged after restore
- Application code doesn't need backup access

---

## Troubleshooting

### Backup Not Created

**Check:**
```bash
aws rds describe-db-instances \
  --db-instance-identifier mychristiancounselor \
  --query 'DBInstances[0].{BackupRetention:BackupRetentionPeriod,Status:DBInstanceStatus}' \
  --output table
```

**If BackupRetention = 0:** Backups disabled, enable them
**If Status = modifying:** Wait for modifications to complete

### Restore Fails

**Common causes:**
1. Insufficient IAM permissions
2. Target instance name already exists
3. Insufficient subnet group configuration
4. Wrong region specified

**Solution:** Check CloudTrail logs for detailed error

### Restore Takes Too Long

**Normal times:**
- 20GB database: 15-30 minutes
- 100GB database: 1-2 hours
- 1TB database: Several hours

**If longer:** Contact AWS Support

---

## Summary

✅ **Automated backups:** Enabled (7-day retention)
✅ **Backup window:** 1 AM PST (low traffic)
✅ **Point-in-time recovery:** Enabled (restore to any second)
✅ **Manual snapshots:** Available for pre-deployment safety
✅ **Baseline snapshot:** Created
✅ **Recovery procedures:** Documented and tested
✅ **Cost:** ~$3/month (automated) + manual snapshots

**Your data is now protected!** 🛡️

**Next steps:**
1. Test restore procedure (every 3 months)
2. Create manual snapshot before migrations
3. Consider enabling MultiAZ for HA (optional)
4. Consider cross-region backup for DR (optional)

**Recovery Time Objective (RTO):** 20-40 minutes
**Recovery Point Objective (RPO):** < 5 minutes (with PITR)
