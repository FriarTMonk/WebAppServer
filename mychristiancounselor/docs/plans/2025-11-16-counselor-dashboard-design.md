# Counselor Dashboard Design

**Date**: November 16, 2025
**Status**: Design Approved
**Phase**: Ready for Implementation Planning

## Overview

Enable counselors to monitor and support their assigned members' spiritual wellbeing through an organized dashboard showing member status, conversation access, and clinical documentation capabilities.

### Key Design Principles

1. **Privacy First**: Maintain pastoral confidentiality - organization owners cannot see private notes or counselor observations
2. **Clinical Clarity**: Clear separation between session notes (visible to member) and counselor observations (private clinical notes)
3. **Flexible Coverage**: Support temporary workload sharing while maintaining clear documentation of who provided care
4. **AI-Assisted**: Leverage existing AI capabilities for status detection and summary generation to reduce counselor workload

### System Architecture

The counselor interface integrates with existing systems:
- **Organization membership**: Uses existing Counselor role and permissions
- **Session system**: Extends current conversation/session infrastructure
- **AI service**: Leverages existing crisis/grief detection for stoplight status
- **Notes system**: Builds on existing SessionNote model with enhanced access control
- **Sharing system**: Integrates with current session sharing for member-initiated sharing

## Database Schema

### New Tables

#### CounselorAssignment
Links counselors to members for pastoral care relationships.

```prisma
model CounselorAssignment {
  id             String   @id @default(uuid())
  counselorId    String   // User with Counselor role
  memberId       String   // User being counseled
  organizationId String
  status         String   @default("active") // 'active' | 'inactive'
  assignedBy     String   // Admin who made assignment
  assignedAt     DateTime @default(now())
  endedAt        DateTime?

  counselor    User         @relation("CounselorAssignments", fields: [counselorId], references: [id])
  member       User         @relation("MemberAssignments", fields: [memberId], references: [id])
  organization Organization @relation(fields: [organizationId], references: [id])

  @@unique([counselorId, memberId, organizationId])
  @@index([counselorId, status])
  @@index([memberId])
}
```

#### CounselorObservation
Private counselor notes - only visible to authoring counselor.

```prisma
model CounselorObservation {
  id          String   @id @default(uuid())
  counselorId String
  memberId    String
  content     String   @db.Text
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  counselor User @relation("ObservationsAuthored", fields: [counselorId], references: [id])
  member    User @relation("ObservationsReceived", fields: [memberId], references: [id])

  @@index([counselorId, memberId])
  @@index([createdAt])
}
```

#### CounselorCoverageGrant
Temporary access permissions for workload sharing.

```prisma
model CounselorCoverageGrant {
  id                String    @id @default(uuid())
  primaryCounselorId String
  backupCounselorId  String
  memberId           String
  grantedAt          DateTime  @default(now())
  expiresAt          DateTime?
  revokedAt          DateTime?

  primaryCounselor User @relation("CoverageGrantsGiven", fields: [primaryCounselorId], references: [id])
  backupCounselor  User @relation("CoverageGrantsReceived", fields: [backupCounselorId], references: [id])
  member           User @relation("CoverageGrantsForMember", fields: [memberId], references: [id])

  @@index([backupCounselorId, revokedAt])
  @@index([primaryCounselorId])
}
```

#### MemberWellbeingStatus
Stores AI-generated and counselor-overridden wellbeing status.

```prisma
model MemberWellbeingStatus {
  id               String   @id @default(uuid())
  memberId         String   @unique
  status           String   // 'green' | 'yellow' | 'red'
  aiSuggestedStatus String  // What AI detected
  overriddenBy     String?  // Counselor who overrode
  summary          String   @db.Text // AI-generated 7-day summary
  lastAnalyzedAt   DateTime @default(now())
  updatedAt        DateTime @updatedAt

  member User @relation(fields: [memberId], references: [id])

  @@index([status])
}
```

#### Notification
Ticker-tape notifications and counselor-member messaging.

```prisma
model Notification {
  id          String    @id @default(uuid())
  recipientId String
  senderId    String?   // Null for system notifications
  type        String    // 'system' | 'message' | 'alert'
  category    String    // 'assignment' | 'note_added' | 'status_change' | 'direct_message'
  title       String    // Brief header
  message     String    @db.Text
  linkTo      String?   // Optional URL to navigate to
  isRead      Boolean   @default(false)
  isDismissed Boolean   @default(false)
  createdAt   DateTime  @default(now())
  expiresAt   DateTime? // Auto-dismiss after date

  recipient User  @relation("NotificationsReceived", fields: [recipientId], references: [id])
  sender    User? @relation("NotificationsSent", fields: [senderId], references: [id])

  @@index([recipientId, isRead, isDismissed])
  @@index([createdAt])
}
```

## API Endpoints

### Counselor Dashboard Endpoints

**Under `/counsel` route**

#### Dashboard & Member Management
- `GET /counsel/members` - Get all members assigned to counselor (with stoplight, summary)
- `GET /counsel/coverage` - Get members counselor has temporary access to
- `GET /counsel/members/:memberId/sessions` - Get all sessions for a member
- `PATCH /counsel/members/:memberId/status` - Override AI-suggested stoplight status

#### Counselor Observations
- `POST /counsel/observations` - Create private observation for a member
- `GET /counsel/observations/:memberId` - Get all observations for a member
- `PUT /counsel/observations/:id` - Update an observation
- `DELETE /counsel/observations/:id` - Delete an observation
- `GET /counsel/observations/:memberId/export` - Export observations as PDF for files

#### Coverage Management
- `POST /counsel/coverage/grant` - Grant temporary access to another counselor
- `DELETE /counsel/coverage/revoke/:grantId` - Revoke coverage grant
- `GET /counsel/coverage/grants` - List all coverage grants given/received

#### Notifications & Messaging
- `GET /counsel/notifications` - Get unread notifications
- `POST /counsel/notifications` - Send message to member
- `PATCH /counsel/notifications/:id/read` - Mark notification as read
- `PATCH /counsel/notifications/:id/dismiss` - Dismiss notification

### Organization Admin Endpoints

**Under `/org-admin` route**

#### Counselor Assignment Management
- `POST /org-admin/assignments` - Create new counselor-member assignment
- `GET /org-admin/assignments` - List all assignments in organization
- `DELETE /org-admin/assignments/:id` - End an assignment (sets status to inactive)
- `GET /org-admin/counselors/workload` - Get caseload counts for all counselors

## Access Control & Permissions

### Counselor Role Permissions

Existing permissions used:
- `VIEW_MEMBER_CONVERSATIONS` - Can view assigned members' conversations
- `ADD_SESSION_NOTES` - Can add notes to sessions
- `VIEW_ANALYTICS` - Can see member wellbeing analytics

### Access Control Rules

