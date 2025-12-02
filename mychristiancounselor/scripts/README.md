# Database Backup & Restore Scripts

This directory contains scripts for backing up and restoring the PostgreSQL database.

## Available Scripts

### 1. `backup-database.sh` - Manual Backup
Creates a timestamped, compressed backup of the database.

**Usage:**
```bash
# Development backup
./scripts/backup-database.sh

# Production backup
./scripts/backup-database.sh production

# Staging backup
./scripts/backup-database.sh staging
```

**Features:**
- Timestamped backups (YYYYMMDD_HHMMSS format)
- Gzip compression for space efficiency
- Automatic cleanup of backups older than 30 days
- Organized by environment (development/production/staging)

**Output:**
```
backups/
├── development/
│   └── mcc_backup_development_20251201_120000.sql.gz
├── production/
│   └── mcc_backup_production_20251201_120000.sql.gz
└── staging/
    └── mcc_backup_staging_20251201_120000.sql.gz
```

### 2. `restore-database.sh` - Manual Restore
Restores database from a backup file.

**Usage:**
```bash
# Restore from backup file
./scripts/restore-database.sh backups/production/mcc_backup_production_20251201_120000.sql.gz production
```

**Safety Features:**
- Creates a safety backup before restoring
- Requires confirmation before proceeding
- Single transaction (all or nothing)
- Verifies restoration success

**Important:** After restoring, run migrations:
```bash
npx prisma migrate deploy --schema=./packages/api/prisma/schema.prisma
```

### 3. `automated-backup.sh` - Scheduled Backups
Wrapper script for automated backups via cron.

**Setup Cron Job:**
```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/mychristiancounselor/scripts/automated-backup.sh production >> /var/log/mcc-backup.log 2>&1

# Or multiple times per day
0 */6 * * * /path/to/mychristiancounselor/scripts/automated-backup.sh production >> /var/log/mcc-backup.log 2>&1
```

**Features:**
- Logging to file
- Email notifications on failure (optional)
- Slack notifications (optional)
- Error handling and reporting

**Optional Notifications:**
```bash
# Set environment variables for notifications
export BACKUP_NOTIFICATION_EMAIL="admin@yourdomain.com"
export BACKUP_SLACK_WEBHOOK="https://hooks.slack.com/services/YOUR/WEBHOOK/URL"
```

## Prerequisites

### Install PostgreSQL Client Tools
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# MacOS
brew install postgresql@16

