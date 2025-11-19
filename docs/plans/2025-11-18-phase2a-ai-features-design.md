# Phase 2A: AI Features - Design Document

**Date:** 2025-11-18
**Phase:** 2A (AI Features)
**Status:** Design Complete
**Prerequisites:** Phase 1 MVP Complete

## Overview

Add AI-powered features to the support ticket system to reduce admin workload by automatically detecting ticket priority and surfacing similar/duplicate tickets using Claude AI.

## Core Components

### 1. AI Priority Detection Service
- Runs once when ticket is created
- Uses Claude 3.5 Haiku for fast, cost-effective classification
- Analyzes title + description → assigns priority level
- Fails gracefully: defaults to "medium" if API unavailable

### 2. AI Similarity Service
Two-tier system:
- **Real-time:** Finds similar unresolved tickets (when viewing detail page)
- **Weekly batch:** Comprehensive historical search (runs Sunday 2 AM)
- Uses Claude 3.5 Sonnet for better semantic understanding
- Results cached in database for performance

### 3. Frontend Enhancements
- Two tabs on ticket detail page: "Similar Active Tickets" + "Historical Solutions"
- Color-coded similarity badges (yellow 60-79%, red 80-100%)
- Admin actions to link/dismiss suggestions

## Data Flow

1. **Ticket Creation:**
   - User submits ticket → AI priority detection → ticket saved with priority

2. **Real-time Similarity:**
   - User views ticket detail → Real-time similarity check → display active matches

3. **Weekly Batch:**
   - Sunday 2 AM → Batch similarity analysis → cache results → display historical matches

---

## Database Schema Changes

### 1. Add Resolution Field to SupportTicket

```prisma
model SupportTicket {
  // ... existing fields ...

  resolution    String?   @db.Text  // Admin's resolution summary
  resolvedAt    DateTime?            // Existing
  resolvedById  String?              // Track who resolved it
  resolvedBy    User?     @relation("TicketsResolved", fields: [resolvedById], references: [id])

  // ... rest of model
}
```

**Purpose:** When admin marks ticket as resolved, they must enter resolution text. This becomes searchable context for similarity matching.

### 2. New TicketSimilarity Table

```prisma
model TicketSimilarity {
  id                String   @id @default(uuid())
  sourceTicketId    String   // The ticket we're finding matches for
  similarTicketId   String   // The similar ticket found
  similarityScore   Float    // 0-100 score from Claude API
  matchType         String   // "active" or "historical"
  analyzedAt        DateTime @default(now())
  expiresAt         DateTime // TTL: active=1 hour, historical=7 days

  sourceTicket      SupportTicket @relation("SimilaritySource", fields: [sourceTicketId], references: [id], onDelete: Cascade)
  similarTicket     SupportTicket @relation("SimilarityTarget", fields: [similarTicketId], references: [id], onDelete: Cascade)

  @@unique([sourceTicketId, similarTicketId, matchType])
  @@index([sourceTicketId, matchType, expiresAt])
  @@index([expiresAt]) // For cleanup job
}
```

**Expiration Strategy:**
- Active matches: 1 hour TTL (recalculated on each view)
- Historical matches: 7 day TTL (weekly batch job)
- Cleanup job runs daily to delete expired records

---

## AI Priority Detection Implementation

### Integration Point
Modify existing `createTicket` service method (Task 3 from Phase 1).

### Flow
1. User submits ticket (title, description, category, optional priority)
2. If user specified priority → use it (skip AI)
3. If user left priority blank/default → call AI service
4. AI analyzes content → returns priority
5. Save ticket with AI-determined priority

### AI Service Implementation

```typescript
class AiService {
  async detectPriority(title: string, description: string): Promise<string> {
    const prompt = `Analyze this support ticket and classify its priority level.

Ticket Title: ${title}
Ticket Description: ${description}