#### Session Access
- Counselor can view ANY session belonging to their assigned members
- Counselor with coverage grant can view sessions for covered members
- Sessions remain read-only to counselors (they can't ask questions as the member)

#### Session Notes Access
- **Regular Notes**: Visible to member, assigned counselor, coverage counselors, and users member has shared with
- **Private Notes**: ONLY visible to member and assigned counselor (NOT coverage counselors, NOT org owner)
- Counselor can create both regular and private notes
- Note author is always recorded and displayed

#### Counselor Observations Access
- ONLY the authoring counselor can see their own observations
- Coverage counselors CANNOT see primary counselor's observations
- Members NEVER see counselor observations
- Org Owner/Admin NEVER sees counselor observations
- Only accessible via counselor's own authenticated session

#### Stoplight Status Override
- Only assigned counselor (not coverage) can override AI-suggested status
- Override requires recording reason/notes
- Override audit trail maintained

#### Coverage Grant Permissions
- Only assigned counselor can grant coverage
- Coverage can be time-limited or indefinite
- Assigned counselor can revoke coverage anytime
- Coverage grants provide view-only access to member sessions + ability to add session notes

## AI Integration & Automation

### Wellbeing Status Detection (Stoplight)

#### Status Levels

**🔴 Red (Crisis)** - Triggers when AI detects:
- Suicide ideation or self-harm mentions
- Abuse (physical, emotional, sexual)
- Addiction crisis or relapse
- Immediate danger keywords
- Uses existing `isCrisisDetected` flag from AI service

**🟡 Yellow (Concern)** - Triggers when AI detects:
- Grief or loss
- Ongoing stress or anxiety
- Bullying or harassment
- Depression indicators
- Relationship struggles
- Uses existing `isGriefDetected` flag + new concern detection

**🟢 Green (Stable)** - Default when:
- No crisis or concern indicators detected
- Member has had conversations in past 7 days
- Showing positive spiritual growth themes

### 7-Day Summary Generation

**AI Summary Process**:
- Analyzes all conversations from past 7 days
- Extracts key themes discussed (using existing topic extraction)
- Identifies emotional tone and trajectory (improving/declining/stable)
- Notes frequency of conversations (e.g., "Had 3 conversations")
- Generates 2-3 sentence summary in pastoral language

**Example Summary**: "Had 4 conversations this week about marriage struggles and financial stress. Showing signs of spiritual growth through prayer. Emotional tone improving from beginning of week."

### Automation Schedule

- **Nightly Job** (2 AM): Updates all MemberWellbeingStatus records
- **On-Demand**: Counselor can manually trigger refresh for specific member
- **Real-Time Flag**: Crisis detection still happens immediately during conversation for urgent intervention

## User Interface Design

### Main Counselor Dashboard (`/counsel`)

#### Layout Structure
- Header: "My Members" with filter/sort controls
- Two tabs: "Assigned Members" and "Coverage"
- Member list as cards or table view

#### Member List Display
Each row/card shows:
- Member name (clickable to view details)
- Stoplight indicator (🟢🟡🔴) with hover showing AI suggestion if overridden
- 7-day AI summary (2-3 sentences)
- Last conversation date
- Quick action buttons: "View Sessions" | "Add Observation" | "Grant Coverage"
- Observation count badge (e.g., "3 notes")

#### Filters & Sorting
- Filter by status: All | 🟢 Green | 🟡 Yellow | 🔴 Red
- Sort by: Status (red first) | Last Active | Name | Most Sessions
- Search by member name

### Member Detail View (`/counsel/members/:memberId`)

#### Three-Column Layout

1. **Left Column**: List of member's sessions (chronological)
   - Session title and date
   - Click to load in center column

2. **Center Column**: Selected session conversation view
   - Full conversation display (read-only for counselor)
   - Scripture references and themes
   - Crisis/grief indicators highlighted

3. **Right Column**: Tabbed interface
   - **Session Notes Tab**: Shows all notes on this session with author names
     - Counselor can add new notes (flagged as from counselor)
     - Privacy toggle: Regular | Private
   - **My Observations Tab**: Only counselor's private observations about this member
     - Create/edit/delete functionality
     - Export button for PDF

### Organization Admin Interface (`/org-admin/counselor-assignments`)

#### Features

1. **View All Assignments**: Table showing all counselor-member assignments
   - Columns: Member Name | Assigned Counselor | Status | Assigned Date | Actions
   - Filter by: Counselor | Status (Active/Inactive) | Unassigned Members

2. **Assign Counselor**:
   - Button: "Assign Counselor" opens modal
   - Select member (from unassigned or currently assigned)
   - Select counselor (from users with Counselor role)
   - Submit creates CounselorAssignment record
   - If member already assigned, old assignment is marked inactive, new one created

3. **Bulk Assignment**:
   - Select multiple unassigned members
   - Choose counselor to assign them all to
   - Useful for new counselor onboarding

4. **View Workload**:
   - Dashboard showing each counselor's current caseload count
   - Helps admin balance assignments

### Ticker-Tape Notification System

#### Banner Behavior
- Slides in from top of screen
- Persistent until dismissed or replied
- Priority color coding:
  - Red: Urgent/crisis
  - Yellow: Needs attention
  - Blue: Information
  - Green: Positive update

#### Notification Types

**System Notifications** (no sender):
- "You've been assigned a new member: [Name]"
- "Your coverage grant for [Member] expires tomorrow"
- "Platform maintenance scheduled for [Date]"

**Member → Counselor Messages**:
- Member clicks "Message My Counselor" button
- Banner appears for counselor: "[Member Name]: [Message]"
- Counselor can reply inline or dismiss

**Counselor → Member Messages**:
- Counselor clicks "Send Message" next to member
- Banner appears for member when they log in
- Member can reply or dismiss

#### UI Actions
- Dismiss: Remove from view
- Reply: Inline quick reply box
- View Details: Navigate to linked page (if applicable)
- Stack Behavior: Multiple notifications queue, show one at a time or as compact list

## Implementation Phases

### Phase 1: Core Infrastructure (Foundation)
**Goal**: Basic counselor assignment system

- Database schema migration (all 5 new tables)
- API endpoints for counselor assignment management
- Basic counselor dashboard page (`/counsel`)
- Member list with hardcoded stoplight indicators (for testing)
- Admin page for assigning counselors (`/org-admin/counselor-assignments`)

**Deliverables**:
- Counselors can log in and see assigned members
- Admins can assign/reassign counselors to members
- Basic member list UI functional

### Phase 2: AI Integration (Intelligence)
**Goal**: Automated wellbeing monitoring

- Implement nightly job for wellbeing analysis
- AI-generated stoplight status based on conversation analysis
- AI-generated 7-day summaries
- Counselor override capability for status
- Status history tracking

**Deliverables**:
- Stoplight indicators reflect actual AI analysis
- Summaries auto-generate nightly
- Counselors can override AI suggestions with notes

### Phase 3: Notes & Observations (Core Counseling Features)
**Goal**: Clinical documentation capabilities

- Counselor observations CRUD operations
- Enhanced session notes with privacy flags
- Access control enforcement (private notes invisible to coverage counselors)
- Export observations to PDF

**Deliverables**:
- Counselors can write and manage private observations
- Session notes have privacy toggle
- PDF export functional

### Phase 4: Coverage System (Workload Management)
**Goal**: Temporary coverage for vacations/sabbaticals

- Coverage grant management UI
- Temporary access implementation
- Coverage dashboard view (separate tab)
- Grant expiry automation

**Deliverables**:
- Counselors can grant/revoke coverage
- Coverage counselors see separate "Coverage" tab
- Access automatically expires based on date

### Phase 5: Notifications & Messaging (Communication)
**Goal**: Real-time communication between counselor and member

- Notification table and APIs
- Ticker-tape banner component
- System notifications
- Two-way messaging (counselor ↔ member)
- Optional: Real-time updates via WebSocket

**Deliverables**:
- Banner system functional
- Counselors and members can send direct messages
- System notifications appear for important events

## Business Logic Rules

### Assignment Rules
1. Member can only have ONE active counselor assignment at a time
2. Ending an assignment sets status to 'inactive' but preserves historical data
3. Counselor observations remain associated with original counselor even after reassignment
4. Admin can reassign member to different counselor (old assignment becomes inactive)

### AI Analysis Rules
1. Analysis runs nightly at 2 AM
2. Only analyzes conversations from past 7 days
3. Crisis detection happens real-time during conversation (immediate alert)
4. Counselor override takes precedence over AI suggestion until next analysis
5. If member has no conversations in 7 days, status remains last known state

### Access Control Rules
1. All counselor endpoints verify active assignment or valid coverage grant
2. Coverage grants with `expiresAt` date in past are automatically excluded
3. Private session notes NEVER visible to coverage counselors
4. Counselor observations NEVER exposed to any API accessible by members or admins
5. Export functionality includes watermark with counselor name and export date

### Notification Rules
1. System notifications created automatically for key events (new assignment, status change)
2. Messages between counselor and member stored as notifications with type='message'
3. Unread notifications show badge count in UI
4. Dismissed notifications remain in database but hidden from UI
5. Expired notifications (past expiresAt date) auto-dismissed

## Future Enhancements (Post-MVP)

### Analytics & Reporting
- Counselor effectiveness metrics (member progress over time)
- Organization-wide wellbeing trends
- Crisis intervention response time tracking
- Workload balance analytics

### Advanced Features
- Real-time WebSocket notifications (instant banner updates without refresh)
- Mobile app for counselors (quick status checks on-the-go)
- Scheduled check-in reminders (counselor sets follow-up dates)
- Bulk actions (update multiple member statuses at once)
- Rich text editor for observations (formatting, embedded links)

### Integration Opportunities
- Calendar integration for counseling appointments
- Email notifications as backup to in-app banners
- Export observations to external case management systems
- Prayer request tracking linked to member status

### Security Enhancements
- HIPAA compliance review for counselor observations storage
- Data retention policies (how long to keep observations)
- Encryption at rest for sensitive observations
- Enhanced audit logging for all counselor access to member data
- API gateway level RBAC enforcement

### Performance Optimizations
- Caching of frequently accessed member lists
- Lazy loading of conversation history
- Pagination for large counselor caseloads (50+ members)
- Background processing queue for AI analysis jobs
- CDN for static assets

## Testing Strategy

### Unit Tests
- Business logic for status determination
- Access control rules enforcement
- Coverage grant expiry logic
- AI summary generation functions

### Integration Tests
- API endpoints with database
- Permission checking across endpoints
- Notification creation triggers
- PDF export functionality

### End-to-End Tests
**Critical Workflows**:
1. Admin assigns counselor to member
2. Counselor views member list with stoplight
3. Counselor adds private observation
4. Counselor grants coverage to backup
5. Backup counselor accesses covered member
6. Member sends message to counselor via banner
7. Counselor overrides AI-suggested status

### User Acceptance Testing
- Real counselors test with sample member data
- Verify pastoral workflow matches expectations
- Test coverage scenarios (vacation handoff)
- Validate privacy controls (private notes invisible to appropriate parties)

## Success Criteria

### Phase 1 Success
- [ ] Counselors can log in and see assigned members
- [ ] Admins can assign/reassign counselors
- [ ] Member list displays correctly

### Phase 2 Success
- [ ] Stoplight status reflects AI analysis
- [ ] Summaries generate automatically overnight
- [ ] Override functionality works correctly

### Phase 3 Success
- [ ] Counselors can create/edit/delete observations
- [ ] Private session notes hidden from coverage counselors
- [ ] PDF export includes all observations

### Phase 4 Success
- [ ] Coverage grants create/revoke successfully
- [ ] Coverage counselors see separate view
- [ ] Expired grants automatically excluded

### Phase 5 Success
- [ ] Ticker-tape banner displays notifications
- [ ] Two-way messaging functional
- [ ] System notifications trigger correctly

## Technical Considerations

### Security
- All endpoints protected by JWT authentication
- Additional counselor role verification on sensitive endpoints
- Observations table has database-level row security
- PDF exports watermarked with counselor identity

### Performance
- Database indexes on frequently queried fields (counselorId, memberId, status)
- AI analysis jobs run asynchronously (don't block user requests)
- Notification queries limited to unread/undismissed (prevent table scan)
- Member list paginated beyond 50 members

### Scalability
- Design supports hundreds of counselors per organization
- AI analysis can be distributed across multiple worker processes
- Notification system can integrate with push notification services
- Database schema supports horizontal partitioning by organization

## Documentation Requirements

### For Developers
- API endpoint documentation with examples
- Database schema ER diagram
- Access control matrix (who can see what)
- AI analysis algorithm documentation

### For Administrators
- How to assign counselors to members
- Understanding workload distribution
- Managing coverage grants
- Interpreting wellbeing status indicators

### For Counselors
- Dashboard navigation guide
- Writing effective observations
- Understanding AI status suggestions
- Using the coverage system
- Messaging members via banner

### For Members
- How to message your counselor
- Understanding session notes vs. private notes
- Requesting a counselor change

## Appendix: Design Decisions

### Why Hybrid AI + Manual Status?
- **Decision**: AI suggests status, counselor can override
- **Rationale**: Balances automation efficiency with professional judgment. AI provides consistent baseline, counselor applies pastoral expertise.

### Why Single Counselor Assignment?
- **Decision**: One active counselor per member (not multiple)
- **Rationale**: Clear accountability and pastoral relationship. Coverage grants handle temporary needs without confusion.

### Why Separate Observations from Session Notes?
- **Decision**: CounselorObservation table separate from SessionNote
- **Rationale**: Maintains clinical documentation privacy. Observations are counselor's private case notes, never visible to member or coverage counselors.

### Why No Org Owner Access to Private Data?
- **Decision**: Org owners cannot see private notes or counselor observations
- **Rationale**: Maintains pastoral confidentiality and counseling relationship trust. Business ownership doesn't grant access to clinical documentation.

### Why Ticker-Tape vs. Email Notifications?
- **Decision**: In-app banner system as primary communication
- **Rationale**: Keeps users engaged in the platform, provides immediate feedback. Email as future enhancement for those who prefer it.

---

**Design Status**: ✅ Complete and Validated
**Next Steps**: Create detailed implementation plan for Phase 1
**Timeline Estimate**:
- Phase 1: 2 weeks
- Phase 2: 2 weeks
- Phase 3: 1.5 weeks
- Phase 4: 1 week
- Phase 5: 1.5 weeks
- **Total MVP**: ~8 weeks
