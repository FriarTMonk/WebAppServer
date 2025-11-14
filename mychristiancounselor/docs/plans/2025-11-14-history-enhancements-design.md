# Conversation History Enhancements Design

**Date:** 2025-11-14
**Status:** Validated and Ready for Implementation

## Overview

This design enhances the existing conversation history feature with sharing capabilities, comprehensive search/filtering, archive functionality, and subscription-based access control. The key requirement is implementing clarifying question limits based on user tier.

## User Tiers & Access Levels

### Anonymous Users
- **Clarifying Questions:** 0 (immediate answer only)
- **History Access:** No
- **Sharing:** No
- **Archive:** No

### Registered Users (No Subscription)
- **Clarifying Questions:** Up to 3 from counselor
- **History Access:** No
- **Sharing:** No
- **Archive:** No

### Subscribed Users
- **Clarifying Questions:** Up to 9 from counselor
- **History Access:** Yes (full access)
- **Sharing:** Yes (organization + email based)
- **Archive:** Yes (with 30-day auto-delete)
- **Search/Filter:** Yes (full-text + topics + dates)

## Database Schema

### User Model Updates
```prisma
model User {
  // ... existing fields ...
  subscriptionStatus String   @default("none") // 'none' | 'active' | 'canceled' | 'past_due'
  subscriptionTier   String?  // 'basic' | 'premium'
  subscriptionStart  DateTime?
  subscriptionEnd    DateTime?
  stripeCustomerId   String?  @unique // For future Stripe integration

  subscriptions Subscription[]
}
```

### New Subscription Model
```prisma
model Subscription {
  id                String   @id @default(uuid())
  userId            String
  status            String   // 'active' | 'canceled' | 'past_due' | 'expired'
  tier              String   @default("basic")
  startDate         DateTime @default(now())
  endDate           DateTime?
  stripeSubscriptionId String? @unique
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}
```

### Session Model Updates
```prisma
model Session {
  // ... existing fields ...
  status         String    @default("active") // 'active' | 'archived' | 'deleted'
  questionCount  Int       @default(0) // Count of counselor's clarifying questions
  archivedAt     DateTime?
  deletedAt      DateTime? // archivedAt + 30 days

  shares SessionShare[]
}
```

### New SessionShare Model
```prisma
model SessionShare {
  id             String   @id @default(uuid())
  sessionId      String
  shareToken     String   @unique // UUID for shareable link
  sharedBy       String   // userId who created the share
  sharedWith     String?  // email address (null = org-wide)
  organizationId String?  // If shared org-wide
  createdAt      DateTime @default(now())
  expiresAt      DateTime?

  session Session @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([shareToken])
  @@index([sessionId])
}
```

### Message Model Update
```prisma
model Message {
  // ... existing fields ...

  // Add full-text search index (PostgreSQL)
  @@index([content], type: FullText)
}
```

## API Endpoints

### Subscription Management
```
POST   /subscriptions/create
  - Create subscription for user
  - Sets subscriptionStatus='active', startDate=now

GET    /subscriptions/status
  - Get current user's subscription status and limits

POST   /subscriptions/cancel
  - Cancel subscription (status='canceled', sets endDate)
```

### Counsel Endpoint (Enhanced)
```
POST   /counsel/ask
  - Check user tier and get max clarifying questions:
    * Anonymous: maxClarifyingQuestions = 0
    * Registered: maxClarifyingQuestions = 3
    * Subscribed: maxClarifyingQuestions = 9
  - Track session.questionCount (counselor's clarifying questions)
  - AI decides IF and HOW MANY clarifying questions to ask (up to max)
  - If questionCount >= max, AI must provide final answer
```

### History Endpoints (Subscribed Only)
```
GET    /profile/history?search=text&topics=faith,prayer&dateFrom=2024-01-01&dateTo=2024-12-31
  - Requires: user.subscriptionStatus === 'active'
  - Query params:
    * search: full-text search across title and message content
    * topics: comma-separated topic filter
    * dateFrom/dateTo: date range filter
  - Returns: Filtered ConversationSummary[]

GET    /counsel/session/:id
  - Allow if: owner OR valid shareToken OR admin
```