Priority Levels:
- urgent: System is completely down or unusable
- high: Major functionality is broken affecting multiple users
- medium: Minor issues, glitches, or questions
- low: Cosmetic issues or non-urgent questions
- feature: Feature request or enhancement

Return ONLY the priority level (urgent/high/medium/low/feature) with no explanation.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 10,
      messages: [{ role: 'user', content: prompt }]
    });

    // Parse and validate response
    const priority = response.content[0].text.trim().toLowerCase();
    if (!['urgent', 'high', 'medium', 'low', 'feature'].includes(priority)) {
      return 'medium'; // fallback
    }
    return priority;
  }
}
```

### Error Handling
- API timeout: 5 seconds
- If fails → default to "medium" + alert admins
- Log all AI decisions for audit trail

---

## AI Ticket Similarity Implementation

### 4.1 Real-Time Similarity (Active Tickets)

**When:** User views ticket detail page
**Scope:** Compare against unresolved tickets only
**Threshold:** 60+ similarity score
**Caching:** 1 hour TTL

```typescript
class AiService {
  async findSimilarActiveTickets(ticketId: string): Promise<SimilarityResult[]> {
    // 1. Check cache first (1 hour TTL)
    const cached = await prisma.ticketSimilarity.findMany({
      where: {
        sourceTicketId: ticketId,
        matchType: 'active',
        expiresAt: { gt: new Date() }
      }
    });
    if (cached.length > 0) return cached;

    // 2. Fetch source ticket
    const ticket = await prisma.supportTicket.findUnique({
      where: { id: ticketId },
      select: { id: true, title: true, description: true }
    });

    // 3. Get all unresolved tickets (exclude self)
    const candidates = await prisma.supportTicket.findMany({
      where: {
        id: { not: ticketId },
        status: { in: ['open', 'in_progress', 'waiting_on_user'] }
      },
      select: { id: true, title: true, description: true }
    });

    // 4. Batch similarity check via Claude (max 20 candidates)
    const results = await this.batchSimilarityCheck(
      ticket,
      candidates.slice(0, 20)
    );

    // 5. Filter by threshold (60+) and cache
    const filtered = results.filter(r => r.score >= 60);
    await this.cacheSimilarityResults(ticketId, filtered, 'active', 1); // 1 hour

    return filtered;
  }

  async batchSimilarityCheck(
    sourceTicket: Ticket,
    candidates: Ticket[]
  ): Promise<SimilarityResult[]> {
    const prompt = `Compare this ticket to the following tickets and return similarity scores (0-100).

SOURCE TICKET:
Title: ${sourceTicket.title}
Description: ${sourceTicket.description}

CANDIDATE TICKETS:
${candidates.map((t, i) => `
[${i}] ID: ${t.id}
Title: ${t.title}
Description: ${t.description}
`).join('\n')}

Return JSON array: [{"index": 0, "score": 85}, {"index": 1, "score": 42}, ...]
Only include scores above 40.`;

    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }]
    });

    const results = JSON.parse(response.content[0].text);
    return results.map(r => ({
      similarTicketId: candidates[r.index].id,
      score: r.score
    }));
  }
}
```

### 4.2 Weekly Batch (Historical Solutions)

**When:** Scheduled job, Sunday 2 AM
**Scope:** Compare all unresolved tickets against all resolved tickets
**Threshold:** 80+ similarity score
**Caching:** 7 day TTL

```typescript
async weeklyHistoricalSimilarity() {
  logger.info('Starting weekly historical similarity batch job');

  // 1. Get all unresolved tickets
  const unresolvedTickets = await prisma.supportTicket.findMany({
    where: {
      status: { in: ['open', 'in_progress', 'waiting_on_user'] }
    },
    select: { id: true, title: true, description: true }
  });

  // 2. Get all resolved tickets with resolutions
  const resolvedTickets = await prisma.supportTicket.findMany({
    where: {
      status: { in: ['resolved', 'closed'] },
      resolution: { not: null }
    },
    select: { id: true, title: true, description: true, resolution: true }
  });

  logger.info(`Processing ${unresolvedTickets.length} unresolved tickets against ${resolvedTickets.length} resolved tickets`);

  // 3. For each unresolved ticket, find similar resolved tickets
  for (const ticket of unresolvedTickets) {
    try {
      // Process in batches to avoid rate limits
      await this.rateLimiter.wait(); // 10 tickets/minute

      const results = await this.batchSimilarityCheckWithResolution(
        ticket,
        resolvedTickets
      );

      // Filter by higher threshold (80+)
      const filtered = results.filter(r => r.score >= 80);

      // Cache for 7 days
      await this.cacheSimilarityResults(ticket.id, filtered, 'historical', 7);

      logger.info(`Found ${filtered.length} historical matches for ticket ${ticket.id}`);
    } catch (error) {
      logger.error(`Failed to process ticket ${ticket.id}`, { error });
      // Continue with next ticket
    }
  }

  logger.info('Weekly historical similarity batch job completed');
}

