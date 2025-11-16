# Session Notes Feature - Testing Checklist

**Date**: 2025-11-16
**Feature**: Session Notes/Journaling (Phase 3)
**Status**: Ready for Testing

## Overview

This checklist covers end-to-end testing for the Session Notes feature, including CRUD operations, export functionality, and mobile responsiveness.

## Pre-Testing Setup

- [ ] API server running on port 3697
- [ ] Web app running on port 3699
- [ ] Database migrations applied (SessionNote table exists)
- [ ] Test user accounts created (regular user + counselor)
- [ ] At least one session with messages exists

## Backend API Testing

### Session Notes CRUD

#### Create Note
- [ ] POST /counsel/notes/:sessionId creates a note successfully
- [ ] Returns 401 without authentication
- [ ] Returns 404 for non-existent session
- [ ] Validates content (max 5000 characters)
- [ ] Validates content is not empty
- [ ] Sets authorName from user profile
- [ ] Sets authorRole based on session ownership
- [ ] Creates private note when isPrivate=true and user is counselor
- [ ] Regular users cannot create private notes

#### Get Notes
- [ ] GET /counsel/notes/:sessionId returns all notes for session
- [ ] Returns 401 without authentication
- [ ] Returns 404 for non-existent session
- [ ] Filters private notes (only shows to author)
- [ ] Orders notes by createdAt ascending
- [ ] Includes all note fields (id, content, author info, timestamps)

#### Update Note
- [ ] PUT /counsel/notes/:noteId updates note content
- [ ] Returns 401 without authentication
- [ ] Returns 403 if user is not the author
- [ ] Returns 403 if note is older than 30 minutes
- [ ] Updates isPrivate flag for counselors
- [ ] Updates updatedAt timestamp

#### Delete Note
- [ ] DELETE /counsel/notes/:noteId deletes the note
- [ ] Returns 204 on success
- [ ] Returns 401 without authentication
- [ ] Returns 403 if user is not the author
- [ ] Returns 403 if note is older than 30 minutes
- [ ] Actually removes note from database

### Session Export

#### Export Endpoint
- [ ] GET /counsel/export/:sessionId returns export data
- [ ] Returns 401 without authentication
- [ ] Returns 404 for non-existent session
- [ ] Returns 403 if user doesn't own session (Phase 1)
- [ ] Includes session metadata (id, title, dates)
- [ ] Includes all messages ordered by timestamp
- [ ] Includes filtered notes (private notes only to author)
- [ ] Includes scripture references (even if placeholder)
- [ ] Includes user information in session object

## Frontend UI Testing

### Session Notes Panel (Desktop)

#### Display
- [ ] Notes panel visible on desktop (≥1024px) when authenticated
- [ ] Panel takes 1/3 width, conversation takes 2/3 width
- [ ] Panel has "Session Notes" header
- [ ] Note list displays all notes chronologically
- [ ] Each note shows author name, timestamp, content
- [ ] Private notes show yellow background + "(Private)" badge
- [ ] Empty state shows "No notes yet" message

#### Create Note
- [ ] Text area allows input
- [ ] Character counter displays correctly
- [ ] Counter turns red near/at 5000 character limit
- [ ] "Private" checkbox visible for counselors only
- [ ] "Add Note" button enabled when text entered
- [ ] Button disabled when empty or loading
- [ ] Note appears immediately after creation
- [ ] Form clears after successful submission
- [ ] Error message displays on failure

#### Edit/Delete (Future)
- [ ] Edit button appears for own notes (if implemented)
- [ ] Delete button appears for own notes (if implemented)
- [ ] Edit/delete only work within 30 minutes (if implemented)

### Session Notes Panel (Mobile)

#### Toggle
- [ ] "📝 Notes" button visible on mobile (<1024px)
- [ ] Button only shows when authenticated and sessionId exists
- [ ] Clicking button opens overlay panel
- [ ] Panel slides in from right side
- [ ] Panel width: full on mobile, 384px on small screens

#### Overlay
- [ ] Panel has semi-transparent backdrop
- [ ] Clicking backdrop closes panel
- [ ] Close button (✕) in header works
- [ ] Panel header shows "Session Notes"
- [ ] SessionNotesPanel component renders inside
- [ ] All desktop panel features work in overlay

### Export/Print Functionality

#### Export Button
- [ ] "🖨️ Export" button visible in header
- [ ] Button only shows when authenticated and sessionId exists
- [ ] Clicking button opens export modal
- [ ] Modal has semi-transparent backdrop
- [ ] Modal is centered on screen
- [ ] Modal is responsive (max-width 6xl, padded on mobile)

#### Export Modal
- [ ] Modal header shows "Session Export"
- [ ] Close button (✕) works in header
- [ ] Escape key closes modal
- [ ] SessionExportView component renders inside
- [ ] Modal is scrollable (90vh height)
- [ ] Modal appears above all other content (z-50)

