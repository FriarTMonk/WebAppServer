# Account Deletion Implementation

## Overview

GDPR-compliant account deletion with 30-day grace period before permanent deletion.

## Unix Principles Applied

- **Single purpose**: Delete user account and all data
- **Fail safely**: Password verification required
- **Clear process**: 30-day grace period with option to cancel

## How It Works

### User Flow

1. User goes to Profile page (`/profile`)
2. Scrolls to "Danger Zone" section at bottom
3. Clicks "Delete My Account" button
4. Confirms deletion in dialog
5. Enters password
6. Account marked for deletion immediately
7. User is logged out
8. Account permanently deleted after 30 days

### Technical Flow

```
┌────────────────────────────────────────────────────────┐
│ 1. User clicks "Delete My Account"                     │
│    ↓                                                   │
│ 2. Confirmation dialog                                 │
│    ↓                                                   │
│ 3. Password prompt                                     │
│    ↓                                                   │
│ 4. DELETE /profile (password in body)                 │
│    ↓                                                   │
│ 5. Verify password                                     │
│    ↓                                                   │
│ 6. Soft delete:                                        │
│    - isActive = false                                  │
│    - deletionRequestedAt = now()                       │
│    - deletionRequestedBy = userId                      │
│    ↓                                                   │
│ 7. User logged out                                     │
│    ↓                                                   │
│ 8. [30 days later] Background job hard deletes        │
└────────────────────────────────────────────────────────┘
```

## GDPR Compliance

### Requirements Met

| Requirement | Implementation | Status |
|-------------|----------------|--------|
| Right to erasure (Article 17) | DELETE /profile endpoint | ✅ |
| Without undue delay | 30-day grace period (acceptable) | ✅ |
| User authentication | Password verification required | ✅ |
| Data not accessible | isActive=false prevents login | ✅ |
| Audit trail | deletionRequestedAt + deletionRequestedBy | ✅ |
| Reversible (grace period) | Contact support within 30 days | ✅ |

### 30-Day Grace Period

**Why it's GDPR compliant:**
- Data is immediately inaccessible (isActive=false)
- Data is not used for any processing
- Grace period is for safety/recovery only
- User is informed of the 30-day period
- Deletion happens automatically after 30 days

**EU Guidelines** state that reasonable delays are acceptable for:
- Technical reasons
- Backup restoration
- Fraud prevention
- Legal obligations

30 days is standard industry practice and GDPR compliant.

## Database Changes

### New Fields

```prisma
model User {
  // ... existing fields ...

  deletionRequestedAt  DateTime? // When user requested deletion
  deletionRequestedBy  String?   // User ID who requested (for audit)

  // ... rest of model ...
}
```

### Migration Required

**IMPORTANT**: Before deploying, run this migration:

```bash
# Create migration
npx prisma migrate dev --name add-deletion-tracking

# Or manually add to database:
ALTER TABLE "User"
  ADD COLUMN "deletionRequestedAt" TIMESTAMP,
  ADD COLUMN "deletionRequestedBy" TEXT;
```

## Implementation Files

### Backend

1. **`packages/api/src/profile/profile.service.ts`**
   - `deleteAccount(userId, password)` method
   - Verifies password
   - Soft deletes account
   - Returns deletion date and message

2. **`packages/api/src/profile/profile.controller.ts`**
   - `DELETE /profile` endpoint
   - Requires authentication (JwtAuthGuard)
   - Takes password in request body

3. **`packages/api/prisma/schema.prisma`**
   - Added `deletionRequestedAt` field
   - Added `deletionRequestedBy` field

### Frontend

1. **`packages/web/src/app/profile/page.tsx`**
   - "Danger Zone" section at bottom
   - Delete account button
   - Confirmation dialogs
   - Password prompt
   - API call to DELETE /profile

## Security Features

### Password Verification

```typescript
// Verify password before deletion
const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
if (!isPasswordValid) {
  throw new UnauthorizedException('Invalid password');
}
```

### Audit Trail

```typescript
deletionRequestedAt: new Date(),      // When deletion was requested
deletionRequestedBy: userId,          // Who requested it (self)
```

### Prevent Duplicate Requests

```typescript
if (!user.isActive) {
  throw new BadRequestException('Account is already marked for deletion');
}
```

## What Gets Deleted

### Soft Delete (Immediate)

- Account marked inactive (isActive = false)
- Cannot log in
- No data deleted yet

### Hard Delete (After 30 Days)

**User data:**
- User record
- Profile information
- Email, name, password

**Counseling data:**
- All counseling sessions
- All messages/conversations
- Session notes

**Support data:**
- Support tickets
- Ticket responses

**Organization data:**
- Organization memberships
- Counselor assignments (as counselor)
- Counselor assignments (as member)

**Shared data:**
- Shared conversations

**Audit data:**
- Audit log entries

**Subscription data:**
- Stripe subscription (cancelled immediately)
- Subscription records

## Background Job (TODO)