# Windows (via WSL)
sudo apt-get install postgresql-client
```

### Make Scripts Executable
```bash
chmod +x scripts/*.sh
```

## Configuration

### Environment Variables
The scripts read `DATABASE_URL` from `.env` file or environment variables.

```bash
# .env
DATABASE_URL=postgresql://user:password@host:port/database
```

### Backup Retention
Default retention is 30 days. To change, edit `RETENTION_DAYS` in `backup-database.sh`:
```bash
RETENTION_DAYS=60  # Keep backups for 60 days
```

## Backup Best Practices

### 1. Regular Backups
- **Production:** Daily backups minimum (or every 6 hours for critical data)
- **Development:** Weekly backups sufficient
- **Before deployments:** Always create a backup

### 2. Test Restores
Regularly test restore process in a non-production environment:
```bash
# 1. Restore to development
./scripts/restore-database.sh backups/production/backup.sql.gz development

# 2. Verify data integrity
# 3. Test application functionality
```

### 3. Off-site Storage
Store backups in a separate location:
```bash
# Upload to cloud storage (example with AWS S3)
aws s3 sync backups/ s3://your-bucket/mcc-backups/

# Or use rsync to remote server
rsync -avz backups/ user@backup-server:/backups/mychristiancounselor/
```

### 4. Encryption (for sensitive data)
Encrypt backups before storing:
```bash
# Encrypt with GPG
gpg --symmetric --cipher-algo AES256 backup.sql.gz

# Decrypt
gpg --decrypt backup.sql.gz.gpg > backup.sql.gz
```

### 5. Monitor Backup Success
- Set up email/Slack notifications
- Check backup file sizes regularly
- Verify backup logs

## Disaster Recovery Procedures

### Scenario 1: Data Corruption
```bash
# 1. Stop the application
docker-compose down

# 2. Restore from latest backup
./scripts/restore-database.sh backups/production/latest_backup.sql.gz production

# 3. Run migrations
npx prisma migrate deploy

# 4. Restart application
docker-compose up -d

# 5. Verify functionality
curl http://localhost:3697/health
```

### Scenario 2: Accidental Data Deletion
```bash
# 1. Identify when deletion occurred
# 2. Find backup before deletion
ls -lh backups/production/

# 3. Restore specific backup
./scripts/restore-database.sh backups/production/mcc_backup_production_YYYYMMDD_HHMMSS.sql.gz production

# 4. Run migrations and restart
```

### Scenario 3: Server Failure
```bash
# 1. Set up new server
# 2. Install application
# 3. Copy latest backup to new server
# 4. Restore database
# 5. Update DNS/load balancer
```

## Backup Storage Recommendations

### Local Storage
```
backups/
├── production/     # Production backups (30 days)
├── staging/        # Staging backups (14 days)
├── development/    # Development backups (7 days)
└── pre-restore/    # Safety backups before restores
```

### Cloud Storage Options
1. **AWS S3** - Scalable, versioning, lifecycle policies
2. **Google Cloud Storage** - Similar to S3
3. **Azure Blob Storage** - Microsoft cloud option
4. **Dedicated backup service** - BackBlaze, Wasabi

### Cost Estimation (AWS S3)
- 100 GB of backups: ~$2.30/month
- With versioning: ~$4-5/month
- Add lifecycle rules to move to Glacier for long-term storage

## Monitoring and Alerts

### Check Backup Status
```bash
# List recent backups
ls -lht backups/production/ | head

# Check backup sizes
du -sh backups/production/*

# Verify backup integrity
gunzip -t backups/production/backup.sql.gz
```

### Automated Monitoring Script
```bash
#!/bin/bash
# Add to cron: 0 8 * * * /path/to/check-backups.sh

LAST_BACKUP=$(ls -t backups/production/*.sql.gz | head -1)
BACKUP_AGE=$(($(date +%s) - $(stat -c %Y "$LAST_BACKUP")))
MAX_AGE=$((24 * 3600))  # 24 hours

if [ $BACKUP_AGE -gt $MAX_AGE ]; then
    echo "WARNING: Last backup is older than 24 hours!"
    # Send alert
fi
```

## Troubleshooting

### Issue: pg_dump not found
```bash
# Install PostgreSQL client
sudo apt-get install postgresql-client
```

### Issue: Permission denied
```bash
# Make scripts executable
chmod +x scripts/*.sh
```

### Issue: Connection refused
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Verify network connectivity
- Check firewall rules

### Issue: Disk space full
```bash
# Check disk space
df -h

# Clean up old backups manually
rm backups/production/mcc_backup_production_20240101*.sql.gz

# Or reduce retention days in backup script
```

### Issue: Backup too slow
- Use `--jobs` flag for parallel backup (PostgreSQL 9.3+)
- Compress separately: `pg_dump | gzip -1` (faster compression)
- Consider incremental backups for very large databases

## Security Considerations

1. **Protect backup files:**
   ```bash
   chmod 600 backups/**/*.sql.gz
   ```

2. **Secure DATABASE_URL:**
   - Never commit to git
   - Use environment variables
   - Rotate passwords regularly

3. **Encrypt backups:**
   - Use GPG for encryption
   - Store encryption keys securely
   - Consider AWS KMS or similar

4. **Access control:**
   - Limit who can run restore scripts
   - Use separate backup user with read-only access
   - Audit backup access logs

## Additional Resources

- [PostgreSQL Backup Documentation](https://www.postgresql.org/docs/current/backup.html)
- [pg_dump Manual](https://www.postgresql.org/docs/current/app-pgdump.html)
- [Backup Best Practices](https://www.postgresql.org/docs/current/backup-dump.html)

## Support

For issues or questions:
1. Check logs in `logs/backup-*.log`
2. Review PostgreSQL logs
3. Contact DevOps team
4. Create support ticket