#### SessionExportView Component
- [ ] Shows loading spinner while fetching
- [ ] Shows error message on failure
- [ ] Displays session header with title and date
- [ ] Shows participant information
- [ ] Displays all messages with role labels
- [ ] User messages have distinct styling
- [ ] Assistant messages have distinct styling
- [ ] Scripture references inline in messages display correctly
- [ ] Notes section shows all accessible notes
- [ ] Private notes show with badge
- [ ] Scripture references summary section displays
- [ ] Footer shows timestamp and branding
- [ ] Print button (🖨️) is visible
- [ ] Print button calls window.print()

#### Print Output
- [ ] Browser print (Ctrl+P / Cmd+P) works
- [ ] Print preview looks clean
- [ ] Colors convert to black/white appropriately
- [ ] Page breaks are reasonable
- [ ] No UI elements (buttons, navigation) appear
- [ ] All content is readable
- [ ] Margins are appropriate
- [ ] Multi-page sessions flow correctly
- [ ] Footer appears on pages
- [ ] Scripture text is included (or placeholder)

## Integration Testing

### Full User Flow
- [ ] User logs in
- [ ] User starts a conversation
- [ ] User asks a question, receives response
- [ ] Notes panel appears automatically
- [ ] User adds a note
- [ ] Note appears in panel immediately
- [ ] User adds another note
- [ ] Both notes visible, correctly ordered
- [ ] User clicks export button
- [ ] Export modal opens with data
- [ ] User prints session
- [ ] Print output includes conversation + notes
- [ ] User closes export modal
- [ ] User returns to conversation

### Multi-User Collaboration (Phase 1 - Owner Only)
- [ ] Session owner can add notes
- [ ] Session owner can see their notes
- [ ] Session owner can export session
- [ ] Non-owner cannot access notes (Phase 1)
- [ ] Non-owner cannot export session (Phase 1)

### Private Notes (Counselor Only)
- [ ] Counselor can check "Private" checkbox
- [ ] Private note is saved with isPrivate=true
- [ ] Private note shows yellow background
- [ ] Private note shows "(Private)" badge
- [ ] Client user cannot see counselor's private notes
- [ ] Counselor can see all their private notes
- [ ] Export excludes other users' private notes

## Error Handling

### Network Errors
- [ ] Graceful error when API is down
- [ ] Error message when note creation fails
- [ ] Error message when note fetch fails
- [ ] Error message when export fails
- [ ] Loading states prevent double-submission

### Authentication Errors
- [ ] Redirect or error when token expires
- [ ] Notes panel hidden when not authenticated
- [ ] Export button hidden when not authenticated
- [ ] 401 errors handled gracefully

### Validation Errors
- [ ] Empty note shows validation error
- [ ] 5000+ character note rejected with error
- [ ] Error messages are user-friendly

## Performance Testing

### Load Time
- [ ] Notes load within 2 seconds
- [ ] Export data loads within 3 seconds
- [ ] UI remains responsive during load

### Scalability
- [ ] 10 notes display correctly
- [ ] 50 notes display correctly
- [ ] 100+ notes (scroll performance acceptable)
- [ ] Large export (500+ messages) loads reasonably

## Responsive Design Testing

### Desktop (≥1024px)
- [ ] Two-column layout works
- [ ] Notes panel visible by default
- [ ] Export modal is large and centered
- [ ] All buttons and inputs accessible

### Tablet (768px - 1023px)
- [ ] Notes hidden by default
- [ ] Mobile toggle button appears
- [ ] Overlay panel works correctly
- [ ] Export modal adapts to screen size

### Mobile (≤767px)
- [ ] Single column layout
- [ ] Mobile toggle button visible
- [ ] Full-width overlay panel
- [ ] Export modal is full-screen with padding
- [ ] Touch interactions work correctly

## Browser Compatibility

- [ ] Chrome/Chromium (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## Regression Testing

- [ ] Existing conversation functionality unaffected
- [ ] Message sending still works
- [ ] Scripture references still display
- [ ] Translation selector still works
- [ ] User menu still works
- [ ] History page still works

## Known Limitations (Phase 1)

- [ ] Only session owner can add notes (sharing not implemented)
- [ ] Only session owner can export (sharing not implemented)
- [ ] Scripture references in export show placeholder text (Bible API not integrated)
- [ ] No real-time updates (polling not implemented)
- [ ] Notes cannot be edited beyond 30 minutes
- [ ] Notes cannot be deleted beyond 30 minutes
- [ ] No rich text formatting in notes
- [ ] No attachments in notes

## Test Results

**Tested By**: _____________
**Date**: _____________
**Environment**: [ ] Local [ ] Staging [ ] Production

**Overall Result**: [ ] Pass [ ] Fail [ ] Partial

**Issues Found**:
1.
2.
3.

**Notes**:
