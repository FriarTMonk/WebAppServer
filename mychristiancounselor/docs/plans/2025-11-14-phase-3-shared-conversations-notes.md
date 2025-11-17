# Phase 3: Shared Conversations & Interactive Notes

**Date**: November 14, 2025
**Status**: Planning
**Dependencies**: Phase 1 Foundation (completed)

## Overview

This phase implements interactive notes/chat functionality for shared conversations, allowing users and counselors to collaborate on counseling sessions through an asynchronous note-taking system. Additionally, this phase brings the sharing infrastructure (SessionShare and Subscription models) into alignment with the database.

## Goals

1. **Enable Collaborative Notes**: Allow users and counselors to add notes to shared conversations
2. **Complete Sharing Infrastructure**: Sync Prisma schema with existing database migrations
3. **Prepare for Production**: Establish foundation for organization-based counseling workflows
4. **Future-Ready Architecture**: Set up infrastructure for real-time features if needed later

## Current State Analysis

### What Exists
- **Database Migration**: `20251114151021_add_subscription_and_sharing` created tables for:
  - `SessionShare` - Share tokens and permissions
  - `Subscription` - User subscription management
  - Added fields to `User` and `Session` tables
- **Frontend Components**:
  - `ShareConversationModal.tsx` - UI for creating/managing share links
  - `shared/[token]/page.tsx` - Public view of shared conversations
- **Backend**: Partial counsel service implementation (no share/note endpoints)

### What's Missing
1. **Prisma Schema Out of Sync**: SessionShare, Subscription models not in schema.prisma
2. **SessionNote Model**: No database table or model for notes
3. **Backend API Endpoints**: No REST endpoints for shares or notes
4. **Notes UI**: No interface for adding/viewing notes on shared conversations
5. **Permissions System**: No authorization logic for who can add notes

## Architecture Design

### Data Model

#### SessionNote (New)
```prisma
model SessionNote {
  id            String   @id @default(uuid())
  sessionId     String
  authorId      String
  authorName    String   // Cached for display (denormalized)
  authorRole    String   // 'user' | 'counselor' | 'viewer'
  content       String   @db.Text
  isPrivate     Boolean  @default(false) // Private notes visible only to counselor
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  session       Session  @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  author        User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([authorId])
  @@index([createdAt])
}
```

**Design Decisions**:
- `authorName` cached to avoid JOIN on every note display
- `authorRole` determines note visibility and permissions
- `isPrivate` allows counselors to keep internal notes
- Cascade delete when session or user deleted

#### SessionShare (From Migration)
```prisma
model SessionShare {
  id             String    @id @default(uuid())
  sessionId      String
  shareToken     String    @unique
  sharedBy       String    // User ID who created the share
  sharedWith     String?   // Email restriction (optional)
  organizationId String?   // Organization context (future use)
  createdAt      DateTime  @default(now())
  expiresAt      DateTime? // Optional expiration

  session        Session   @relation(fields: [sessionId], references: [id], onDelete: Cascade)

  @@index([shareToken])
  @@index([sessionId])
}
```

#### Subscription (From Migration)
```prisma
model Subscription {
  id                    String    @id @default(uuid())
  userId                String
  status                String    // 'active' | 'canceled' | 'expired' | 'trial'
  tier                  String    @default("basic") // 'basic' | 'pro' | 'organization'
  startDate             DateTime  @default(now())
  endDate               DateTime?
  stripeSubscriptionId  String?   @unique
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  user                  User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([status])
}
```

#### User Updates (From Migration)
```prisma
// Add to User model:
subscriptionStatus  String    @default("none") // 'none' | 'trial' | 'active' | 'expired'
subscriptionTier    String?   // 'basic' | 'pro' | 'organization'
subscriptionStart   DateTime?
subscriptionEnd     DateTime?
stripeCustomerId    String?   @unique

// Add relation:
subscriptions       Subscription[]
sessionNotesAuthored SessionNote[]

// Add index:
@@index([subscriptionStatus])
```

#### Session Updates (From Migration + New)
```prisma
// Add to Session model:
questionCount       Int       @default(0)
archivedAt          DateTime?
deletedAt           DateTime? // Soft delete

// Add relations:
shares              SessionShare[]
notes               SessionNote[]

// Add index:
@@index([status])
```

### API Endpoints

#### Session Sharing
```
POST   /counsel/share/:sessionId        - Create share link
GET    /counsel/share/:sessionId/list   - List shares for session
DELETE /counsel/share/:shareId          - Revoke share link
GET    /counsel/shared/:token            - View shared session (public)
```

#### Session Notes
```
POST   /counsel/notes/:sessionId         - Add note to session
GET    /counsel/notes/:sessionId         - Get all notes for session
PUT    /counsel/notes/:noteId            - Update note
DELETE /counsel/notes/:noteId            - Delete note
```

### Authorization Rules

#### Share Access
- **Create Share**: Session owner only
- **View Shared Session**: Anyone with valid token (if public) or matching email (if restricted)
- **Revoke Share**: Session owner only

#### Note Access
- **Add Note**:
  - Session owner (user role)
  - Organization counselor assigned to session (counselor role)
  - Anyone with share link (viewer role - public notes only)
- **View Notes**:
  - Public notes: Everyone with session access
  - Private notes: Counselor who created it + organization admins
- **Edit/Delete Note**: Note author only (within 30 minutes of creation)

### Frontend Components

#### SessionNotesPanel.tsx
```tsx
interface SessionNotesPanelProps {
  sessionId: string;
  shareToken?: string; // If viewing via share link
  currentUserRole: 'user' | 'counselor' | 'viewer';
}
```

Features:
- List all notes (filtered by visibility)
- Add new note form
- Edit/delete own notes (time-limited)
- Real-time updates (polling or WebSocket later)
- Private note toggle (counselor only)

#### Integration Points
- Add notes panel to `ConversationView.tsx` (owner view)
- Add notes panel to `shared/[token]/page.tsx` (shared view)
- Show note count badge on history list

## Implementation Plan

### Task 1: Update Prisma Schema
**Objective**: Bring schema.prisma in sync with database migration

**Steps**:
1. Add SessionShare model to schema.prisma
2. Add Subscription model to schema.prisma
3. Add SessionNote model to schema.prisma
4. Update User model with subscription fields and relations
5. Update Session model with new fields and relations
6. Run `npx prisma generate` to update Prisma Client

**Files Changed**:
- `packages/api/prisma/schema.prisma`

**Acceptance Criteria**:
- [ ] Prisma schema matches database structure
- [ ] `npx prisma format` runs without errors
- [ ] `npx prisma validate` passes
- [ ] Prisma Client regenerates successfully

---

### Task 2: Create Database Migration for SessionNote
**Objective**: Create and apply migration for new SessionNote table

**Steps**:
1. Run `npx prisma migrate dev --name add_session_notes`
2. Verify migration creates SessionNote table
3. Verify foreign keys and indexes created correctly
4. Test migration rollback capability

**Files Changed**:
- `packages/api/prisma/migrations/[timestamp]_add_session_notes/migration.sql`

**Acceptance Criteria**:
- [ ] Migration runs successfully
- [ ] SessionNote table exists in database
- [ ] Foreign keys to Session and User tables work
- [ ] Indexes created for performance

---

### Task 3: Create DTOs for Session Notes
**Objective**: Define TypeScript DTOs for note operations

**Steps**:
1. Create `packages/api/src/counsel/dto/create-note.dto.ts`
2. Create `packages/api/src/counsel/dto/update-note.dto.ts`
3. Add validation decorators (class-validator)
4. Export from counsel module

**Files Created**:
- `packages/api/src/counsel/dto/create-note.dto.ts`
- `packages/api/src/counsel/dto/update-note.dto.ts`

**Example - CreateNoteDto**:
```typescript
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class CreateNoteDto {
  @IsString()
  @MaxLength(5000, { message: 'Note content cannot exceed 5000 characters' })
  content: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
```

**Acceptance Criteria**:
- [ ] DTOs validate input correctly
- [ ] Validation errors return meaningful messages
- [ ] Optional fields handled properly

---

### Task 4: Implement Session Notes Service Methods
**Objective**: Add business logic for note operations to CounselService

**Steps**:
1. Add `createNote()` method to CounselService
2. Add `getNotesForSession()` method
3. Add `updateNote()` method
4. Add `deleteNote()` method
5. Implement authorization checks in each method
6. Handle private note filtering

