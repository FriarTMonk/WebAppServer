# Soft Launch Testing Checklist

Complete end-to-end testing for all critical flows before soft launch.

## Pre-Testing Setup

- [ ] Environment: Staging/Production (NOT local)
- [ ] Database: Production database (or staging mirror)
- [ ] Stripe: Live keys configured
- [ ] Email: Real email service (Postmark)
- [ ] Test email addresses ready
- [ ] Browser: Chrome (latest)
- [ ] Browser: Safari (latest)
- [ ] Browser: Firefox (latest)
- [ ] Mobile: iOS Safari
- [ ] Mobile: Android Chrome

---

## 1. Landing Page & Navigation

### Marketing Landing Page (/)

- [ ] Visit `/` while logged out
- [ ] Verify hero section displays correctly
- [ ] Verify 3 feature cards display
- [ ] Verify "How It Works" section
- [ ] Verify footer links work
- [ ] Click "Get Started" → redirects to `/register`
- [ ] Click "Sign In" → redirects to `/login`
- [ ] Cookie consent banner appears after 1 second
- [ ] Click "Accept" on cookie banner → banner disappears
- [ ] Refresh page → banner doesn't reappear

### Authenticated Redirect

- [ ] Visit `/` while logged in
- [ ] Verify auto-redirects to `/home`
- [ ] Conversation view loads correctly

---

## 2. Registration Flow

### New User Registration

- [ ] Go to `/register`
- [ ] Enter: First Name, Last Name, Email, Password
- [ ] Click "Sign up"
- [ ] Verify redirects to `/home`
- [ ] Verify logged in (user menu appears)

### Email Verification

- [ ] Check inbox for verification email
- [ ] Email received from noreply@mychristiancounselor.com
- [ ] Email has verification link
- [ ] Click verification link
- [ ] Verify redirects to `/verify-email/[token]`
- [ ] Verify shows "Verifying email..." message
- [ ] Verify shows success message
- [ ] Verify auto-redirects to `/login` after 3 seconds
- [ ] Login with verified account
- [ ] Verify can access all features

### Registration Validation

- [ ] Try to register with existing email → error shown
- [ ] Try weak password (< 8 chars) → error shown
- [ ] Try mismatched passwords → error shown
- [ ] Try invalid email format → error shown

---

## 3. Login Flow

### Successful Login

- [ ] Go to `/login`
- [ ] Enter valid email and password
- [ ] Click "Sign in"
- [ ] Verify redirects to `/home`
- [ ] Verify conversation view loads
- [ ] Verify user menu shows correct name

### Failed Login

- [ ] Try wrong password → error message shown
- [ ] Try non-existent email → error message shown
- [ ] Error messages don't reveal if email exists (security)

### Login Redirect

- [ ] Visit protected page while logged out (e.g., `/profile`)
- [ ] Verify redirects to `/login?redirect=/profile`
- [ ] Login successfully
- [ ] Verify redirects back to `/profile`

---

## 4. Password Reset Flow

### Request Password Reset

- [ ] Go to `/forgot-password`
- [ ] Enter registered email address
- [ ] Click "Send reset link"
- [ ] Verify success message shown
- [ ] Message doesn't reveal if email exists (security)

### Reset Email

- [ ] Check inbox for password reset email
- [ ] Email received from noreply@mychristiancounselor.com
- [ ] Email has reset link with token
- [ ] Link expires in 1 hour (check email)

### Complete Password Reset

- [ ] Click reset link in email
- [ ] Verify redirects to `/reset-password/[token]`
- [ ] Enter new password
- [ ] Password strength indicator shows:
  - Red "Too short" if < 8 chars
  - Yellow/Green as password improves
- [ ] Confirm new password (must match)
- [ ] Click "Reset Password"
- [ ] Verify success message
- [ ] Verify redirects to `/login` after 2 seconds

### Test New Password

- [ ] Login with new password
- [ ] Verify login successful
- [ ] Verify can access account

### Expired Token

- [ ] Request password reset
- [ ] Wait >1 hour OR manually expire token in database
- [ ] Try to use expired link
- [ ] Verify shows error message
- [ ] Verify can request new reset link

---

## 5. Email Verification Flow

### Resend Verification