### Sharing Endpoints (Subscribed Only)
```
POST   /counsel/share/:sessionId
  - Body: { sharedWith?: string, organizationId?: string, expiresAt?: Date }
  - Returns: { shareToken: string, shareUrl: string }

GET    /counsel/shared/:shareToken
  - Public endpoint (no auth required if token valid)
  - Returns: Full conversation with read-only flag

GET    /counsel/share/:sessionId/list
  - List all shares for a conversation (owner only)

DELETE /counsel/share/:shareId
  - Revoke a share link
```

### Archive/Delete Endpoints (Subscribed Only)
```
PATCH  /profile/conversations/:sessionId/archive
  - Sets status='archived', archivedAt=now, deletedAt=now+30days

PATCH  /profile/conversations/:sessionId/restore
  - Sets status='active', clears archivedAt/deletedAt

GET    /profile/conversations/archived
  - List archived conversations with days until deletion

DELETE /profile/conversations/:sessionId
  - Immediate hard delete (admin only or if past deletedAt)
```

### Background Job
```
Daily Cron Job:
  - Hard delete sessions where status='deleted' AND deletedAt < now
```

## Frontend Components

### Main Conversation Page (`/app/page.tsx`)
**Clarifying Question Progress Indicator:**
- Anonymous: "One-time answer only" message
- Registered: "Up to 3 clarifying questions" with progress (X of 3 used)
- Subscribed: "Up to 9 clarifying questions" with progress (X of 9 used)

**Upgrade Prompts:**
- Anonymous reaching limit: "Sign up for more detailed counseling"
- Registered reaching limit: "Upgrade to premium for deeper exploration"

### History Page (`/app/history/page.tsx` - Subscribers Only)
**Access Control:**
- Check `user.subscriptionStatus === 'active'` on mount
- Show `<UpgradePrompt>` if not subscribed

**Search/Filter UI:**
- Full-text search bar (debounced input)
- Topic multi-select dropdown (from existing topics)
- Date range picker:
  * Preset options: Last 7 days, Last 30 days, All time
  * Custom date range
- Active/Archived tabs

**Conversation Cards:**
- Share button (opens modal)
- Archive button (with confirmation)
- Restore button (if archived)
- "X days until deletion" badge (if archived)

### Share Modal Component (`/components/ShareConversationModal.tsx`)
**Two Sharing Options:**

1. Share with Organization
   - Radio: All members / Specific members
   - Member selector dropdown (if specific)
   - Copy link button

2. Share with Email
   - Email input (multi-add support)
   - Optional expiration date picker
   - Copy link button

**Active Shares Section:**
- List of current shares with recipient info
- Revoke button for each
- Copy link button for each

### Shared Conversation View (`/app/shared/[token]/page.tsx`)
**Public Read-Only Page:**
- No authentication required (token-based access)
- "Read-only" badge at top
- Full conversation display
- No edit/share/archive buttons
- "Create your own account" CTA footer
- Handle expired/invalid tokens gracefully

## Implementation Priority

1. **Subscription System** (Foundation)
   - Database schema updates
   - Subscription models and endpoints
   - Basic subscription management (manual creation for now)

2. **Clarifying Question Limits** (Most Critical)
   - Update counsel.service to check tier and enforce limits
   - Pass maxClarifyingQuestions to AI service
   - Track questionCount in sessions
   - Frontend progress indicators

3. **Sharing Feature** (High Priority)
   - SessionShare model and endpoints
   - Share modal component
   - Shared conversation view page
   - Organization + email-based access control

4. **Search/Filter** (Medium Priority)
   - Full-text search setup (PostgreSQL)
   - Enhanced history endpoint with query params
   - Frontend search/filter UI

5. **Archive/Delete** (Medium Priority)
   - Archive endpoints
   - Time-based auto-delete logic
   - Background cleanup job
   - Frontend archive UI

6. **Export Multiple Conversations** (Low Priority - Future)
   - Batch export functionality
   - PDF generation for multiple conversations

## Security Considerations

- Validate share tokens server-side before granting access
- Ensure users can only share their own conversations
- Implement rate limiting on share link creation
- Sanitize all user inputs in search queries
- Verify subscription status on all protected endpoints
- Use parameterized queries for full-text search to prevent SQL injection

## Testing Strategy

- Unit tests for subscription status checks
- Integration tests for sharing workflows
- End-to-end tests for search/filter functionality
- Test clarifying question limit enforcement at each tier
- Test archive auto-delete job
- Test access control for shared conversations