async batchSimilarityCheckWithResolution(
  sourceTicket: Ticket,
  resolvedTickets: Ticket[]
): Promise<SimilarityResult[]> {
  const prompt = `Compare this unresolved ticket to resolved tickets and find similar issues.

UNRESOLVED TICKET:
Title: ${sourceTicket.title}
Description: ${sourceTicket.description}

RESOLVED TICKETS:
${resolvedTickets.slice(0, 20).map((t, i) => `
[${i}] ID: ${t.id}
Title: ${t.title}
Description: ${t.description}
Resolution: ${t.resolution}
`).join('\n')}

Return JSON array with similarity scores (0-100): [{"index": 0, "score": 85}, ...]
Only include scores above 60.`;

  const response = await anthropic.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  });

  const results = JSON.parse(response.content[0].text);
  return results.map(r => ({
    similarTicketId: resolvedTickets[r.index].id,
    score: r.score
  }));
}
```

---

## Frontend Changes

### 5.1 Ticket Detail Page - Tabbed Interface

Add tabs below ticket info, above conversation thread:

```tsx
<div className="mt-6 border-t pt-6">
  <Tabs defaultTab="active">
    {/* Tab 1: Similar Active Tickets */}
    <Tab
      id="active"
      label="Similar Active Tickets"
      count={activeMatches.length}
    >
      {activeMatches.length === 0 ? (
        <p className="text-gray-500 py-4">No similar active tickets found</p>
      ) : (
        activeMatches.map(match => (
          <SimilarityCard
            key={match.id}
            ticket={match.similarTicket}
            score={match.similarityScore}
            badge={match.similarityScore >= 80 ? 'red' : 'yellow'}
            actions={
              <>
                <button
                  onClick={() => linkTickets(match.similarTicketId, 'duplicate')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Link as Duplicate
                </button>
                <button
                  onClick={() => dismissSuggestion(match.id)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Dismiss
                </button>
              </>
            }
          />
        ))
      )}
    </Tab>

    {/* Tab 2: Historical Solutions */}
    <Tab
      id="historical"
      label="Historical Solutions"
      count={historicalMatches.length}
    >
      {historicalMatches.length === 0 ? (
        <p className="text-gray-500 py-4">
          No similar resolved tickets found. Check back after Sunday's analysis.
        </p>
      ) : (
        historicalMatches.map(match => (
          <SimilarityCard
            key={match.id}
            ticket={match.similarTicket}
            score={match.similarityScore}
            resolution={match.similarTicket.resolution}
            badge="green"
            actions={
              <>
                <button
                  onClick={() => linkTickets(match.similarTicketId, 'related')}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Link as Reference
                </button>
                <button
                  onClick={() => dismissSuggestion(match.id)}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Dismiss
                </button>
              </>
            }
          />
        ))
      )}
    </Tab>
  </Tabs>
</div>
```

### 5.2 Similarity Card Component

```tsx
interface SimilarityCardProps {
  ticket: SupportTicket;
  score: number;
  badge: 'red' | 'yellow' | 'green';
  resolution?: string;
  actions: ReactNode;
}

function SimilarityCard({ ticket, score, badge, resolution, actions }: SimilarityCardProps) {
  const badgeColors = {
    red: 'bg-red-100 text-red-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    green: 'bg-green-100 text-green-800'
  };

  return (
    <div className="border rounded-lg p-4 mb-3 hover:bg-gray-50">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-2 mb-2">
            <Link
              href={`/support/tickets/${ticket.id}`}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              #{ticket.id.substring(0, 8)} - {ticket.title}
            </Link>
            <span className={`px-2 py-1 rounded-full text-xs ${badgeColors[badge]}`}>
              {score}% match
            </span>
            <StatusBadge status={ticket.status} />
          </div>

          {/* Description preview */}
          <p className="text-sm text-gray-600 mb-2">
            {ticket.description.substring(0, 200)}...
          </p>

          {/* Resolution (if historical) */}
          {resolution && (
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
              <p className="text-xs font-semibold text-blue-800 mb-1">Resolution:</p>
              <p className="text-sm text-blue-900">{resolution}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 text-sm">
            {actions}
          </div>
        </div>
      </div>
    </div>
  );
}
```

### 5.3 Priority Display Enhancement

Show AI indicator when priority was auto-detected:

```tsx
<div className="flex items-center gap-2">
  <span className="font-semibold">Priority:</span>
  <PriorityBadge priority={ticket.priority} />
  {ticket.aiDetectedPriority && (
    <span
      title="Priority detected by AI"
      className="text-xs text-gray-500"
    >
      🤖 AI
    </span>
  )}
</div>
```

### 5.4 Resolution Input on Resolve

Modify "Mark as Resolved" action to require resolution:

```tsx
<button onClick={() => setShowResolveModal(true)}>
  Mark as Resolved
</button>

{showResolveModal && (
  <Modal title="Resolve Ticket">
    <p className="mb-4">Please provide a summary of how this issue was resolved:</p>
    <textarea
      value={resolution}
      onChange={(e) => setResolution(e.target.value)}
      placeholder="Describe the solution or steps taken to resolve this issue..."
      className="w-full border rounded p-2 mb-4"
      rows={5}
      minLength={20}
      maxLength={2000}
    />
    <div className="flex gap-2">
      <button
        onClick={() => handleResolve(ticketId, resolution)}
        disabled={resolution.trim().length < 20}
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Confirm Resolution
      </button>
      <button onClick={() => setShowResolveModal(false)}>
        Cancel
      </button>
    </div>
  </Modal>
)}
```

---

## Error Handling & Monitoring

### 6.1 Error Handling Strategy

```typescript
// Priority Detection
async createTicketWithAI(data: CreateTicketDto, userId: string) {
  let priority = data.priority;

  // Only run AI if user didn't specify priority
  if (!priority || priority === 'medium') {
    try {
      priority = await this.aiService.detectPriority(
        data.title,
        data.description
      );
      data.aiDetectedPriority = true;
    } catch (error) {
      this.logger.error('AI priority detection failed', {
        error,
        title: data.title
      });

      // Alert admins
      await this.notifyAdmins(
        'AI Service Alert',
        'Priority detection service is unavailable. Tickets defaulting to medium priority.'
      );

      // Safe fallback
      priority = 'medium';
      data.aiDetectedPriority = false;
    }
  }

  // Continue with ticket creation
  return this.createTicket({ ...data, priority }, userId);
}

// Similarity Search
async getSimilarTickets(ticketId: string, matchType: 'active' | 'historical') {
  try {
    if (matchType === 'active') {
      return await this.aiService.findSimilarActiveTickets(ticketId);
    } else {
      return await this.aiService.getCachedHistoricalMatches(ticketId);
    }
  } catch (error) {
    this.logger.error('AI similarity search failed', { error, ticketId });
    // Return empty array - don't block page load
    return [];
  }
}
```

### 6.2 Admin Alerts

When AI services fail, notify platform admins:

```typescript
async notifyAdmins(subject: string, message: string) {
  // Get all platform admins
  const admins = await this.prisma.user.findMany({
    where: { isPlatformAdmin: true },
    select: { email: true, firstName: true }
  });

  // Send email alert (when EmailModule exists)
  for (const admin of admins) {
    await this.emailService.send({
      to: admin.email,
      subject: `[MyChristianCounselor] ${subject}`,
      body: `
        Hi ${admin.firstName},

        ${message}

        Timestamp: ${new Date().toISOString()}

        Please check the admin dashboard for more details.
      `
    });
  }

  // Also log to monitoring system
  this.logger.warn('Admin alert sent', { subject, message });
}
```

### 6.3 Rate Limiting

**Claude API Limits:**
- Haiku: 10,000 requests/minute
- Sonnet: 2,000 requests/minute

**Mitigation Strategies:**

1. **Batch Processing:**
   - Compare 1 ticket vs 20 candidates in single API call
   - Reduces API calls by 20x

2. **Aggressive Caching:**
   - Active matches: 1 hour cache
   - Historical matches: 7 day cache
   - Reduces redundant API calls

3. **Rate Limiter for Batch Jobs:**
```typescript
class RateLimiter {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async wait() {
    // Process max 10 tickets per minute (Sonnet limit / safety margin)
    await new Promise(resolve => setTimeout(resolve, 6000)); // 6 seconds
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    await this.wait();
    return fn();
  }
}
```

### 6.4 Cost Estimation

**Assumptions:**
- 1,000 tickets created per month
- 500 ticket detail page views per month
- 50 unresolved tickets at any time
- 1,000 total resolved tickets

**Monthly Costs:**

| Feature | Model | Volume | Cost per Call | Monthly Cost |
|---------|-------|--------|--------------|--------------|
| Priority Detection | Haiku | 1,000 tickets | $0.0001 | **$0.10** |
| Real-time Similarity | Sonnet | 500 views × 20 comparisons | $0.003 | **$30.00** |
| Weekly Batch | Sonnet | 50 unresolved × 1,000 resolved × 4 weeks ÷ 20 batch | $0.003 × 10,000 | **$600.00** |

**Total Estimated Cost: ~$630/month**

**Cost Optimization Options:**
- Reduce batch frequency (bi-weekly instead of weekly): -$300/month
- Limit historical search to last 6 months: -$200/month
- Use Haiku for similarity (lower quality): -$500/month

### 6.5 Monitoring & Logging

**Key Metrics to Track:**

1. **AI Service Health:**
   - Success rate (target: >99%)
   - Average response time
   - Error rate by service (priority vs similarity)

2. **Usage Metrics:**
   - API calls per day
   - Cost per day
   - Cache hit rate

3. **Quality Metrics:**
   - Admin overrides of AI priority (indicates accuracy)
   - Similarity suggestions accepted vs dismissed
   - Linked tickets from AI suggestions

**Dashboard:**
```typescript
interface AiMetrics {
  priorityDetection: {
    totalCalls: number;
    successRate: number;
    avgResponseTime: number;
    overrideRate: number; // How often admins change AI priority
  };
  similaritySearch: {
    activeCalls: number;
    historicalCacheHits: number;
    avgSimilaritiesFound: number;
    acceptanceRate: number; // % of suggestions linked by admins
  };
  costs: {
    dailySpend: number;
    monthlyProjection: number;
  };
}
```

---

## Implementation Checklist

### Backend Tasks

**Database:**
- [ ] Add `resolution`, `resolvedById`, `aiDetectedPriority` fields to SupportTicket model
- [ ] Add `resolvedBy` relation to User model
- [ ] Create TicketSimilarity model
- [ ] Create migration
- [ ] Run migration

**AI Service:**
- [ ] Create AiService class
- [ ] Implement `detectPriority()` method (Haiku)
- [ ] Implement `batchSimilarityCheck()` method (Sonnet)
- [ ] Implement `findSimilarActiveTickets()` method
- [ ] Implement `getCachedHistoricalMatches()` method
- [ ] Implement `weeklyHistoricalSimilarity()` batch job
- [ ] Add rate limiter for batch processing
- [ ] Add error handling and logging

**Ticket Service:**
- [ ] Modify `createTicket()` to call AI priority detection
- [ ] Modify `resolveTicket()` to require resolution text
- [ ] Add `getSimilarTickets()` method for frontend
- [ ] Add `linkTickets()` method (use existing TicketLink)
- [ ] Add `dismissSuggestion()` method (delete from TicketSimilarity)

**Scheduled Jobs:**
- [ ] Create cron job for weekly batch (Sunday 2 AM)
- [ ] Create daily cleanup job (delete expired TicketSimilarity records)

**API Endpoints:**
- [ ] `GET /support/tickets/:id/similar?type=active` - Get similar active tickets
- [ ] `GET /support/tickets/:id/similar?type=historical` - Get historical matches
- [ ] `POST /support/tickets/:id/link` - Link tickets
- [ ] `DELETE /support/similarity/:id` - Dismiss suggestion

### Frontend Tasks

**Ticket Detail Page:**
- [ ] Add tabs component (Similar Active / Historical Solutions)
- [ ] Create SimilarityCard component
- [ ] Fetch and display similar tickets
- [ ] Add "Link" and "Dismiss" actions
- [ ] Show AI indicator on priority badge
- [ ] Handle empty states

**Resolve Modal:**
- [ ] Add resolution textarea to resolve modal
- [ ] Add validation (20-2000 chars)
- [ ] Update resolve API call to include resolution

**Admin Dashboard:**
- [ ] Add AI service status indicator
- [ ] Show alerts when AI services fail

### Testing

**Backend:**
- [ ] Test AI priority detection with various ticket content
- [ ] Test similarity matching accuracy
- [ ] Test batch job execution
- [ ] Test error handling (API failures)
- [ ] Test rate limiting
- [ ] Load test (ensure performance with 1000s of tickets)

**Frontend:**
- [ ] Test tab navigation
- [ ] Test similarity card actions
- [ ] Test resolution modal
- [ ] Test empty states
- [ ] Mobile responsiveness

---

## Success Criteria

1. **Priority Detection:**
   - AI accurately classifies 90%+ of tickets
   - Admin override rate < 10%
   - No ticket creation failures due to AI

2. **Similarity Matching:**
   - 80%+ of AI suggestions are relevant
   - Admins link at least 30% of suggestions
   - Cached results always available (no loading delays)

3. **Performance:**
   - Ticket creation: < 2 seconds (including AI)
   - Page load with similarities: < 3 seconds
   - Weekly batch completes in < 6 hours

4. **Cost:**
   - Stay under $700/month budget
   - Track costs daily for monitoring

---

## Future Enhancements (Not in Scope)

- Multi-language support for AI analysis
- Custom similarity weights per category
- ML model fine-tuning on historical data
- Admin-configurable similarity thresholds
- Automated ticket merging for high-confidence duplicates
- AI-suggested responses based on similar ticket resolutions

---

## Rollout Plan

**Phase 1: Priority Detection (Week 1)**
- Deploy AI priority detection
- Monitor accuracy for 1 week
- Gather admin feedback

**Phase 2: Real-time Similarity (Week 2)**
- Deploy active ticket similarity
- Test with subset of users
- Refine thresholds based on feedback

**Phase 3: Historical Batch (Week 3)**
- Deploy weekly batch job
- Run first batch manually to validate
- Enable automatic scheduling

**Phase 4: Optimization (Week 4)**
- Analyze metrics and costs
- Tune similarity thresholds
- Add monitoring dashboards

---

**Design Status:** ✅ Complete and Validated
**Next Step:** Create implementation plan and begin development
