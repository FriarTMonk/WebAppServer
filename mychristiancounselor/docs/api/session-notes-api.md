# Session Notes API Documentation

**Version**: 1.0
**Date**: 2025-11-16
**Base URL**: `http://localhost:3697` (development)

## Overview

The Session Notes API provides endpoints for creating, reading, updating, and deleting collaborative notes attached to counseling sessions. It also includes an export endpoint for generating printable session reports.

## Authentication

All endpoints require JWT authentication via Bearer token in the Authorization header:

```
Authorization: Bearer <jwt_token>
```

## Endpoints

### Create Note

Creates a new note attached to a session.

**Endpoint**: `POST /counsel/notes/:sessionId`

**Authentication**: Required (JWT)

**URL Parameters**:
- `sessionId` (string, required) - The ID of the session

**Request Body**:
```json
{
  "content": "string",      // Required, max 5000 characters, not empty
  "isPrivate": boolean      // Optional, default false, only counselors can set true
}
```

**Success Response** (201 Created):
```json
{
  "note": {
    "id": "uuid",
    "sessionId": "uuid",
    "authorId": "uuid",
    "authorName": "John Doe",
    "authorRole": "user",     // "user" | "counselor" | "viewer"
    "content": "Session notes content here",
    "isPrivate": false,
    "createdAt": "2025-11-16T10:30:00.000Z",
    "updatedAt": "2025-11-16T10:30:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Validation error (empty content, exceeds 5000 chars)
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Session does not exist

**Example**:
```bash
curl -X POST http://localhost:3697/counsel/notes/session-123 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Great progress today with managing anxiety triggers.",
    "isPrivate": false
  }'
```

---

### Get Notes for Session

Retrieves all notes for a specific session. Private notes are filtered (only visible to author).

**Endpoint**: `GET /counsel/notes/:sessionId`

**Authentication**: Required (JWT)

**URL Parameters**:
- `sessionId` (string, required) - The ID of the session

**Success Response** (200 OK):
```json
{
  "notes": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "authorId": "uuid",
      "authorName": "John Doe",
      "authorRole": "user",
      "content": "Session notes content here",
      "isPrivate": false,
      "createdAt": "2025-11-16T10:30:00.000Z",
      "updatedAt": "2025-11-16T10:30:00.000Z"
    },
    {
      "id": "uuid",
      "sessionId": "uuid",
      "authorId": "uuid",
      "authorName": "Jane Smith",
      "authorRole": "counselor",
      "content": "Clinical observation (private)",
      "isPrivate": true,
      "createdAt": "2025-11-16T10:35:00.000Z",
      "updatedAt": "2025-11-16T10:35:00.000Z"
    }
  ]
}
```

**Notes**:
- Notes are ordered by `createdAt` (ascending)
- Private notes are automatically filtered (you only see your own private notes)
- Returns empty array if session has no notes

**Error Responses**:
- `401 Unauthorized` - Missing or invalid JWT token
- `404 Not Found` - Session does not exist

**Example**:
```bash
curl -X GET http://localhost:3697/counsel/notes/session-123 \
  -H "Authorization: Bearer <token>"
```

---

### Update Note

Updates an existing note. Only the author can update their own notes, and only within 30 minutes of creation.

**Endpoint**: `PUT /counsel/notes/:noteId`

**Authentication**: Required (JWT)

**URL Parameters**:
- `noteId` (string, required) - The ID of the note

**Request Body**:
```json
{
  "content": "string",      // Optional, max 5000 characters
  "isPrivate": boolean      // Optional, only counselors can modify
}
```

**Success Response** (200 OK):
```json
{
  "note": {
    "id": "uuid",
    "sessionId": "uuid",
    "authorId": "uuid",
    "authorName": "John Doe",
    "authorRole": "user",
    "content": "Updated session notes content",
    "isPrivate": false,
    "createdAt": "2025-11-16T10:30:00.000Z",
    "updatedAt": "2025-11-16T10:45:00.000Z"
  }
}
```

**Error Responses**:
- `400 Bad Request` - Validation error (exceeds 5000 chars)
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Not the author OR note older than 30 minutes
- `404 Not Found` - Note does not exist

**Example**:
```bash
curl -X PUT http://localhost:3697/counsel/notes/note-456 \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Updated: Great progress today. Also discussed coping strategies."
  }'