**Files Changed**:
- `packages/api/src/counsel/counsel.service.ts`

**Key Logic**:
```typescript
async createNote(
  sessionId: string,
  authorId: string,
  createNoteDto: CreateNoteDto
): Promise<SessionNote> {
  // 1. Verify session exists
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true }
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // 2. Get author info
  const author = await this.prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true }
  });

  // 3. Determine role
  const authorRole = session.userId === authorId ? 'user' : 'counselor';

  // 4. Create note
  return this.prisma.sessionNote.create({
    data: {
      sessionId,
      authorId,
      authorName: `${author.firstName} ${author.lastName}`.trim(),
      authorRole,
      content: createNoteDto.content,
      isPrivate: createNoteDto.isPrivate || false
    }
  });
}

async getNotesForSession(
  sessionId: string,
  requestingUserId: string
): Promise<SessionNote[]> {
  // 1. Get all notes
  const notes = await this.prisma.sessionNote.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' }
  });

  // 2. Filter private notes
  return notes.filter(note => {
    if (!note.isPrivate) return true;
    if (note.authorId === requestingUserId) return true;
    // TODO: Check if requesting user is org admin
    return false;
  });
}
```

**Acceptance Criteria**:
- [ ] Notes created with correct author info
- [ ] Authorization prevents unauthorized access
- [ ] Private notes filtered correctly
- [ ] Errors handled gracefully

---

### Task 5: Implement Session Notes Controller Endpoints
**Objective**: Create REST endpoints for note operations

**Steps**:
1. Add note endpoints to CounselController
2. Use JWT guards for authentication
3. Extract user ID from JWT token
4. Map DTOs to service methods
5. Return appropriate HTTP status codes

**Files Changed**:
- `packages/api/src/counsel/counsel.controller.ts`

**Example Endpoints**:
```typescript
@Post('notes/:sessionId')
@UseGuards(JwtAuthGuard)
async createNote(
  @Param('sessionId') sessionId: string,
  @CurrentUser() user: any,
  @Body() createNoteDto: CreateNoteDto
) {
  const note = await this.counselService.createNote(
    sessionId,
    user.userId,
    createNoteDto
  );
  return { note };
}

@Get('notes/:sessionId')
@UseGuards(JwtAuthGuard)
async getNotes(
  @Param('sessionId') sessionId: string,
  @CurrentUser() user: any
) {
  const notes = await this.counselService.getNotesForSession(
    sessionId,
    user.userId
  );
  return { notes };
}

@Put('notes/:noteId')
@UseGuards(JwtAuthGuard)
async updateNote(
  @Param('noteId') noteId: string,
  @CurrentUser() user: any,
  @Body() updateNoteDto: UpdateNoteDto
) {
  const note = await this.counselService.updateNote(
    noteId,
    user.userId,
    updateNoteDto
  );
  return { note };
}

@Delete('notes/:noteId')
@UseGuards(JwtAuthGuard)
@HttpCode(204)
async deleteNote(
  @Param('noteId') noteId: string,
  @CurrentUser() user: any
) {
  await this.counselService.deleteNote(noteId, user.userId);
}
```

**Acceptance Criteria**:
- [ ] All endpoints return correct HTTP status codes
- [ ] Authentication required for all note operations
- [ ] Error responses include meaningful messages
- [ ] Endpoints tested with Postman/Thunder Client

---

### Task 6: Implement Session Sharing Service Methods
**Objective**: Complete backend for share functionality

**Steps**:
1. Add `createShare()` method to CounselService
2. Add `getSharesForSession()` method
3. Add `revokeShare()` method
4. Add `getSharedSession()` method (public endpoint)
5. Generate secure random share tokens
6. Validate share token expiration

**Files Changed**:
- `packages/api/src/counsel/counsel.service.ts`

