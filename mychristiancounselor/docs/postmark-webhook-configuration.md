# Postmark Webhook Configuration

## Overview

Marketing campaign tracking metrics (delivered, opened, clicked, bounced) are now enabled via Postmark webhooks. This document explains how to configure Postmark to send tracking events to the API.

## Implementation Details

### What Was Fixed

**Problem:** Marketing campaigns only showed "sent" metrics. Opened, clicked, delivered, and bounced metrics were not tracked.

**Root Cause:**
- Postmark sends webhook events for tracking, but the application had no webhook handlers
- EmailTrackingService had methods but they were never called
- Tracking data in EmailLog was not synced to EmailCampaignRecipient (where analytics queries read from)

**Solution:**
1. Created webhook endpoint: `POST /webhooks/postmark/tracking`
2. Updated EmailTrackingService to sync tracking data from EmailLog to EmailCampaignRecipient
3. Added Postmark tracking event DTOs for type safety

### Code Changes

**New Files:**
- `packages/api/src/webhooks/dto/postmark-tracking.dto.ts` - Type definitions for Postmark events
- `packages/api/src/email/email-tracking.service.spec.ts` - Tests for tracking sync

**Modified Files:**
- `packages/api/src/email/email-tracking.service.ts` - Added `syncToCampaignRecipient()` method
- `packages/api/src/webhooks/webhooks.controller.ts` - Added tracking webhook endpoint
- `packages/api/src/webhooks/webhooks.service.ts` - Added `handleTrackingEvent()` method

## Postmark Configuration

### Step 1: Identify Your Webhook URL

**Local Development:**
```
http://localhost:3697/v1/webhooks/postmark/tracking
```

**Production:**
```
https://api.mychristiancounselor.online/v1/webhooks/postmark/tracking
```

### Step 2: Configure Webhook in Postmark Dashboard

1. Go to [Postmark Dashboard](https://account.postmarkapp.com/)
2. Select your **Server**
3. Navigate to **Settings** → **Webhooks**
4. Click **Add Webhook**

### Step 3: Configure Webhook Settings

**Webhook URL:**
```
https://api.mychristiancounselor.online/v1/webhooks/postmark/tracking
```

**Events to Subscribe:**
- ✅ Delivery
- ✅ Bounce
- ✅ Open Tracking
- ✅ Click Tracking

**HTTP Method:** POST

**HTTP Headers:** None required (endpoint is public with rate limiting)

### Step 4: Enable Open & Click Tracking

For open and click tracking to work, you must enable them:

1. Go to **Settings** → **Tracking**
2. Enable **Open Tracking** (adds tracking pixel to emails)
3. Enable **Link Tracking** (rewrites URLs for click tracking)

**Note:** Open tracking requires HTML emails. Plain text emails cannot track opens.

### Step 5: Test the Webhook

1. Send a test campaign email
2. Open the email
3. Click a link in the email
4. Check Postmark webhook logs: **Settings** → **Webhooks** → **Activity**
5. Verify events are being sent successfully (200 OK responses)

### Step 6: Verify Metrics

1. Go to your marketing dashboard
2. Select a sent campaign
3. Verify metrics are now showing:
   - ✅ Sent
   - ✅ Delivered
   - ✅ Opened
   - ✅ Clicked
   - ✅ Bounced

## Data Flow

```
Postmark Event → POST /v1/webhooks/postmark/tracking
                      ↓
              WebhooksController.handlePostmarkTracking()
                      ↓
              WebhooksService.handleTrackingEvent()
                      ↓
              EmailTrackingService.markAs{Delivered|Opened|Clicked|Bounced}()
                      ↓
              Updates EmailLog + Syncs to EmailCampaignRecipient
                      ↓
              Campaign analytics now show metrics
```

## Event Types

### Delivery Event
Triggered when email is successfully delivered to recipient's mail server.

**Updates:**
- EmailLog.deliveredAt
- EmailLog.status = 'delivered'
- EmailCampaignRecipient.deliveredAt

### Bounce Event
Triggered when email bounces (hard or soft bounce).

**Updates:**
- EmailLog.bouncedAt
- EmailLog.status = 'bounced'
- EmailLog.bounceReason
- EmailCampaignRecipient.bouncedAt
- EmailCampaignRecipient.bounceReason

### Open Event
Triggered when recipient opens the email (requires HTML email).

**Updates:**
- EmailLog.openedAt
- EmailLog.status = 'opened'
- EmailCampaignRecipient.openedAt

### Click Event
Triggered when recipient clicks a link in the email.

**Updates:**
- EmailLog.clickedAt
- EmailCampaignRecipient.clickedAt

## Security

### Rate Limiting
The webhook endpoint has rate limiting:
- 100 requests per minute per IP
- Uses webhook-specific rate limit profile

### Authentication
The endpoint is public (required for Postmark to send events) but:
- Rate limited to prevent abuse
- Returns 200 OK even on errors to prevent retry storms
- Logs all errors with context for debugging

### Postmark Signature Verification (Optional)
For additional security, you can add Postmark signature verification:

1. Get your webhook secret from Postmark dashboard
2. Add to environment: `POSTMARK_WEBHOOK_SECRET=your-secret`
3. Implement verification in webhook controller

## Monitoring

### Check Webhook Health

**Postmark Dashboard:**
- Settings → Webhooks → Activity
- View delivery success rate
- Check for 4xx/5xx errors

**API Logs:**
```bash
# Check webhook processing logs
aws lightsail get-container-log \
  --service-name api \
  --container-name api \
  --region us-east-2 | grep "Postmark.*webhook"
```

### Common Issues

**Issue:** Events sent but metrics not updating
- Check API logs for errors
- Verify EmailLog has postmarkId matching Postmark's MessageID
- Ensure EmailCampaignRecipient.emailLogId links to EmailLog

**Issue:** Open tracking not working
- Verify Open Tracking enabled in Postmark
- Emails must be HTML (plain text cannot track opens)
- Some email clients block tracking pixels

**Issue:** Click tracking not working
- Verify Link Tracking enabled in Postmark
- URLs must be HTTP/HTTPS (not mailto: or custom protocols)

## Testing

### Run Tests
```bash
cd packages/api
npx jest email-tracking.service.spec.ts
```

### Manual Testing
```bash
# Send a test tracking event
curl -X POST http://localhost:3697/v1/webhooks/postmark/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "RecordType": "Delivery",
    "MessageID": "test-message-id",
    "Recipient": "test@example.com",
    "DeliveredAt": "2026-01-18T12:00:00Z"
  }'
```

## Migration Notes

**Existing Campaigns:**
- Campaigns sent before this fix will NOT have tracking data
- Only NEW emails (sent after webhook configured) will track properly

**Database:**
- No migrations required
- EmailLog and EmailCampaignRecipient tables already have tracking fields

## Rollback

If you need to disable tracking:

1. Remove webhook in Postmark dashboard
2. Code is backward compatible - will simply not receive events
3. No database changes needed

## Support

For issues:
1. Check Postmark webhook activity logs
2. Check API logs for errors
3. Verify webhook URL is correct and accessible
4. Test with curl to rule out Postmark issues