```

---

### Delete Note

Deletes a note. Only the author can delete their own notes, and only within 30 minutes of creation.

**Endpoint**: `DELETE /counsel/notes/:noteId`

**Authentication**: Required (JWT)

**URL Parameters**:
- `noteId` (string, required) - The ID of the note

**Success Response** (204 No Content):
```
(empty response body)
```

**Error Responses**:
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - Not the author OR note older than 30 minutes
- `404 Not Found` - Note does not exist

**Example**:
```bash
curl -X DELETE http://localhost:3697/counsel/notes/note-456 \
  -H "Authorization: Bearer <token>"
```

---

### Export Session

Exports comprehensive session data for PDF generation or printing. Includes conversation, notes, and scripture references.

**Endpoint**: `GET /counsel/export/:sessionId`

**Authentication**: Required (JWT)

**URL Parameters**:
- `sessionId` (string, required) - The ID of the session to export

**Success Response** (200 OK):
```json
{
  "session": {
    "id": "uuid",
    "title": "Anxiety Management Session",
    "createdAt": "2025-11-16T10:00:00.000Z",
    "updatedAt": "2025-11-16T11:00:00.000Z",
    "user": {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    }
  },
  "messages": [
    {
      "id": "uuid",
      "role": "user",
      "content": "I've been struggling with anxiety lately...",
      "timestamp": "2025-11-16T10:05:00.000Z",
      "scriptureReferences": [
        {
          "book": "Philippians",
          "chapter": 4,
          "verseStart": 6,
          "verseEnd": 7,
          "translation": "ESV",
          "text": "Do not be anxious about anything..."
        }
      ]
    },
    {
      "id": "uuid",
      "role": "assistant",
      "content": "I understand. Let's explore biblical principles...",
      "timestamp": "2025-11-16T10:06:00.000Z",
      "scriptureReferences": []
    }
  ],
  "notes": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "authorId": "uuid",
      "authorName": "John Doe",
      "authorRole": "user",
      "content": "Helpful session on managing anxiety",
      "isPrivate": false,
      "createdAt": "2025-11-16T10:30:00.000Z",
      "updatedAt": "2025-11-16T10:30:00.000Z"
    }
  ],
  "scriptureReferences": [
    {
      "reference": "Philippians 4:6-7",
      "text": "Full text for Philippians 4:6-7 will be fetched from Bible API"
    }
  ]
}
```

**Notes**:
- Private notes are filtered (only author's private notes included)
- Messages ordered by timestamp (ascending)
- Notes ordered by createdAt (ascending)
- Scripture references extracted from messages
- Phase 1: Only session owner can export
- Phase 1: Scripture text is placeholder (Bible API integration pending)

**Error Responses**:
- `401 Unauthorized` - Missing or invalid JWT token
- `403 Forbidden` - User does not own session (Phase 1 limitation)
- `404 Not Found` - Session does not exist

**Example**:
```bash
curl -X GET http://localhost:3697/counsel/export/session-123 \
  -H "Authorization: Bearer <token>"