**Key Methods**:
```typescript
async createShare(
  sessionId: string,
  sharedBy: string,
  sharedWith?: string
): Promise<SessionShare> {
  // 1. Verify user owns session
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId }
  });

  if (session.userId !== sharedBy) {
    throw new ForbiddenException('Only session owner can share');
  }

  // 2. Generate secure token
  const shareToken = randomBytes(32).toString('hex');

  // 3. Create share
  return this.prisma.sessionShare.create({
    data: {
      sessionId,
      shareToken,
      sharedBy,
      sharedWith: sharedWith || null,
      expiresAt: null // Never expires by default
    }
  });
}

async getSharedSession(token: string, viewerEmail?: string) {
  // 1. Find share
  const share = await this.prisma.sessionShare.findUnique({
    where: { shareToken: token },
    include: {
      session: {
        include: {
          messages: {
            orderBy: { timestamp: 'asc' }
          }
        }
      }
    }
  });

  if (!share) {
    throw new NotFoundException('Share not found');
  }

  // 2. Check expiration
  if (share.expiresAt && share.expiresAt < new Date()) {
    throw new ForbiddenException('Share link has expired');
  }

  // 3. Check email restriction
  if (share.sharedWith && share.sharedWith !== viewerEmail) {
    throw new ForbiddenException('This share is restricted');
  }

  return {
    id: share.session.id,
    title: share.session.title,
    createdAt: share.session.createdAt,
    messages: share.session.messages,
    isReadOnly: true
  };
}
```

**Acceptance Criteria**:
- [ ] Share tokens are cryptographically secure
- [ ] Email restrictions enforced
- [ ] Expiration checked correctly
- [ ] Only owners can create/revoke shares

---

### Task 7: Implement Session Sharing Controller Endpoints
**Objective**: Create REST endpoints for sharing

**Steps**:
1. Add share endpoints to CounselController
2. Make `GET /counsel/shared/:token` public (no auth guard)
3. Protect create/list/delete with JWT guard
4. Return share URLs in response

**Files Changed**:
- `packages/api/src/counsel/counsel.controller.ts`

**Example**:
```typescript
@Post('share/:sessionId')
@UseGuards(JwtAuthGuard)
async createShare(
  @Param('sessionId') sessionId: string,
  @CurrentUser() user: any,
  @Body() body: { sharedWith?: string }
) {
  const share = await this.counselService.createShare(
    sessionId,
    user.userId,
    body.sharedWith
  );
  return {
    shareToken: share.shareToken,
    shareUrl: `${process.env.WEB_URL}/shared/${share.shareToken}`
  };
}

@Get('shared/:token')
// No auth guard - public endpoint
async getSharedSession(
  @Param('token') token: string,
  @Query('email') email?: string
) {
  return this.counselService.getSharedSession(token, email);
}
```

**Acceptance Criteria**:
- [ ] Authenticated users can create shares
- [ ] Public can view shared sessions with valid token
- [ ] Share URLs generated correctly
- [ ] Frontend components can integrate easily

---

### Task 8: Create SessionNotesPanel Frontend Component
**Objective**: Build React component for displaying and adding notes

**Steps**:
1. Create `packages/web/src/components/SessionNotesPanel.tsx`
2. Implement note list with filtering
3. Add note creation form
4. Handle loading and error states
5. Style with Tailwind CSS
6. Add optimistic UI updates

**Files Created**:
- `packages/web/src/components/SessionNotesPanel.tsx`

**Component Structure**:
```tsx
interface SessionNotesPanelProps {
  sessionId: string;
  currentUserId: string;
  userRole: 'user' | 'counselor' | 'viewer';
  shareToken?: string;
}

export function SessionNotesPanel({
  sessionId,
  currentUserId,
  userRole,
  shareToken
}: SessionNotesPanelProps) {
  const [notes, setNotes] = useState<SessionNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [loading, setLoading] = useState(false);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [sessionId]);

  const fetchNotes = async () => {
    try {
      const response = await axios.get(`/api/counsel/notes/${sessionId}`);
      setNotes(response.data.notes);
    } catch (error) {
      console.error('Failed to fetch notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      const response = await axios.post(`/api/counsel/notes/${sessionId}`, {
        content: newNote,
        isPrivate: userRole === 'counselor' ? isPrivate : false
      });

      setNotes([...notes, response.data.note]);
      setNewNote('');
      setIsPrivate(false);
    } catch (error) {
      console.error('Failed to add note:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold mb-4">Session Notes</h3>

      {/* Note List */}
      <div className="space-y-3 mb-6">
        {notes.map(note => (
          <div key={note.id} className="border border-gray-200 rounded p-3">
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sm">
                {note.authorName}
                {note.isPrivate && (
                  <span className="ml-2 text-xs bg-gray-200 px-2 py-1 rounded">
                    Private
                  </span>
                )}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap">{note.content}</p>
          </div>
        ))}
      </div>

      {/* Add Note Form */}
      {userRole !== 'viewer' && (
        <div>
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a note to this session..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />

          {userRole === 'counselor' && (
            <label className="flex items-center mt-2 text-sm">
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={(e) => setIsPrivate(e.target.checked)}
                className="mr-2"
              />
              Private note (counselor only)
            </label>
          )}

          <button
            onClick={handleAddNote}
            disabled={loading || !newNote.trim()}
            className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Note'}
          </button>
        </div>
      )}
    </div>
  );
}
```