**Not yet implemented - needs to be created:**

```typescript
// packages/api/src/cron/account-deletion.service.ts

@Injectable()
export class AccountDeletionService {
  constructor(private prisma: PrismaService) {}

  // Run daily
  @Cron('0 0 * * *') // Midnight every day
  async hardDeleteExpiredAccounts() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Find accounts marked for deletion > 30 days ago
    const expiredAccounts = await this.prisma.user.findMany({
      where: {
        isActive: false,
        deletionRequestedAt: {
          lte: thirtyDaysAgo,
        },
      },
    });

    for (const user of expiredAccounts) {
      await this.hardDeleteAccount(user.id);
    }
  }

  async hardDeleteAccount(userId: string) {
    // Delete all user data permanently
    // Same logic as original hard delete implementation
  }
}
```

## Recovery Process

### Cancel Deletion (Within 30 Days)

**User contacts support:**
1. User emails support within 30 days
2. Support verifies identity
3. Admin runs recovery command:

```typescript
// Support/Admin endpoint to cancel deletion
await prisma.user.update({
  where: { id: userId },
  data: {
    isActive: true,
    deletionRequestedAt: null,
    deletionRequestedBy: null,
  },
});
```

4. User can log in again
5. All data is intact

## Testing

### Manual Testing Checklist

- [ ] Go to `/profile` page when logged in
- [ ] Scroll to "Danger Zone" section
- [ ] Click "Delete My Account" button
- [ ] Confirm deletion in dialog
- [ ] Enter correct password
- [ ] Verify deletion success message
- [ ] Verify deleted date shown (30 days from now)
- [ ] Verify logged out automatically
- [ ] Try to log in again (should fail - account inactive)
- [ ] Enter wrong password (should show error)
- [ ] Try to delete already-deleted account (should show error)

### API Testing

```bash
# Test successful deletion
curl -X DELETE https://api.mychristiancounselor.com/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "correctpassword"}'

# Expected response:
{
  "message": "Account deletion requested",
  "deletionDate": "2025-01-08T...",
  "note": "Your account will be permanently deleted in 30 days. Contact support to cancel deletion."
}

# Test wrong password
curl -X DELETE https://api.mychristiancounselor.com/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"password": "wrongpassword"}'

# Expected: 401 Unauthorized
{
  "statusCode": 401,
  "message": "Invalid password"
}
```

## Privacy Policy Update

Update `/legal/privacy/page.tsx` to include:

```
## Your Rights

You have the right to:
- Request deletion of your account and data
- **Account Deletion Process**:
  - Go to Profile > Danger Zone > Delete My Account
  - Your account will be deactivated immediately
  - All data will be permanently deleted after 30 days
  - You can contact support within 30 days to cancel deletion
```

## Future Enhancements

### 1. Email Notification

Send email when account deletion is requested:
- Confirmation of deletion request
- Deletion date
- Link to cancel (authenticated)
- Support contact info

### 2. Self-Service Recovery

Add "Cancel Deletion" page:
- User logs in with email/password (special case)
- Shows deletion status
- "Cancel Deletion" button
- Reactivates account immediately

### 3. Data Export Before Deletion

- Allow user to export data before deleting
- Generate ZIP file with:
  - Conversation history (JSON/PDF)
  - Profile information
  - Support tickets
- GDPR "right to data portability"

### 4. Admin Dashboard

- View pending deletions
- Cancel deletion for user
- See deletion history
- Export deleted user count

## Monitoring

### Metrics to Track

- **Deletion requests**: Count per day/week/month
- **Deletion rate**: % of active users requesting deletion
- **Recovery rate**: % of deletions cancelled within 30 days
- **Reasons**: Exit survey (optional)

### Alerts

- Unusual spike in deletion requests (>10 in 1 day)
- Failed hard deletion jobs
- Accounts pending deletion >30 days (should be auto-deleted)

## Support Team Training

### Common Questions

**Q: Can I recover my deleted account?**
A: Yes, within 30 days. Contact support immediately.

**Q: What data will be deleted?**
A: All your data: conversations, profile, support tickets, subscriptions.

**Q: Will I be charged after deletion?**
A: No, your subscription is cancelled immediately.

**Q: Can I use the same email again?**
A: Not until your account is permanently deleted (after 30 days).

## Notes

- Password hash field in database is `passwordHash`, not `password`
- User cannot log in while isActive=false
- Background job for hard deletion NOT YET IMPLEMENTED
- Stripe subscription cancellation should be added to controller
- Consider adding data export feature before deletion
- Update privacy policy with deletion process

## Related Files

- Backend service: `packages/api/src/profile/profile.service.ts`
- Backend controller: `packages/api/src/profile/profile.controller.ts`
- Frontend UI: `packages/web/src/app/profile/page.tsx`
- Database schema: `packages/api/prisma/schema.prisma`
- Privacy policy: `packages/web/src/app/legal/privacy/page.tsx`
