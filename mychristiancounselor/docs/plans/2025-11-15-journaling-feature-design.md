# Journaling Feature (Session Notes) - Design Document

**Date**: 2025-11-15
**Status**: Design Complete
**Related**: Phase 3 Shared Conversations (2025-11-14-phase-3-shared-conversations-notes.md)

## Overview

The journaling feature allows users to add collaborative notes to counseling sessions. These notes can be viewed alongside the conversation and included in printouts, providing a way for counselors and clients to document insights, progress, and reflections.

**Alignment with Phase 3 Plan**: This design is based on and extends the Session Notes feature outlined in `2025-11-14-phase-3-shared-conversations-notes.md`. The core data model, API structure, and authorization rules follow the Phase 3 specification, with additional requirements for printout functionality and scripture text inclusion.

## Core Requirements

### Terminology
- **Journal Entries**: Notes attached to a conversation/session
- **Session Notes**: Alternative term for journal entries (used interchangeably)
- **Shared Conversation**: A conversation that has been shared with other authenticated users

### Functional Requirements

1. **Attachment to Conversations**
   - Journal entries are attached to specific counseling sessions
   - Each entry is linked to a session ID
   - Entries persist with the conversation across views

2. **Collaborative Access**
   - All users with access to a shared conversation can add journal entries
   - Entries are visible to all users with conversation access (except private entries)
   - Real-time or near-real-time updates when multiple users are collaborating

3. **Author Attribution**
   - Each journal entry must display the author's name
   - Timestamp for when entry was created
   - Clear visual identification of who wrote what

4. **Privacy Controls**
   - Counselors can mark individual entries as "private"
   - Private entries are only visible to the counselor who created them
   - Allows professional notes without exposing to clients
   - Clear visual distinction between regular and private entries

## User Experience

### Layout & Display

#### Desktop View
- Two-column layout:
  - **Left column**: Conversation messages
  - **Right column**: Journal entries
- Both columns scrollable independently
- Sticky header for journal section
- New entry form at bottom of journal column

#### Mobile View
- Single column with expandable journal panel
- Toggle button to show/hide journal entries
- Defaults to conversation view
- Journal panel slides in/overlays when activated
- Easy toggle between conversation and journal

### Visual Design
- Journal entries displayed as cards or list items
- Each entry shows:
  - Author name and avatar/initial
  - Timestamp (relative or absolute)
  - Entry content
  - Private indicator (for counselors only)
- Color coding or icon for private entries
- Clear separation between entries

## Access Control & Permissions

### Who Can Share Conversations
- Only authenticated (subscribed) users can create conversations
- Only authenticated users can share conversations
- Only authenticated users can be invited/shared with
- Registered but unsubscribed users can have conversations shared with them
- Registered but unsubscribed users cannot share conversations themselves

### Who Can Add Journal Entries
- All authenticated users with access to a shared conversation
- Original conversation owner
- Users the conversation has been shared with
- Requires authentication (no anonymous journaling)

### Privacy Levels
- **Regular entries**: Visible to all users with conversation access
- **Private entries**: Only visible to the counselor who created them
  - Only users with counselor role can create private entries
  - System must verify counselor role before allowing private flag

## Printout Functionality

### Requirements
1. **PDF Export**
   - Generate downloadable PDF document
   - Include both conversation and journal sections
   - Professional formatting suitable for records

2. **Print-Friendly View**
   - CSS-optimized for direct browser printing
   - Clean layout without UI controls
   - Proper page breaks

### Printout Structure
```
[Header: MyChristianCounselor]
[Session Information: Date, Participants]

=== Conversation ===
[Message 1]
[Message 2]
...

=== Journal ===
[Entry 1: Author, Timestamp, Content]
[Entry 2: Author, Timestamp, Content]
...

=== Scripture References ===
[Full text of all referenced verses]
```

### Scripture References
- All Bible verses referenced in conversation must include full text
- Not just citations (e.g., "John 3:16")
- Actual verse text from appropriate translation
- Grouped at end of printout or inline with conversation

## Technical Architecture

### Database Schema

#### SessionNote table (from Phase 3)
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
- Uses `uuid()` for ID generation (consistent with Phase 3)

### API Endpoints (aligned with Phase 3)

#### Session Notes Endpoints
```
POST   /counsel/notes/:sessionId    - Add note to session
GET    /counsel/notes/:sessionId    - Get all notes for session
PUT    /counsel/notes/:noteId       - Update note (author only, within 30 min)
DELETE /counsel/notes/:noteId       - Delete note (author only, within 30 min)
```