**Acceptance Criteria**:
- [ ] Notes display correctly with author and timestamp
- [ ] Private notes marked visually
- [ ] Form validates before submission
- [ ] Optimistic updates feel responsive
- [ ] Error states handled gracefully

---

### Task 9: Integrate Notes Panel into Conversation Views
**Objective**: Add notes panel to conversation and shared views

**Steps**:
1. Add SessionNotesPanel to ConversationView.tsx (owner view)
2. Add SessionNotesPanel to shared/[token]/page.tsx (shared view)
3. Determine user role based on context
4. Handle authentication state
5. Add visual indicator for note count

**Files Changed**:
- `packages/web/src/components/ConversationView.tsx`
- `packages/web/src/app/shared/[token]/page.tsx`

**Integration in ConversationView.tsx**:
```tsx
// Add to ConversationView component
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Main conversation - 2 columns */}
  <div className="lg:col-span-2">
    {/* Existing conversation messages */}
  </div>

  {/* Notes panel - 1 column */}
  <div className="lg:col-span-1">
    <SessionNotesPanel
      sessionId={sessionId}
      currentUserId={user.id}
      userRole="user"
    />
  </div>
</div>
```

**Integration in shared/[token]/page.tsx**:
```tsx
// Add after main conversation display
{session && (
  <SessionNotesPanel
    sessionId={session.id}
    currentUserId={user?.id}
    userRole="viewer"
    shareToken={token}
  />
)}
```

**Acceptance Criteria**:
- [ ] Notes panel visible on conversation page
- [ ] Notes panel visible on shared conversation page
- [ ] Panel responsive on mobile
- [ ] User role correctly determined
- [ ] Anonymous viewers can't add notes

---

### Task 10: Add Shared Types to @mychristiancounselor/shared
**Objective**: Create TypeScript types for notes and shares

**Steps**:
1. Add SessionNote interface
2. Add SessionShare interface
3. Add CreateNoteDto interface
4. Export from shared package
5. Update both frontend and backend imports

**Files Changed**:
- `packages/shared/src/lib/shared.ts`

**Types to Add**:
```typescript
export interface SessionNote {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'counselor' | 'viewer';
  content: string;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SessionShare {
  id: string;
  sessionId: string;
  shareToken: string;
  sharedBy: string;
  sharedWith: string | null;
  organizationId: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface CreateNoteRequest {
  content: string;
  isPrivate?: boolean;
}

export interface CreateShareRequest {
  sharedWith?: string;
}
```

**Acceptance Criteria**:
- [ ] Types imported successfully in frontend
- [ ] Types imported successfully in backend
- [ ] No TypeScript compilation errors
- [ ] Types match database schema

---

### Task 11: Test Complete Workflow End-to-End
**Objective**: Verify all features work together

**Test Cases**:

**TC1: Create and View Share Link**
1. Login as user A
2. Create a counseling session
3. Click "Share" button
4. Create public share link
5. Copy share URL
6. Open URL in incognito browser
7. ✓ Verify conversation displays correctly

**TC2: Add Notes to Shared Conversation**
1. Continue from TC1
2. Login as user B (counselor)
3. Access shared conversation
4. Add a public note
5. ✓ Verify note appears immediately
6. Open share URL again in incognito
7. ✓ Verify note visible to public viewers

**TC3: Private Counselor Notes**
1. Login as counselor
2. Access shared session
3. Add note and mark as "Private"
4. ✓ Verify private note has visual indicator
5. Logout and view as public
6. ✓ Verify private note NOT visible
7. Login as session owner
8. ✓ Verify private note NOT visible (only counselor sees it)