```

---

## Data Models

### SessionNote

```typescript
interface SessionNote {
  id: string;                           // UUID
  sessionId: string;                    // UUID, foreign key to Session
  authorId: string;                     // UUID, foreign key to User
  authorName: string;                   // Cached for display (denormalized)
  authorRole: 'user' | 'counselor' | 'viewer';
  content: string;                      // Max 5000 characters
  isPrivate: boolean;                   // Default false
  createdAt: Date;
  updatedAt: Date;
}
```

### Request DTOs

#### CreateNoteDto
```typescript
{
  content: string;        // Required, max 5000 chars, not empty
  isPrivate?: boolean;    // Optional, default false
}
```

#### UpdateNoteDto
```typescript
{
  content?: string;       // Optional, max 5000 chars
  isPrivate?: boolean;    // Optional
}
```

---

## Authorization Rules

### Note Creation
- ✅ Session owner can create notes
- ✅ Any authenticated user with session access can create notes
- ❌ Unauthenticated users cannot create notes
- ⚠️ Phase 1: Only session owner has access (sharing not implemented)

### Private Notes
- ✅ Only counselors can create private notes (`isPrivate: true`)
- ✅ Regular users attempting to set `isPrivate: true` will have it ignored
- ✅ Private notes only visible to the author
- ✅ Private notes excluded from exports for non-authors

### Note Modification
- ✅ Only note author can update or delete
- ✅ Only within 30 minutes of creation
- ❌ After 30 minutes, notes become immutable
- ❌ Cannot modify another user's notes

### Session Export
- ✅ Session owner can export
- ⚠️ Phase 1: Shared users cannot export (sharing not implemented)
- ✅ Export filters private notes (only includes user's private notes)

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding rate limits in production:
- 100 requests per minute per user
- 1000 requests per hour per user

---

## Error Handling

### Standard Error Response Format

```json
{
  "statusCode": 400,
  "message": "Note content cannot exceed 5000 characters",
  "error": "Bad Request"
}
```

### Common Error Codes

- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error (unexpected errors)

---

## Validation Rules

### Content Field
- **Required**: Yes (for create)
- **Type**: String
- **Min Length**: 1 character (not empty)
- **Max Length**: 5000 characters
- **Validation Message**: "Note content cannot exceed 5000 characters"
- **Empty Message**: "Note content cannot be empty"

### IsPrivate Field
- **Required**: No
- **Type**: Boolean
- **Default**: false
- **Restriction**: Only counselors can set to true
- **Behavior**: Silently ignored for non-counselors

---

## Phase 1 Limitations

The current implementation includes the following Phase 1 limitations:

1. **Session Sharing Not Implemented**
   - Only session owner can add notes
   - Only session owner can export session
   - Phase 2 will add share permissions and multi-user collaboration

2. **Bible API Integration Pending**
   - Scripture references in export show placeholder text
   - Phase 2 will integrate with Bible API for full verse text

3. **No Real-Time Updates**
   - Notes don't update in real-time for collaborators
   - Phase 2 will add WebSocket support for live updates

4. **Edit/Delete Time Window**
   - 30-minute window is fixed
   - Phase 2 may make this configurable

5. **No Pagination**
   - All notes returned in single response
   - Phase 2 will add pagination for sessions with 100+ notes

---

## Best Practices

### Client Implementation
1. Always check authentication before showing notes UI
2. Validate content length client-side (< 5000 chars)
3. Show loading states during API calls
4. Handle 403 errors gracefully (disable edit/delete after 30 min)
5. Poll for new notes if real-time not available (e.g., every 30 seconds)
6. Cache notes data to reduce API calls
7. Show "edited" indicator when note.updatedAt > note.createdAt

### Security
1. Never expose private notes to non-authors
2. Validate JWT on every request
3. Implement request timeouts (30 seconds recommended)
4. Sanitize user input to prevent XSS
5. Log all note modifications for audit trail

---

## Changelog

### v1.0 (2025-11-16)
- Initial release
- CRUD endpoints for session notes
- Export endpoint for PDF generation
- Private notes for counselors
- 30-minute edit/delete window
- 5000 character limit

---

## Support

For API issues or questions:
- GitHub Issues: [Repository URL]
- Email: support@mychristiancounselor.com
- Documentation: /docs/api/