#### Create Note
```
POST /counsel/notes/:sessionId
Auth: Required (JWT)
Body: { content: string, isPrivate?: boolean }
Returns: { note: SessionNote }
Validation: content max 5000 characters
```

#### Get Notes
```
GET /counsel/notes/:sessionId
Auth: Required (must have session access)
Returns: { notes: SessionNote[] }
Notes: Automatically filters private entries unless user is author
```

#### Update Note
```
PUT /counsel/notes/:noteId
Auth: Required (must be author, within 30 minutes)
Body: { content: string, isPrivate?: boolean }
Returns: { note: SessionNote }
```

#### Delete Note
```
DELETE /counsel/notes/:noteId
Auth: Required (must be author, within 30 minutes)
Returns: HTTP 204 No Content
```

#### Export Session (PDF/Print) - New Addition
```
GET /counsel/export/:sessionId?format=pdf|print
Auth: Required (must have session access)
Returns: Formatted document with conversation + notes + scripture text
```

### Frontend Components

#### JournalPanel
- Main container for journal entries
- Displays list of entries
- New entry form
- Handles desktop/mobile layout differences

#### JournalEntry
- Individual entry display
- Author info, timestamp, content
- Edit/delete buttons (for entry author)
- Private indicator (for counselors)

#### JournalEntryForm
- Text input for new entries
- "Private" checkbox (counselors only)
- Submit button
- Character limit indicator (optional)

#### SessionExport
- PDF export button
- Print-friendly view button
- Handles scripture text inclusion
- Formats journal section

### Integration Points

1. **Session Sharing Infrastructure**
   - Extends existing Phase 3 session sharing
   - Uses same permission checks for journal access
   - Leverages share tokens and access control

2. **Scripture Reference System**
   - Fetches full text for all Bible references
   - Caches scripture text for performance
   - Supports multiple translations

3. **Authentication System**
   - Requires user authentication for all journal operations
   - Role-based access for private entries
   - Uses existing JWT tokens

## Edge Cases & Considerations

### Editing & Deletion (Resolved by Phase 3)
- **Answer**: Users can edit their entries within 30 minutes of creation
- **Answer**: Users can delete their entries within 30 minutes of creation
- **Implementation**: Show "edited" indicator if note was modified
- **Authorization**: Only note author can edit/delete their own notes

### Content Constraints (Resolved by Phase 3)
- **Character Limit**: 5000 characters maximum per note
- **Validation**: Enforced at DTO level with class-validator
- **Error Message**: "Note content cannot exceed 5000 characters"

### Note Ordering (Resolved by Phase 3)
- **Order**: Chronological by creation time (oldest first)
- **Query**: `orderBy: { createdAt: 'asc' }`
- **Rationale**: Notes follow timeline of conversation

### Offline Behavior (Open Question)
- **Challenge**: What happens if user adds entry while offline?
- **Recommendation**: Queue entries locally, sync when connection restored
- **Recommendation**: Show pending status until confirmed by server
- **Status**: Not addressed in Phase 3; future enhancement

### Long Conversations (Partially Resolved)
- **Phase 3 Recommendation**: Paginate notes if session has >100 notes
- **Open Question**: Should we implement pagination in initial release?
- **Current Plan**: Start without pagination, add if needed

### Private Entry Visibility (Resolved by Phase 3)
- **Rule**: Private entries filtered server-side in getNotesForSession()
- **Rule**: Only note author can see their private entries
- **Rule**: Future: Organization admins may see all private notes
- **Export Rule**: Private entries excluded from exports for non-authors
- **UI Rule**: Clear "Private" badge on counselor's private notes

### Multi-User Conflicts (Resolved by Phase 3)
- **Solution**: Both entries saved, sorted by timestamp
- **Approach**: Optimistic UI updates with polling for new notes
- **Future**: Real-time updates via WebSocket

### Additional Open Questions

#### Notifications
- **Question**: Should users be notified when new notes are added?
- **Status**: Not addressed in Phase 3
- **Consideration**: Email notification or in-app notification

#### Linking to Messages
- **Question**: Can a note reference a specific message in the conversation?
- **Status**: Not in Phase 3 scope
- **Future Enhancement**: Allow @message references or reply threading

#### Rich Text Formatting
- **Question**: Can notes include markdown or rich text?
- **Status**: Phase 3 specifies plain text only
- **Future Enhancement**: Markdown support listed in Phase 3 future enhancements

#### Archive Behavior
- **Question**: When conversation is archived, what happens to notes?
- **Status**: Notes remain attached via sessionId foreign key
- **Answer**: Notes are preserved and can be viewed in archived sessions

#### Search Functionality
- **Question**: Can users search within notes?
- **Status**: Not in Phase 3 scope
- **Future Enhancement**: Full-text search listed in Phase 3 future enhancements

#### Bulk Export
- **Question**: Can counselors export just notes without conversation?
- **Status**: Not specified in Phase 3
- **Consideration**: Add parameter to export endpoint: `?includeConversation=false`

## Implementation Phases

### Phase 1: Basic Infrastructure
1. Database schema for journal entries
2. API endpoints for CRUD operations
3. Permission checks integrated with session sharing

### Phase 2: Core UI
4. Desktop two-column layout
5. Journal entry display and form
6. Basic create/read functionality

### Phase 3: Privacy & Permissions
7. Private entry toggle for counselors
8. Role-based filtering
9. Author attribution and timestamps

### Phase 4: Mobile Responsiveness
10. Expandable journal panel for mobile
11. Toggle controls
12. Touch-friendly interface

### Phase 5: Export Functionality
13. Print-friendly CSS view
14. PDF generation
15. Scripture text inclusion

## Success Criteria

- [ ] Users can add journal entries to their conversations
- [ ] Journal entries appear side-by-side with conversation (desktop)
- [ ] Journal panel is expandable on mobile devices
- [ ] Counselors can mark entries as private
- [ ] Private entries only visible to author
- [ ] All entries show author name and timestamp
- [ ] PDF export includes conversation, journal, and scripture text
- [ ] Print-friendly view works correctly
- [ ] Only authenticated users can add entries
- [ ] Permission checks prevent unauthorized access

## Future Enhancements

- Rich text formatting in journal entries
- Attachments (images, documents)
- Tagging system for entries (themes, topics)
- Search within journal entries
- Export to other formats (Word, plain text)
- Email journal summary to participants
- Highlight/reference specific conversation messages from journal

## Alignment with Phase 3 Plan

### Core Features (100% Aligned)
- ✓ Database schema matches Phase 3 SessionNote model
- ✓ API endpoint structure follows Phase 3 convention (`/counsel/notes/...`)
- ✓ Authorization rules identical (owner, counselor, viewer roles)
- ✓ Private note functionality as specified
- ✓ Edit/delete within 30 minutes (Phase 3 decision)
- ✓ 5000 character limit (Phase 3 decision)
- ✓ Chronological ordering (Phase 3 decision)

### Additional Requirements (Brainstorming Session)
This design adds the following requirements beyond Phase 3:

1. **Enhanced Printout Functionality**
   - PDF export (Phase 3 future enhancement, moved to core)
   - Print-friendly CSS view (new requirement)
   - Scripture text inclusion in exports (new requirement)
   - Full verse text, not just citations (new requirement)

2. **Clarified Permissions**
   - Only authenticated users can add journal entries (confirmed)
   - Only authenticated users can be shared with (confirmed)
   - Author attribution required on all entries (confirmed)

3. **Layout Specifications**
   - Two-column desktop layout (conversation left, notes right)
   - Expandable panel for mobile (toggle between views)
   - Side-by-side is preferred over tabs or modals

### Phase 3 Tasks This Design Extends
- **Task 8**: SessionNotesPanel component (adds print/export UI)
- **Task 9**: Integration into views (adds export button placement)
- **New Task**: Implement PDF generation service
- **New Task**: Implement print-friendly view with scripture text

### Implementation Approach
This design document serves as the **requirements specification** for implementing Phase 3 Session Notes with the additional printout enhancements. The Phase 3 implementation plan (Tasks 1-12) should be followed, with these additions:

- **Task 13**: Implement session export service (PDF generation)
- **Task 14**: Create print-friendly view component
- **Task 15**: Integrate scripture text fetching for exports
- **Task 16**: Add export buttons to UI

## Notes

This feature builds on the Phase 3 Shared Conversations infrastructure. The session sharing, access control, and permission systems are prerequisites for journal functionality.

Journal entries should feel like a natural extension of the conversation, not a separate feature. The goal is seamless collaboration between counselors and clients in documenting their journey together.

**Key Design Principle**: Notes are collaborative, attached to the conversation timeline, and should be as easy to add as sending a message. The UI should encourage ongoing documentation rather than treating notes as an afterthought.
