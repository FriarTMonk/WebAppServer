# MyChristianCounselor - Feature Overview

## High-Level Summary

**MyChristianCounselor** is a comprehensive AI-powered Biblical counseling platform that provides faith-based emotional and spiritual support. The platform combines advanced AI technology (GPT models) with Biblical scripture to offer personalized guidance, while integrating church organization management, professional counselor oversight, and crisis intervention capabilities.

The system serves three primary user types:
1. **Individual Users** - Seeking personal Biblical counseling and spiritual guidance
2. **Organizations (Churches/Ministries)** - Managing members and providing pastoral care at scale
3. **Platform Administrators** - Overseeing the entire platform, support, and multi-organization operations

---

## Core Features

### 1. AI-Powered Biblical Counseling

**Description:** The heart of the platform - conversational AI that provides personalized Biblical guidance and emotional support based on scripture.

**What it provides:**
- Real-time conversational counseling sessions with AI trained on Biblical principles
- Contextual scripture references from 8 Bible translations (KJV, ASV, NIV, ESV, NASB, NKJV, NLT, YLT)
- Personalized responses based on user's situation and emotional state
- Strong's Concordance integration for deep word study and original language insights
- Session history tracking with ability to continue previous conversations
- Anonymous counseling option for privacy-sensitive users
- Clarifying question mechanism - AI asks thoughtful questions to better understand context before responding
- Topic tagging to categorize discussion themes (grief, anxiety, relationships, faith doubts, etc.)
- Multiple Bible translation comparison mode for deeper scriptural understanding
- Constitutional principles integration (optional theological framework)

**Technical Features:**
- Powered by OpenAI GPT models with custom system prompts
- Context-aware responses considering full conversation history
- Configurable response length and detail level
- Rate limiting to prevent abuse
- Response streaming for better user experience

---

### 2. Layered Crisis & Grief Detection

**Description:** Advanced safety system that identifies users in crisis (suicide, self-harm, abuse) or experiencing grief, providing immediate resources and alerts.

**What it provides:**
- **Three-layer detection system:**
  - Layer 1: High-confidence pattern matching (instant, no AI needed)
  - Layer 2: Medium-confidence patterns validated by AI for context
  - Layer 3: Full AI contextual analysis with fallback to patterns
- Automatic crisis resource provision (suicide hotlines, domestic violence support)
- Grief support resources when loss is detected
- Confidence scoring (high/medium/low) for detection accuracy
- Detection method tracking (pattern-only, AI-only, or both)
- User feedback collection for continuous improvement
- Email alerts to designated support contacts when crisis detected
- Separate handling for crisis (immediate danger) vs grief (emotional support)
- Anonymous detection tracking with privacy protection
- False positive minimization through contextual AI analysis

**Safety Resources Provided:**
- National Suicide Prevention Lifeline
- Crisis Text Line
- Domestic Violence Hotline
- Local emergency services (911)
- Faith-based crisis counseling resources
- Grief support materials and Biblical comfort passages

---

### 3. User Authentication & Account Management

**Description:** Secure user registration and authentication system with email verification and password recovery.

**What it provides:**
- Email/password registration with secure bcrypt password hashing
- Email verification via token sent to user's inbox
- Password reset functionality with time-limited tokens
- JWT-based authentication with access and refresh tokens
- Refresh token rotation for enhanced security
- Account activation/deactivation for platform admins
- User profile management (name, email, preferences)
- Account type selection (individual vs organization member)
- Session management with device/IP tracking
- Logout functionality with token revocation

**Security Features:**
- Input validation and sanitization
- Rate limiting on authentication endpoints
- Protection against brute force attacks
- Secure token storage and handling
- HTTPS enforcement in production
- Password strength requirements

---

### 4. Individual Subscriptions & Billing

**Description:** Stripe-powered subscription management for individual users with tiered access levels.

**What it provides:**
- **Subscription Tiers:**
  - Free Tier: Limited sessions per month
  - Basic Tier: Unlimited sessions, standard features
  - Premium Tier: Unlimited sessions, advanced features, priority support
- Stripe payment integration for secure credit card processing
- Subscription creation, modification, and cancellation
- Automatic recurring billing
- Payment method management
- Billing history and invoice access
- Subscription status tracking (active, canceled, past_due)
- Grace period handling for failed payments
- Prorated billing for upgrades/downgrades
- Webhook integration for real-time payment status updates
- Cancel at any time with immediate effect or at period end

**Billing Features:**
- Secure PCI-compliant payment processing via Stripe
- Multiple payment methods support (credit/debit cards)
- Automatic payment retry for failed charges
- Email notifications for billing events
- Customer portal access for self-service management
- Tax calculation and invoicing

---

### 5. Organization Management (Multi-Tenant)

**Description:** Comprehensive church and ministry management system allowing organizations to provide counseling services to their members.

**What it provides:**
- **Organization Setup:**
  - Church/ministry profile creation with name, description
  - Organization license types (Family: 5 members, Small: 25, Medium: 100, Large: unlimited)
  - License status management (trial, active, expired, cancelled)
  - Custom branding and settings per organization
  - Maximum member limits based on license tier

- **Member Management:**
  - Add/remove organization members
  - Bulk member import capability
  - Member role assignment (Owner, Counselor, Member)
  - Member activity tracking
  - Individual member session access and history

- **Access Control:**
  - Flexible role-based permissions system
  - Custom roles creation beyond system defaults
  - Granular permission settings (org:manage, members:manage, billing:manage, etc.)
  - Role-based UI/feature access

- **Invitations:**
  - Email-based member invitations with secure tokens
  - Invitation expiration and status tracking
  - Pending invitation management
  - Invitation acceptance workflow

---

### 6. Counselor Assignment & Pastoral Care

**Description:** Professional counselor oversight system allowing trained counselors to monitor and support members within organizations.

**What it provides:**
- **Counselor-Member Assignments:**
  - Assign specific counselors to specific members
  - Multiple members per counselor support
  - Assignment history tracking
  - Active/inactive assignment status
  - Reassignment capability

- **Member Monitoring:**
  - Access to member's AI counseling session history
  - Real-time wellbeing status dashboard (green/yellow/red indicators)
  - AI-generated 7-day wellbeing summaries
  - Trend analysis and pattern identification
  - Crisis alert notifications

- **Private Counselor Notes:**
  - Confidential notes visible only to note author
  - Rich text note formatting
  - Note timestamps and history
  - Search and filter capabilities
  - Soft delete with 30-day retention

- **Collaborative Notes:**
  - Shared notes visible to assigned counselors
  - Member journal entries that counselors can view
  - Counselor feedback on member journaling
  - Note permissions (private vs shared)

- **Coverage & Delegation:**
  - Temporary access grants for backup counselors
  - Vacation/absence coverage system
  - Time-limited access permissions
  - Grant revocation and management

---

### 7. Member Wellbeing Dashboard

**Description:** AI-powered wellbeing analysis providing counselors with actionable insights into member mental/spiritual health.

**What it provides:**
- **Automated Wellbeing Assessment:**
  - AI analysis of member's counseling sessions over 7-day windows
  - Traffic light status system (Green: Thriving, Yellow: Struggling, Red: Crisis)
  - Automatic status updates based on conversation patterns
  - Trend tracking over time

- **AI-Generated Summaries:**
  - Concise 7-day wellbeing summaries
  - Key themes and concerns identification
  - Positive progress highlights
  - Areas requiring attention
  - Scripture engagement metrics

- **Counselor Override:**
  - Manual status adjustment by counselors
  - Override reason documentation
  - Original AI suggestion retention for comparison
  - Override history tracking

- **Actionable Insights:**
  - Priority member list sorted by wellbeing status
  - Proactive outreach recommendations
  - Crisis escalation indicators
  - Engagement level tracking

---

### 8. Session Sharing & Collaboration

**Description:** Secure session sharing system allowing users to share their counseling conversations with trusted individuals or counselors.

**What it provides:**
- **Secure Sharing:**
  - Unique shareable links with cryptographic tokens
  - Time-limited access (expiration dates)
  - Email-based sharing to specific recipients
  - Organization-scoped sharing (within church only)
  - Shareable link revocation

- **Access Control:**
  - View-only vs. collaborative access levels
  - Note-adding permissions for collaborators
  - Access tracking (who viewed when)
  - Share dismissal for recipients
  - Owner can revoke access anytime

- **Collaboration Features:**
  - Shared note threads on sessions
  - Multiple collaborator support
  - Real-time access notifications
  - Collaborative journaling
  - Counselor feedback on shared sessions

---

### 9. Session Notes & Journaling

**Description:** Rich note-taking system for both members and counselors to journal insights and reflections on counseling sessions.

**What it provides:**
- **User Journaling:**
  - Personal reflections on counseling conversations
  - Timestamp tracking for all entries
  - Edit and update capabilities
  - Soft delete with 30-day recovery window
  - Rich text formatting support

- **Counselor Notes:**
  - Professional observations on member progress
  - Private notes (counselor-only visibility)
  - Shared notes (visible to assigned counselors)
  - Clinical assessment documentation
  - Treatment plan tracking

- **Note Management:**
  - Search and filter by date, author, session
  - Note categorization and tagging
  - Export capabilities for record-keeping
  - Version history tracking
  - Bulk operations (archive, delete)

- **Notifications:**
  - Email alerts when notes are added to shared sessions
  - Counselor notifications when members journal
  - Digest summaries of note activity
  - Configurable notification preferences

---

### 10. Platform Administration

**Description:** Comprehensive administrative interface for platform operators to manage the entire system, users, organizations, and support operations.

**What it provides:**
- **User Management:**
  - View all users across all organizations
  - Account activation/deactivation
  - Password reset assistance
  - Email verification override
  - Subscription management for users
  - Account type changes

- **Organization Management:**
  - Create, update, archive organizations
  - License tier changes
  - License expiration management
  - Organization metrics and analytics
  - Contract tracking for sales-assisted deals
  - Billing reminder management

- **Morph Mode:**
  - Temporarily assume another user's identity for support
  - Full audit trail of all morph sessions
  - Automatic session timeout
  - IP and metadata tracking
  - Permission verification before morphing

- **System Monitoring:**
  - Platform-wide metrics dashboard
  - User growth analytics
  - Session volume tracking
  - Crisis detection statistics
  - API usage monitoring
  - Performance metrics

- **Audit Logging:**
  - Comprehensive action tracking
  - Admin activity logs
  - Sensitive operation recording
  - License change history
  - User deletion tracking
  - Compliance reporting

---

### 11. Organization Admin Panel

**Description:** Self-service admin tools for organization owners and administrators to manage their church/ministry.

**What it provides:**
- **Member Management:**
  - Add/remove members
  - Update member roles
  - View member activity and engagement
  - Member session access (with permissions)
  - Bulk member operations

- **Counselor Management:**
  - Assign counselors to members
  - View counselor workload and assignments
  - Manage counselor permissions
  - Track counselor activity
  - Coverage grant administration

- **License Management:**
  - View current license tier and limits
  - Member count vs. license limit tracking
  - Upgrade/downgrade requests
  - License renewal management
  - Usage analytics

- **Invitation System:**
  - Invite new members via email
  - Manage pending invitations
  - Resend invitations
  - Cancel expired invitations
  - Custom invitation messages

- **Analytics & Reporting:**
  - Member engagement metrics
  - Session volume trends
  - Counselor utilization rates
  - Wellbeing status distribution
  - Crisis detection analytics

---

### 12. Support Ticket System

**Description:** Multi-level support system with SLA tracking, priority management, and escalation workflows.

**What it provides:**
- **Ticket Creation:**
  - Role-specific issue categories (individual, org admin, counselor)
  - Rich text issue descriptions
  - Image attachment support
  - Priority selection (urgent, high, medium, low, feature)
  - Automatic priority scoring based on urgency, age, and org size

- **Ticket Management:**
  - Status tracking (open, in_progress, waiting_on_user, resolved, closed, rejected)
  - Admin assignment and claiming
  - Ticket reassignment
  - Response threading with timestamps
  - Internal notes for admin coordination

- **SLA Tracking:**
  - Automatic SLA deadline calculation based on priority
  - Response SLA (first admin response time)
  - Resolution SLA (time to resolve issue)
  - SLA status indicators (on_track, approaching, critical, breached)
  - SLA pause when waiting on user
  - Holiday calendar integration for accurate SLA calculations
  - SLA breach alerts and notifications

- **Escalation System:**
  - Org admin to platform admin escalation
  - Escalation approval/rejection workflow
  - Escalation reason documentation
  - Escalation tracking and metrics
  - Rejection feedback to requestor

- **Ticket Linking:**
  - Manual ticket relationship tracking (duplicate, related, blocks, blocked_by)
  - Related ticket discovery
  - Link management

- **Attachments:**
  - Image file uploads (screenshots, error messages)
  - File size and type validation
  - Secure file storage
  - Attachment viewing and download

- **Reporting:**
  - Ticket volume trends
  - Resolution time analytics
  - SLA compliance metrics
  - Category breakdown analysis
  - Admin performance tracking

---

### 13. Email Notifications

**Description:** Comprehensive transactional email system powered by Postmark with delivery tracking and rate limiting.

**What it provides:**
- **Email Types:**
  - Account verification emails
  - Password reset emails
  - Organization invitation emails
  - Session share notifications
  - Note added notifications
  - Counselor assignment notifications
  - Crisis detection alerts
  - Billing and subscription updates
  - Support ticket notifications

- **Email Tracking:**
  - Delivery status monitoring
  - Open tracking
  - Click tracking
  - Bounce detection and handling
  - Failed delivery retry logic

- **Rate Limiting:**
  - Per-user sending limits (prevent spam)
  - IP-based rate limiting
  - Operation-specific limits (e.g., max 3 verification emails per hour)
  - Automatic retry after cooldown period

- **Email Logging:**
  - Complete email activity audit trail
  - Postmark webhook integration
  - Delivery status updates
  - Bounce reason tracking
  - Email metadata storage

- **Templates:**
  - Professional HTML email templates
  - Responsive design for mobile
  - Branded email headers/footers
  - Dynamic content injection
  - Plain text fallbacks

---

### 14. Scripture Library & Search

**Description:** Comprehensive Bible verse database with advanced search and Strong's Concordance integration.

**What it provides:**
- **Bible Translations:**
  - 8 major translations (KJV, ASV, NIV, ESV, NASB, NKJV, NLT, YLT)
  - ~31,000 verses per translation
  - Full Old and New Testament coverage
  - Translation metadata and descriptions

- **Verse Search:**
  - Search by book, chapter, verse
  - Keyword search across translations
  - Multi-verse lookup (verse ranges)
  - Cross-translation comparison
  - Fuzzy matching for book names

- **Strong's Concordance:**
  - Original Hebrew/Greek word definitions
  - Strong's number lookup
  - Word usage frequency
  - Root word analysis
  - Transliteration and pronunciation
  - Multiple translation comparison

- **Scripture References:**
  - Automatic scripture reference parsing in counseling
  - Verse injection in AI responses
  - Context-aware verse selection
  - Topical verse recommendations

---

### 15. Holiday & SLA Calendar

**Description:** Holiday calendar system for accurate SLA calculations that accounts for non-business days.

**What it provides:**
- **Holiday Management:**
  - Create/edit/delete holidays
  - Recurring annual holidays
  - Date-specific holidays
  - Custom holiday descriptions

- **SLA Integration:**
  - Automatic exclusion of holidays from SLA calculations
  - Weekend exclusion support
  - Business hours configuration
  - Accurate deadline calculation

- **Holiday Types:**
  - Federal holidays
  - Religious observances
  - Organization-specific holidays
  - Emergency closure days

---

### 16. Advanced Analytics & Metrics

**Description:** Pre-aggregated metrics system for fast dashboard loading and trend analysis.

**What it provides:**
- **Metric Snapshots:**
  - Daily, weekly, monthly snapshot generation
  - Platform-wide metrics
  - Organization-specific metrics
  - Historical data retention

- **Tracked Metrics:**
  - Active user counts
  - Session volume trends
  - Crisis detection frequency
  - Subscription conversion rates
  - Member engagement scores
  - Counselor workload distribution
  - Support ticket volume
  - Email delivery rates

- **Performance Optimization:**
  - Background job processing for metric calculation
  - No real-time query overhead
  - Fast dashboard loading
  - Efficient data aggregation

---

### 17. Background Jobs & Scheduled Tasks

