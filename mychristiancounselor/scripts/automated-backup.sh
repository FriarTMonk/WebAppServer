#!/bin/bash
#
# Automated Backup Script for Cron Jobs
# Runs backup and sends notifications on failure
#
# Setup cron job:
# crontab -e
# Add: 0 2 * * * /path/to/mychristiancounselor/scripts/automated-backup.sh production >> /var/log/mcc-backup.log 2>&1
#
# This runs daily at 2 AM
#

set -e  # Exit on error

# ==============================================
# Configuration
# ==============================================

ENVIRONMENT="${1:-production}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_DIR}/logs/backup-$(date +%Y%m%d).log"

# Notification settings (optional)
NOTIFICATION_EMAIL="${BACKUP_NOTIFICATION_EMAIL:-}"
SLACK_WEBHOOK="${BACKUP_SLACK_WEBHOOK:-}"

# ==============================================
# Functions
# ==============================================

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

send_email_notification() {
    local subject="$1"
    local body="$2"

    if [ -n "$NOTIFICATION_EMAIL" ] && command -v mail &> /dev/null; then
        echo "$body" | mail -s "$subject" "$NOTIFICATION_EMAIL"
        log "📧 Email notification sent to $NOTIFICATION_EMAIL"
    fi
}

send_slack_notification() {
    local message="$1"
    local color="$2"  # good, warning, danger

    if [ -n "$SLACK_WEBHOOK" ] && command -v curl &> /dev/null; then
        curl -X POST "$SLACK_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"attachments\": [{
                    \"color\": \"$color\",
                    \"text\": \"$message\",
                    \"footer\": \"MyChristianCounselor Backup\",
                    \"ts\": $(date +%s)
                }]
            }" 2>&1 | tee -a "$LOG_FILE"

        log "📢 Slack notification sent"
    fi
}

# ==============================================
# Main execution
# ==============================================

log "╔════════════════════════════════════════╗"
log "║   Automated Backup - $ENVIRONMENT"
log "╚════════════════════════════════════════╝"

# Change to project directory
cd "$PROJECT_DIR"

# Create logs directory
mkdir -p "${PROJECT_DIR}/logs"

# Run backup script
log "🔄 Starting backup process..."

if bash "${SCRIPT_DIR}/backup-database.sh" "$ENVIRONMENT" >> "$LOG_FILE" 2>&1; then
    log "✅ Backup completed successfully"

    # Success notification
    send_slack_notification \
        "✅ Database backup completed successfully for *$ENVIRONMENT* environment" \
        "good"

else
    EXIT_CODE=$?
    log "❌ Backup failed with exit code: $EXIT_CODE"

    # Failure notification
    ERROR_MSG="❌ Database backup FAILED for *$ENVIRONMENT* environment\nExit code: $EXIT_CODE\nCheck logs at: $LOG_FILE"

    send_email_notification \
        "[ALERT] MyChristianCounselor Backup Failed - $ENVIRONMENT" \
        "$ERROR_MSG"

    send_slack_notification \
        "$ERROR_MSG" \
        "danger"

    exit $EXIT_CODE
fi

log "✨ Automated backup process completed"
log ""