- [ ] Register new account (don't verify)
- [ ] Go to `/resend-verification`
- [ ] Enter email address
- [ ] Click "Resend Verification Email"
- [ ] Verify success message
- [ ] Check inbox for new verification email
- [ ] Click link and verify works

### Already Verified

- [ ] Try to verify already-verified account
- [ ] Verify shows appropriate message

---

## 6. Home / Conversation Flow

### Anonymous User

- [ ] Go to `/home` while logged out
- [ ] Verify conversation view loads
- [ ] Enter a question
- [ ] Verify AI responds
- [ ] After 3-5 questions
- [ ] Verify registration prompt appears
- [ ] Can continue conversation after registering

### Authenticated User

- [ ] Go to `/home` while logged in
- [ ] Verify conversation view loads
- [ ] Verify user menu shows in top right
- [ ] Enter question about faith/counseling
- [ ] Verify AI responds with biblical guidance
- [ ] Verify scripture references included
- [ ] Verify Bible translation selector works
- [ ] Verify can switch translations
- [ ] Verify comparison mode works

### Session Management

- [ ] Start new conversation
- [ ] Go to `/history`
- [ ] Verify conversation appears in history
- [ ] Click on conversation
- [ ] Verify loads correctly
- [ ] Verify can continue conversation

---

## 7. Profile Management

### View Profile

- [ ] Go to `/profile`
- [ ] Verify shows correct user information
- [ ] Verify shows email, first name, last name
- [ ] Verify shows account type
- [ ] Verify shows Bible translation preferences

### Edit Profile

- [ ] Click "Edit" on personal information
- [ ] Change first name
- [ ] Change last name
- [ ] Click "Save Changes"
- [ ] Verify success message
- [ ] Refresh page
- [ ] Verify changes persist

### Change Password

- [ ] On profile page, expand password section
- [ ] Enter current password
- [ ] Enter new password
- [ ] Confirm new password
- [ ] Click "Change Password"
- [ ] Verify success message
- [ ] Logout and login with new password
- [ ] Verify works

### Change Bible Preferences

- [ ] Click "Edit" on Bible translation section
- [ ] Change preferred translation
- [ ] Update comparison translations
- [ ] Click "Save"
- [ ] Go to conversation view
- [ ] Verify new translation is used

---

## 8. Account Deletion (GDPR)

### Request Account Deletion

- [ ] Go to `/profile`
- [ ] Scroll to "Danger Zone" section
- [ ] Click "Delete My Account"
- [ ] Verify confirmation dialog appears
- [ ] Confirm deletion
- [ ] Verify password prompt appears
- [ ] Enter correct password
- [ ] Verify deletion request success message
- [ ] Message shows 30-day grace period
- [ ] Message shows deletion date
- [ ] Verify logged out automatically

### Verify Account Inactive

- [ ] Try to login with deleted account
- [ ] Verify login fails (account inactive)

### Recovery (Within 30 Days)

- [ ] Contact support to cancel deletion
- [ ] Admin reactivates account
- [ ] Verify can login again
- [ ] Verify all data intact

---

## 9. Subscription Flow

### View Subscription Plans

- [ ] Go to `/subscribe`
- [ ] Verify shows Premium Monthly plan
- [ ] Verify shows Premium Annual plan
- [ ] Verify shows Organization plan
- [ ] Verify pricing correct:
  - Monthly: $9.99/month
  - Annual: $99/year (17% savings)
  - Organization: $5/member/month (graduated)

### Subscribe (Premium Monthly)

- [ ] Click "Subscribe" on Premium Monthly
- [ ] Verify redirects to Stripe Checkout
- [ ] Verify shows correct plan and price
- [ ] Enter test credit card: `4242 4242 4242 4242`
- [ ] Enter expiry: any future date
- [ ] Enter CVC: any 3 digits
- [ ] Enter billing details
- [ ] Click "Pay"
- [ ] Verify redirects to `/subscribe/success`
- [ ] Verify success message shown

### Verify Subscription Active

- [ ] Go to `/profile` or `/settings/subscription`
- [ ] Verify shows "Premium - Monthly" status
- [ ] Verify shows next billing date
- [ ] Verify shows "Cancel Subscription" button

### Cancel Subscription

- [ ] Click "Cancel Subscription"
- [ ] Verify confirmation dialog
- [ ] Confirm cancellation
- [ ] Verify success message
- [ ] Verify subscription status = "Cancelled"
- [ ] Verify shows access until end of billing period

### Subscription Webhook

- [ ] Wait for webhook from Stripe (or trigger manually)
- [ ] Verify subscription status updates in database
- [ ] Verify user still has access until period ends

---

## 10. Organization Invitations

### Send Invitation (Org Admin)

- [ ] Login as org admin
- [ ] Go to org admin dashboard
- [ ] Click "Invite Member"
- [ ] Enter email address
- [ ] Select role
- [ ] Click "Send Invitation"
- [ ] Verify success message
- [ ] Check invitee's inbox for invitation email

### Accept Invitation (New User)

- [ ] Receive invitation email
- [ ] Click "Accept Invitation" link
- [ ] Verify redirects to `/invitations/accept/[token]`
- [ ] Verify shows "Login Required" message
- [ ] Click "Create Account"
- [ ] Verify redirects to `/register?redirect=...`
- [ ] Complete registration
- [ ] Verify redirects back to invitation page
- [ ] Verify auto-accepts invitation
- [ ] Verify shows success message
- [ ] Verify redirects to `/home` after 3 seconds

### Accept Invitation (Existing User)

- [ ] Login as existing user
- [ ] Click invitation link
- [ ] Verify auto-accepts invitation
- [ ] Verify shows success message
- [ ] Verify redirects to `/home`

### Verify Org Membership

- [ ] Go to `/profile`
- [ ] Verify shows organization membership
- [ ] Verify shows role in organization

### Wrong Email

- [ ] Send invitation to user-a@example.com
- [ ] Login as user-b@example.com
- [ ] Click invitation link
- [ ] Verify shows error: "Invitation not for this user"
- [ ] Verify suggests logging in with correct account

---

## 11. CSRF Protection

### Valid Requests

- [ ] Login normally
- [ ] Make API calls from app
- [ ] Verify all work correctly
- [ ] No CSRF errors

### Invalid Origin

- [ ] Open browser console
- [ ] Try to make API request from different origin:
```javascript
fetch('https://api.mychristiancounselor.com/profile', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json',
    'Origin': 'https://malicious-site.com'
  },
  body: JSON.stringify({})
});
```
- [ ] Verify request blocked with 403 Forbidden
- [ ] Verify error message about origin validation

---

## 12. Cookie Consent (GDPR)

### First Visit

- [ ] Clear browser data / use incognito
- [ ] Visit any page
- [ ] Verify cookie banner appears after 1 second
- [ ] Verify banner shows at bottom of screen
- [ ] Verify shows "Accept" and "Decline" buttons
- [ ] Verify has link to Privacy Policy

### Accept Cookies

- [ ] Click "Accept"
- [ ] Verify banner disappears
- [ ] Refresh page
- [ ] Verify banner doesn't reappear
- [ ] Check localStorage: `cookieConsent` = 'accepted'

### Decline Cookies

- [ ] Clear localStorage
- [ ] Refresh page
- [ ] Banner appears
- [ ] Click "Decline"
- [ ] Verify banner disappears
- [ ] Verify app still works (JWT in localStorage, not cookies)
- [ ] Check localStorage: `cookieConsent` = 'declined'

---

## 13. Database Backups

### Verify Automated Backups

- [ ] Check RDS console
- [ ] Verify backup retention = 7 days
- [ ] Verify automated backups exist
- [ ] Verify most recent backup < 24 hours old

### Manual Snapshot

- [ ] Run `./scripts/backup-database.sh "pre-launch"`
- [ ] Verify snapshot created
- [ ] Run `./scripts/list-backups.sh`
- [ ] Verify manual snapshot appears in list

### Backup Status Check

- [ ] Run `./scripts/verify-backup-status.sh`
- [ ] Verify no errors
- [ ] Verify retention = 7 days
- [ ] Verify latest restorable time is recent

---

## 14. Support System

### Create Support Ticket

- [ ] Go to `/support/new`
- [ ] Enter subject
- [ ] Enter description
- [ ] Click "Submit"
- [ ] Verify success message
- [ ] Verify redirects to ticket view

### View Tickets

- [ ] Go to `/support/tickets`
- [ ] Verify lists all tickets
- [ ] Click on a ticket
- [ ] Verify shows ticket details
- [ ] Verify shows messages

### Admin Response

- [ ] Login as admin
- [ ] Go to admin support dashboard
- [ ] View open ticket
- [ ] Add response
- [ ] Verify user receives email notification

---

## 15. Mobile Responsiveness

### Landing Page (Mobile)

- [ ] Visit `/` on mobile
- [ ] Verify hero section stacks correctly
- [ ] Verify feature cards stack (single column)
- [ ] Verify CTA buttons are tappable
- [ ] Verify nav menu collapses

### Conversation View (Mobile)

- [ ] Visit `/home` on mobile
- [ ] Verify message bubbles readable
- [ ] Verify input field accessible
- [ ] Verify can scroll conversation
- [ ] Verify user menu accessible

### Profile (Mobile)

- [ ] Visit `/profile` on mobile
- [ ] Verify form fields stack correctly
- [ ] Verify buttons are tappable
- [ ] Verify "Danger Zone" visible

---

## 16. Performance & Loading

### Page Load Times

- [ ] Measure landing page load: Target < 2 seconds
- [ ] Measure conversation view load: Target < 3 seconds
- [ ] Measure profile page load: Target < 2 seconds

### API Response Times

- [ ] Login: Target < 1 second
- [ ] Send message: Target < 5 seconds (AI response)
- [ ] Load history: Target < 2 seconds

### Concurrent Users

- [ ] Have 5 users testing simultaneously
- [ ] Verify no slowdowns
- [ ] Verify no errors
- [ ] Verify no database locks

---

## 17. Error Handling

### Network Errors

- [ ] Turn off WiFi mid-action
- [ ] Verify shows appropriate error message
- [ ] Turn WiFi back on
- [ ] Verify can retry action

### Server Errors

- [ ] Trigger 500 error (if possible)
- [ ] Verify shows user-friendly error
- [ ] Verify doesn't crash app
- [ ] Verify can navigate away

### Invalid Data

- [ ] Try to submit empty form
- [ ] Verify validation errors shown
- [ ] Try SQL injection in inputs
- [ ] Verify properly sanitized

---

## 18. Security

### XSS Prevention

- [ ] Try to inject script in profile fields:
  - `<script>alert('XSS')</script>`
- [ ] Verify scripts don't execute
- [ ] Verify properly escaped in UI

### SQL Injection

- [ ] Try SQL injection in login:
  - Email: `admin' OR '1'='1`
- [ ] Verify doesn't work
- [ ] Verify using parameterized queries

### JWT Expiry

- [ ] Login and get JWT
- [ ] Wait for token to expire (or manually expire)
- [ ] Try to access protected page
- [ ] Verify redirects to login
- [ ] Login again
- [ ] Verify works normally

---

## 19. Admin Functions

### View Admin Dashboard

- [ ] Login as platform admin
- [ ] Go to `/admin`
- [ ] Verify shows overview stats
- [ ] Verify shows user count
- [ ] Verify shows organization count

### User Management

- [ ] Go to `/admin/users`
- [ ] Verify lists all users
- [ ] Click on a user
- [ ] Verify shows user details
- [ ] Verify can view user's organizations
- [ ] Verify can view user's sessions

### Organization Management

- [ ] Go to `/admin/organizations`
- [ ] Verify lists all organizations
- [ ] Click on an organization
- [ ] Verify shows org details
- [ ] Verify shows members list
- [ ] Verify can manage members

---

## 20. Legal Pages

### Privacy Policy

- [ ] Go to `/legal/privacy`
- [ ] Verify page loads
- [ ] Verify content is readable
- [ ] Verify covers all required sections:
  - Data collection
  - Data usage
  - Data sharing
  - User rights (GDPR)
  - Cookie policy
  - Account deletion

### Terms of Service

- [ ] Go to `/legal/terms`
- [ ] Verify page loads
- [ ] Verify content is readable
- [ ] Verify covers all required sections

---

## Post-Testing Actions

### Issues Found

- [ ] Document all issues in GitHub/project tracker
- [ ] Prioritize: Critical, High, Medium, Low
- [ ] Fix all Critical and High priority issues
- [ ] Verify fixes with regression testing

### Performance Baseline

- [ ] Record baseline metrics:
  - Average page load time
  - Average API response time
  - Database query times
- [ ] Set up monitoring alerts

### Launch Readiness

- [ ] All critical flows tested and working
- [ ] All critical bugs fixed
- [ ] Backups verified
- [ ] Monitoring set up
- [ ] Support system ready
- [ ] Team trained on support procedures

---

## Testing Notes

**Test Users:**
- Regular user: test-user@example.com
- Premium user: premium-user@example.com
- Org admin: org-admin@example.com
- Platform admin: admin@example.com

**Test Credit Cards (Stripe):**
- Success: 4242 4242 4242 4242
- Decline: 4000 0000 0000 0002
- Auth required: 4000 0025 0000 3155

**Testing Environment:**
- API: https://api.mychristiancounselor.com
- Web: https://app.mychristiancounselor.com
- Database: Production (or staging mirror)

**Timeline:**
- Allow 4-8 hours for complete testing
- Test with at least 2 different people
- Test on multiple devices and browsers