**Description:** Automated job processing system for background operations and scheduled tasks.

**What it provides:**
- **Scheduled Jobs:**
  - Daily wellbeing analysis updates
  - Weekly metric snapshot generation
  - Expired token cleanup
  - Orphaned session deletion (30 days after archive)
  - SLA deadline calculation updates
  - Email digest sending

- **Job Management:**
  - Cron-based scheduling
  - Job retry logic on failure
  - Job execution logging
  - Performance monitoring
  - Manual job triggering for admins

---

### 18. API Documentation (Swagger/OpenAPI)

**Description:** Interactive API documentation for developers and third-party integrations.

**What it provides:**
- Auto-generated API documentation from code
- Interactive API testing interface
- Request/response examples
- Authentication documentation
- Endpoint categorization
- Schema definitions
- Try-it-out functionality

---

### 19. Health Checks & Monitoring

**Description:** Application health monitoring endpoints for load balancers and monitoring systems.

**What it provides:**
- `/health` - Basic health check
- `/health/live` - Liveness probe (is app running?)
- `/health/ready` - Readiness probe (can accept traffic?)
- Database connectivity verification
- External service status checks
- Detailed health status reporting

---

### 20. Security Features

**Description:** Comprehensive security implementation across the entire platform.

**What it provides:**
- **Authentication & Authorization:**
  - JWT-based authentication
  - Role-based access control (RBAC)
  - Permission-based feature gating
  - Session management

- **Data Protection:**
  - Bcrypt password hashing (10 rounds)
  - SQL injection protection via Prisma ORM
  - XSS protection via input validation
  - CSRF protection
  - Rate limiting on sensitive endpoints

- **Network Security:**
  - HTTPS enforcement in production
  - Helmet security headers
  - CORS configuration
  - SSL/TLS for database connections

- **Audit & Compliance:**
  - Comprehensive audit logging
  - Admin action tracking
  - Sensitive operation logging
  - GDPR-ready data export capabilities

---

## Technical Architecture

### Backend (NestJS)
- TypeScript-based REST API
- Modular architecture with dependency injection
- PostgreSQL database via Prisma ORM
- JWT authentication with refresh tokens
- Winston structured logging
- Sentry error tracking
- Helmet security middleware
- Rate limiting with ThrottlerModule

### Frontend (Next.js 13+)
- React-based server-side rendered application
- App Router with server components
- Tailwind CSS for styling
- Responsive design
- Progressive Web App (PWA) capabilities

### Infrastructure
- Docker containerization
- AWS Lightsail Containers deployment
- RDS PostgreSQL database
- Route 53 DNS management
- Automatic SSL via Lightsail
- CloudWatch monitoring

### External Integrations
- **OpenAI:** GPT-4 for AI counseling
- **Postmark:** Transactional email delivery
- **Stripe:** Payment processing and subscriptions
- **Sentry:** Error tracking and monitoring

---

## Quality Assurance

- ✅ **372 automated tests** with 73.26% code coverage
- ✅ **CI/CD pipeline** via GitHub Actions
- ✅ **Type safety** with TypeScript
- ✅ **Input validation** on all endpoints
- ✅ **Branch protection** requiring tests to pass
- ✅ **Code review** requirements
- ✅ **Automated migrations** with rollback procedures

---

## Deployment Status

- ✅ Production-ready codebase (85% ready)
- ✅ Environment variable validation
- ✅ Database migration strategy documented
- ✅ SSL/TLS enforcement configured
- ✅ Connection pooling optimized
- ✅ Secrets management documented
- ✅ Lightsail deployment guide complete
- ⏳ AWS infrastructure setup (in progress)

---

## Roadmap & Future Enhancements

### Planned Features
- Voice-based counseling sessions
- Mobile app (iOS/Android)
- Group counseling sessions
- Multilingual support
- Advanced analytics dashboard
- AI-powered sermon/devotional generation
- Prayer request management
- Scripture memorization tools
- Integration with church management systems (Planning Center, CCB)

### Scalability
- Migrate to ECS Fargate when >1000 users
- Add Redis caching layer
- Implement CDN for static assets
- Add read replicas for database
- Implement blue-green deployments

---

*Last Updated: December 2, 2024*