**TC4: Restricted Share Links**
1. Create share with email restriction
2. Try accessing with different email
3. ✓ Verify access denied
4. Try accessing with correct email
5. ✓ Verify access granted

**TC5: Revoke Share**
1. Create share link
2. Verify accessible
3. Revoke share from owner dashboard
4. Try accessing link
5. ✓ Verify "Share not found" error

**Acceptance Criteria**:
- [ ] All test cases pass
- [ ] No console errors
- [ ] UI responsive on mobile
- [ ] Loading states smooth
- [ ] Error messages clear

---

### Task 12: Update API Documentation
**Objective**: Document new endpoints for team reference

**Steps**:
1. Create API documentation markdown file
2. Document all note endpoints
3. Document all share endpoints
4. Include example requests/responses
5. Document authentication requirements
6. Add authorization rules

**Files Created**:
- `docs/api/session-notes-api.md`
- `docs/api/session-sharing-api.md`

**Acceptance Criteria**:
- [ ] All endpoints documented
- [ ] Example requests included
- [ ] Response schemas defined
- [ ] Error codes documented

---

## Technical Considerations

### Security

1. **Share Token Generation**: Use crypto.randomBytes(32) for secure tokens
2. **SQL Injection**: Prisma prevents this automatically
3. **XSS Prevention**: React escapes content automatically; notes sanitized
4. **Authorization**: Every endpoint checks user permissions
5. **Rate Limiting**: Consider rate limiting share creation (future)

### Performance

1. **Note Loading**: Paginate notes if session has >100 notes
2. **Database Indexes**: Already included in schema for common queries
3. **Caching**: Consider Redis cache for shared sessions (future)
4. **Optimistic Updates**: Frontend updates UI before server confirms

### Scalability

1. **Real-time Updates**: Currently polling; WebSocket upgrade path exists
2. **Note Size Limit**: 5000 characters prevents abuse
3. **Attachment Support**: Not included; future enhancement
4. **Search**: Not included; future enhancement with full-text search

## Future Enhancements (Not in This Phase)

- Real-time note updates via WebSocket
- Note attachments (images, PDFs)
- Rich text formatting for notes
- @mention notifications
- Note threads/replies
- Export session with notes to PDF
- Note search functionality
- Note templates for common counseling topics

## Success Criteria

### Functional Requirements
- [ ] Users can create share links for their sessions
- [ ] Share links work for authenticated and anonymous viewers
- [ ] Email-restricted shares enforce restrictions
- [ ] Notes can be added to sessions
- [ ] Private notes visible only to counselors
- [ ] Notes display with author, timestamp, and content
- [ ] Share links can be revoked

### Non-Functional Requirements
- [ ] API response time < 500ms for note operations
- [ ] UI feels responsive with optimistic updates
- [ ] No security vulnerabilities in share token generation
- [ ] Database schema in sync with migrations
- [ ] All endpoints have error handling
- [ ] Code follows existing project patterns

### Quality Gates
- [ ] All TypeScript compiles without errors
- [ ] Prisma migrations run successfully
- [ ] Manual testing passes all test cases
- [ ] No console errors in browser
- [ ] Mobile responsive design works

## Timeline Estimate

- **Task 1-2**: 1 hour (Schema updates and migration)
- **Task 3-7**: 3 hours (Backend implementation)
- **Task 8-9**: 2 hours (Frontend implementation)
- **Task 10**: 30 minutes (Shared types)
- **Task 11**: 1 hour (Testing)
- **Task 12**: 30 minutes (Documentation)

**Total**: ~8 hours of focused development time

## Dependencies

- Phase 1 Foundation (completed)
- Authentication system (JWT guards)
- Existing sharing UI components
- Prisma 5.x
- NestJS 10.x
- React 19 / Next.js 15

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Schema migration conflicts | High | Review existing migrations before changes |
| Private note visibility bugs | High | Comprehensive authorization testing |
| Share token collisions | Medium | Use crypto-random 32-byte tokens |
| Performance with many notes | Medium | Implement pagination if >100 notes |
| Frontend state management | Low | Use simple useState; Redux not needed yet |

## Post-Implementation

After completing this phase:
1. Monitor error logs for authorization issues
2. Gather user feedback on notes UX
3. Measure API performance metrics
4. Plan Phase 4: Organization enhancements
5. Consider real-time updates for next iteration
