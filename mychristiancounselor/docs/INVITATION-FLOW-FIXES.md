# Organization Invitation Flow Fixes

## Issues Found and Fixed

### Issue 1: Wrong Registration URL
**Problem**: Signup redirect pointed to `/signup` instead of `/register`
**Location**: `packages/web/src/app/invitations/accept/[token]/page.tsx:90`
**Fix**: Changed `/signup` to `/register`

```typescript
// Before:
router.push(`/signup?redirect=${encodeURIComponent(returnUrl)}`);

// After:
router.push(`/register?redirect=${encodeURIComponent(returnUrl)}`);
```

**Impact**: Users clicking "Create Account" from invitation page would get 404 error.

### Issue 2: Wrong Post-Acceptance Redirect
**Problem**: After accepting invitation, redirected to `/` (landing page) instead of `/home`
**Location**: `packages/web/src/app/invitations/accept/[token]/page.tsx:69`
**Fix**: Changed `/` to `/home`

```typescript
// Before:
router.push('/');

// After:
router.push('/home');
```

**Impact**: Users would see marketing landing page instead of conversation view after accepting invitation.

### Issue 3: Wrong Error Page Redirect
**Problem**: "Go to Home" button on error page redirected to `/` instead of `/home`
**Location**: `packages/web/src/app/invitations/accept/[token]/page.tsx:215`
**Fix**: Changed `/` to `/home`

```typescript
// Before:
onClick={() => router.push('/')}

// After:
onClick={() => router.push('/home')}
```

**Impact**: Users would see landing page instead of being taken to conversation view.

## How Invitation Flow Works

### Complete User Journey

```
┌──────────────────────────────────────────────────────────────┐
│ 1. Org Admin sends invitation                                │
│    POST /organizations/:id/invitations                       │
│    - Email sent with link                                    │
│    - Token generated                                         │
│                                                              │
│ 2. User receives email                                       │
│    Link: /invitations/accept/{token}                         │
│                                                              │
│ 3. User clicks link                                          │
│    ↓                                                         │
│ 4. Check if logged in                                        │
│    ├─ Not logged in: Show login/signup options             │
│    │  - "Login to Accept" → /login?redirect=...            │
│    │  - "Create Account" → /register?redirect=... ✅ FIXED │
│    │                                                         │
│    └─ Logged in: Auto-accept invitation                     │
│       ↓                                                      │
│ 5. POST /organizations/invitations/accept                    │
│    - Verify token valid                                      │
│    - Verify not expired                                      │
│    - Verify email matches                                    │
│    - Check member limit                                      │
│    - Create organization membership                          │
│    - Suspend individual subscription (if first org)          │
│    - Mark invitation as accepted                             │
│    ↓                                                         │
│ 6. Success! Redirect to /home ✅ FIXED                       │
│    (Was redirecting to / landing page)                       │
└──────────────────────────────────────────────────────────────┘
```

## Backend Validation

The backend `/organizations/invitations/accept` endpoint performs these checks:

1. **Token exists**: `NotFoundException` if not found
2. **Status is pending**: `BadRequestException` if already used
3. **Not expired**: `BadRequestException` if past expiry date
4. **Email matches**: `ForbiddenException` if wrong user
5. **Member limit**: `BadRequestException` if organization full
6. **Create membership**: Adds user to organization
7. **Suspend subscription**: If user's first org, suspends individual sub
8. **Mark accepted**: Updates invitation status

## Testing Checklist

### Before Fixes (Issues)
- [ ] ❌ Clicking "Create Account" on invitation page → 404 error
- [ ] ❌ After accepting invitation → lands on marketing page
- [ ] ❌ Error page "Go to Home" → lands on marketing page

### After Fixes (Expected)
- [ ] ✅ Clicking "Create Account" → /register with redirect back
- [ ] ✅ After accepting invitation → /home (conversation view)
- [ ] ✅ Error page "Go to Home" → /home (conversation view)

## Related Files

- **Frontend**: `packages/web/src/app/invitations/accept/[token]/page.tsx`
- **Backend Controller**: `packages/api/src/organization/organization.controller.ts:156`
- **Backend Service**: `packages/api/src/organization/organization.service.ts:410`
- **Email Templates**: `packages/api/src/email/email-templates.service.ts`

## Error Scenarios Handled

The invitation page handles these error cases:

1. **Not logged in**: Shows login/signup buttons with redirect
2. **Invitation not found** (404): Clear message + support contact
3. **Invitation expired**: Message + request new invitation
4. **Invitation already used**: Message + go to home
5. **Wrong user** (403): Message + option to login with different account
6. **Organization full**: Backend rejects with error message

## Email Template

Invitation emails should include:
- Organization name
- Role being assigned
- Expiration date (typically 7 days)
- Link: `https://app.mychristiancounselor.com/invitations/accept/{token}`
- Instructions: "Click link to accept, login if needed"

## Future Enhancements

### 1. Better Unauthenticated Experience

Instead of just showing login/signup buttons, could show:
- Organization name
- Who sent the invitation
- What role they'll have
- Then login/signup options

### 2. Email Validation

Pre-fill email field on registration page when coming from invitation:
```typescript
router.push(`/register?redirect=${returnUrl}&email=${encodeURIComponent(invitation.email)}`);
```

### 3. Token Expiry Warning

Show time remaining before invitation expires:
- "Invitation expires in 5 days"
- "Invitation expires in 3 hours"
- Urgent styling if < 24 hours

### 4. Resend Link

If expired, add "Request New Invitation" button that:
- Emails the organization admin
- Or shows contact info for admin
- Or auto-resends if user is original inviter

## Notes

- Invitation tokens are UUID format, stored hashed in database
- Default expiry: 7 days from creation
- One invitation can only be accepted once
- Email must match exactly (case-insensitive)
- After accepting, user is immediately a member with assigned role
- If user joins their first organization, individual subscription is suspended
- User can be in multiple organizations simultaneously
