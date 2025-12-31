# Crisis Alert System

## Overview

Real-time email alerting system that notifies assigned counselors when crisis situations are detected in member conversations.

## How It Works

1. **Detection:** SafetyService detects crisis using pattern matching + AI analysis
2. **Event:** CounselProcessingService publishes `crisis.detected` event
3. **Handling:** CrisisAlertService receives event and processes alert
4. **Checks:**
   - Is there an assigned counselor?
   - Was an alert sent within the last hour? (throttling)
5. **Action:** Send high-priority email to counselor with full context
6. **Logging:** Log all detections to CrisisAlertLog table

## Throttling

Alerts are throttled to **1 per member per hour** to prevent alert fatigue. If multiple crisis messages are detected within the throttle window, only the first triggers an email. All detections are logged regardless of throttling.

## Email Content

Crisis alert emails include:
- Member name and email
- Crisis type (suicidal ideation, self-harm, severe depression)
- Confidence level (high, medium, low)
- Detection method (pattern, AI, or both)
- Triggering message excerpt
- Links to conversation and member observations
- Recommended next steps

## Database Schema

### CrisisAlertLog

Tracks all crisis detections:

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Primary key |
| memberId | uuid | Member who triggered alert |
| counselorId | uuid | Counselor who was notified (nullable) |
| crisisType | CrisisType enum | Type of crisis detected |
| confidence | ConfidenceLevel enum | Detection confidence (high/medium/low) |
| detectionMethod | DetectionMethod enum | How it was detected (pattern/ai/both) |
| triggeringMessage | text | Message that triggered alert |
| messageId | uuid | Reference to message record |
| emailSent | boolean | Whether email was sent |
| emailLogId | uuid | Reference to EmailLog |
| throttled | boolean | Whether alert was throttled |
| throttleReason | string | Reason for throttling |
| createdAt | timestamp | When alert was created |
| updatedAt | timestamp | Last update timestamp |

## Configuration

Environment variables:
- `WEB_APP_URL`: Base URL for generating links in email
- `POSTMARK_API_KEY`: Email service API key
- `POSTMARK_FROM_EMAIL`: From email address

Throttle window: **1 hour** (configurable in CrisisAlertService.THROTTLE_WINDOW_HOURS)

## Event-Driven Architecture

The crisis alert system uses NestJS EventEmitter2 for loose coupling:

**Event Published:**
```typescript
{
  type: 'crisis.detected',
  payload: {
    memberId: string,
    crisisType: 'suicidal_ideation' | 'self_harm' | 'severe_depression',
    confidence: 'high' | 'medium' | 'low',
    detectionMethod: 'pattern' | 'ai' | 'both',
    triggeringMessage: string,
    messageId?: string,
    timestamp: Date
  }
}
```

**Listeners:**
- `CrisisAlertService.handleCrisisDetected()` - Processes alerts and sends emails

## Email Priority

Crisis alert emails are sent with **X-Priority: 1** header (urgent) to ensure they are highlighted in email clients.

## Error Handling

- Event emission failures are caught and logged but don't block counsel response delivery
- Email sending failures are logged to CrisisAlertLog with `emailSent: false`
- Missing counselor assignments result in database log only (no email)

## Testing

Unit tests: `packages/api/src/counsel/crisis-alert.service.spec.ts`

Test coverage includes:
- No counselor assigned scenario
- Counselor assigned and alert sent
- Throttling behavior
- All tests use mocked dependencies

## Future Enhancements

- [ ] Escalation to org admin if counselor doesn't respond
- [ ] Mobile push notifications
- [ ] Crisis type classification (enhance SafetyService to return specific types)
- [ ] Customizable throttle windows per organization
- [ ] Crisis trend tracking and reporting
- [ ] Admin dashboard for viewing crisis alert history
- [ ] Retry logic for transient email failures

## Related Documentation

- Design Document: `docs/plans/2025-12-30-counselor-alert-system-design.md`
- Manual Test Results: `docs/testing/crisis-alert-manual-test-results.md`
- Implementation Plan: `docs/plans/2025-12-30-counselor-alert-phase1-implementation.md`
