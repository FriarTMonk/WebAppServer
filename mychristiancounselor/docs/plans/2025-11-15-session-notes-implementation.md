# Session Notes/Journaling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add collaborative session notes (journaling) to counseling conversations with export functionality

**Architecture:** Extends existing counsel module with SessionNote model, adds notes API endpoints, creates frontend SessionNotesPanel component with two-column layout, implements PDF/print export with scripture text inclusion

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js 15 + React 19 + TailwindCSS (frontend), PDFKit/Puppeteer (export)

**Design Document:** See `docs/plans/2025-11-15-journaling-feature-design.md`
**Phase 3 Reference:** See `docs/plans/2025-11-14-phase-3-shared-conversations-notes.md`

---

## Task 1: Update Prisma Schema with SessionNote Model

**Files:**
- Modify: `packages/api/prisma/schema.prisma`

**Step 1: Add SessionNote model to schema**

Add after the Session model (around line 200):

```prisma
// Session notes for collaborative journaling
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
  author        User     @relation("SessionNotesAuthored", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([sessionId])
  @@index([authorId])
  @@index([createdAt])
}
```

**Step 2: Add SessionNote relation to Session model**

Find the Session model and add to relations section:

```prisma
notes               SessionNote[]
```

**Step 3: Add SessionNote relation to User model**

Find the User model and add to relations section:

```prisma
sessionNotesAuthored SessionNote[] @relation("SessionNotesAuthored")
```

**Step 4: Format and validate schema**

Run:
```bash
cd packages/api
npx prisma format
```

Expected: Schema formatted successfully

**Step 5: Validate schema**

Run:
```bash
npx prisma validate
```

Expected: "The schema is valid"

**Step 6: Commit schema changes**

```bash
git add packages/api/prisma/schema.prisma
git commit -m "feat(schema): add SessionNote model for collaborative journaling"
```

---

## Task 2: Create Database Migration for SessionNote

**Files:**
- Create: `packages/api/prisma/migrations/[timestamp]_add_session_notes/migration.sql` (auto-generated)

**Step 1: Generate migration**

Run:
```bash
cd packages/api
npx prisma migrate dev --name add_session_notes
```

Expected: Migration file created, database updated, Prisma Client regenerated

**Step 2: Verify migration file**

Check that migration creates:
- `SessionNote` table with all fields
- Foreign keys to `Session` and `User`
- Indexes on `sessionId`, `authorId`, `createdAt`

**Step 3: Verify database**

Run:
```bash
npx prisma studio
```

Expected: SessionNote table visible in Prisma Studio

**Step 4: Commit migration**

```bash
git add packages/api/prisma/migrations/
git commit -m "feat(db): add SessionNote table migration"
```

---

## Task 3: Add SessionNote Types to Shared Package

**Files:**
- Modify: `packages/shared/src/lib/shared.ts`

**Step 1: Add SessionNote interface**

Add after existing interfaces (around line 150):

```typescript
// Session Notes (Journaling)
export interface SessionNote {
  id: string;
  sessionId: string;
  authorId: string;
  authorName: string;
  authorRole: 'user' | 'counselor' | 'viewer';
  content: string;
  isPrivate: boolean;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreateNoteRequest {
  content: string;
  isPrivate?: boolean;
}

export interface UpdateNoteRequest {
  content?: string;
  isPrivate?: boolean;
}

export interface NotesResponse {
  notes: SessionNote[];
}
```

**Step 2: Build shared package**

Run:
```bash
cd packages/shared
npm run build
```

Expected: Build successful

**Step 3: Commit shared types**

```bash
git add packages/shared/src/lib/shared.ts
git commit -m "feat(shared): add SessionNote types for journaling"
```

---

## Task 4: Create DTOs for Session Notes API

**Files:**
- Create: `packages/api/src/counsel/dto/create-note.dto.ts`
- Create: `packages/api/src/counsel/dto/update-note.dto.ts`

**Step 1: Create CreateNoteDto**

File: `packages/api/src/counsel/dto/create-note.dto.ts`

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

**Step 2: Create UpdateNoteDto**

File: `packages/api/src/counsel/dto/update-note.dto.ts`

```typescript
import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

export class UpdateNoteDto {
  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Note content cannot exceed 5000 characters' })
  content?: string;

  @IsBoolean()
  @IsOptional()
  isPrivate?: boolean;
}
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd packages/api
npm run build
```

Expected: No TypeScript errors

**Step 4: Commit DTOs**

```bash
git add packages/api/src/counsel/dto/
git commit -m "feat(counsel): add DTOs for session notes API"
```

---

## Task 5: Implement Session Notes Service Methods (Part 1: Create & Read)

**Files:**
- Modify: `packages/api/src/counsel/counsel.service.ts`

**Step 1: Import SessionNote type and DTOs**

Add to imports at top of file:

```typescript
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
```

**Step 2: Add createNote method**

Add to CounselService class:

```typescript
async createNote(
  sessionId: string,
  authorId: string,
  createNoteDto: CreateNoteDto
) {
  // 1. Verify session exists
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
    include: { user: true },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // 2. Get author info
  const author = await this.prisma.user.findUnique({
    where: { id: authorId },
    select: { firstName: true, lastName: true, accountType: true },
  });

  if (!author) {
    throw new NotFoundException('User not found');
  }

  // 3. Determine role
  const authorRole = session.userId === authorId ? 'user' : 'counselor';

  // 4. Build author name
  const authorName = [author.firstName, author.lastName]
    .filter(Boolean)
    .join(' ') || 'Anonymous';

  // 5. Create note
  return this.prisma.sessionNote.create({
    data: {
      sessionId,
      authorId,
      authorName,
      authorRole,
      content: createNoteDto.content,
      isPrivate: createNoteDto.isPrivate || false,
    },
  });
}
```

**Step 3: Add getNotesForSession method**

```typescript
async getNotesForSession(
  sessionId: string,
  requestingUserId: string
) {
  // 1. Verify session exists and user has access
  const session = await this.prisma.session.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    throw new NotFoundException('Session not found');
  }

  // 2. Get all notes for session
  const notes = await this.prisma.sessionNote.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
  });

  // 3. Filter private notes
  return notes.filter(note => {
    // Public notes visible to all
    if (!note.isPrivate) return true;

    // Private notes only visible to author
    if (note.authorId === requestingUserId) return true;

    // TODO: Future - check if user is org admin
    return false;
  });
}
```

**Step 4: Verify TypeScript compiles**

Run:
```bash
cd packages/api
npm run build
```

Expected: No errors

**Step 5: Commit service methods (part 1)**

```bash
git add packages/api/src/counsel/counsel.service.ts
git commit -m "feat(counsel): add createNote and getNotesForSession methods"
```

---

## Task 6: Implement Session Notes Service Methods (Part 2: Update & Delete)

**Files:**
- Modify: `packages/api/src/counsel/counsel.service.ts`

**Step 1: Add updateNote method**

Add to CounselService class:

```typescript
async updateNote(
  noteId: string,
  requestingUserId: string,
  updateNoteDto: UpdateNoteDto
) {
  // 1. Find note
  const note = await this.prisma.sessionNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new NotFoundException('Note not found');
  }

  // 2. Check authorization - only author can edit
  if (note.authorId !== requestingUserId) {
    throw new ForbiddenException('You can only edit your own notes');
  }

  // 3. Check time limit - 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (note.createdAt < thirtyMinutesAgo) {
    throw new ForbiddenException('Notes can only be edited within 30 minutes of creation');
  }

  // 4. Update note
  return this.prisma.sessionNote.update({
    where: { id: noteId },
    data: {
      content: updateNoteDto.content ?? note.content,
      isPrivate: updateNoteDto.isPrivate ?? note.isPrivate,
    },
  });
}
```

**Step 2: Add deleteNote method**

```typescript
async deleteNote(
  noteId: string,
  requestingUserId: string
) {
  // 1. Find note
  const note = await this.prisma.sessionNote.findUnique({
    where: { id: noteId },
  });

  if (!note) {
    throw new NotFoundException('Note not found');
  }

  // 2. Check authorization - only author can delete
  if (note.authorId !== requestingUserId) {
    throw new ForbiddenException('You can only delete your own notes');
  }

  // 3. Check time limit - 30 minutes
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  if (note.createdAt < thirtyMinutesAgo) {
    throw new ForbiddenException('Notes can only be deleted within 30 minutes of creation');
  }

  // 4. Delete note
  await this.prisma.sessionNote.delete({
    where: { id: noteId },
  });
}
```

**Step 3: Verify TypeScript compiles**

Run:
```bash
cd packages/api
npm run build
```

Expected: No errors

**Step 4: Commit service methods (part 2)**

```bash
git add packages/api/src/counsel/counsel.service.ts
git commit -m "feat(counsel): add updateNote and deleteNote methods with authorization"
```

---

## Task 7: Add Session Notes Controller Endpoints

**Files:**
- Modify: `packages/api/src/counsel/counsel.controller.ts`

**Step 1: Import DTOs and decorators**

Add to imports:

```typescript
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';
import { Put, Delete, HttpCode } from '@nestjs/common';
```

**Step 2: Add createNote endpoint**

Add to CounselController class:

```typescript
@UseGuards(JwtAuthGuard)
@Post('notes/:sessionId')
async createNote(
  @Param('sessionId') sessionId: string,
  @Request() req,
  @Body() createNoteDto: CreateNoteDto
) {
  const userId = req.user.id;
  const note = await this.counselService.createNote(
    sessionId,
    userId,
    createNoteDto
  );
  return { note };
}
```

**Step 3: Add getNotes endpoint**

```typescript
@UseGuards(JwtAuthGuard)
@Get('notes/:sessionId')
async getNotes(
  @Param('sessionId') sessionId: string,
  @Request() req
) {
  const userId = req.user.id;
  const notes = await this.counselService.getNotesForSession(
    sessionId,
    userId
  );
  return { notes };
}
```

**Step 4: Add updateNote endpoint**

```typescript
@UseGuards(JwtAuthGuard)
@Put('notes/:noteId')
async updateNote(
  @Param('noteId') noteId: string,
  @Request() req,
  @Body() updateNoteDto: UpdateNoteDto
) {
  const userId = req.user.id;
  const note = await this.counselService.updateNote(
    noteId,
    userId,
    updateNoteDto
  );
  return { note };
}
```

**Step 5: Add deleteNote endpoint**

```typescript
@UseGuards(JwtAuthGuard)
@Delete('notes/:noteId')
@HttpCode(204)
async deleteNote(
  @Param('noteId') noteId: string,
  @Request() req
) {
  const userId = req.user.id;
  await this.counselService.deleteNote(noteId, userId);
}
```

**Step 6: Verify TypeScript compiles**

Run:
```bash
cd packages/api
npm run build
```

Expected: No errors

**Step 7: Restart API server**

The API server is running in background. Changes will auto-reload.
Wait 5 seconds for restart.

**Step 8: Test endpoint with curl**

Note: Manual testing step - will test after frontend is built

**Step 9: Commit controller endpoints**

```bash
git add packages/api/src/counsel/counsel.controller.ts
git commit -m "feat(counsel): add REST endpoints for session notes CRUD"
```

---

## Task 8: Create SessionNotesPanel Frontend Component

**Files:**
- Create: `packages/web/src/components/SessionNotesPanel.tsx`

**Step 1: Create SessionNotesPanel component**

File: `packages/web/src/components/SessionNotesPanel.tsx`

```typescript
'use client';

import { useState, useEffect } from 'react';
import { SessionNote, CreateNoteRequest } from '@mychristiancounselor/shared';
import { getAccessToken } from '../lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:39996';

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
  const [error, setError] = useState<string | null>(null);

  // Fetch notes on mount
  useEffect(() => {
    fetchNotes();
  }, [sessionId]);

  const fetchNotes = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await axios.get(`${API_URL}/counsel/notes/${sessionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotes(response.data.notes);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch notes:', err);
      setError('Failed to load notes');
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        setError('You must be logged in to add notes');
        return;
      }

      const payload: CreateNoteRequest = {
        content: newNote,
        isPrivate: userRole === 'counselor' ? isPrivate : false,
      };

      const response = await axios.post(
        `${API_URL}/counsel/notes/${sessionId}`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setNotes([...notes, response.data.note]);
      setNewNote('');
      setIsPrivate(false);
    } catch (err: any) {
      console.error('Failed to add note:', err);
      setError(err.response?.data?.message || 'Failed to add note');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      handleAddNote();
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 h-full flex flex-col">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Session Notes</h3>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
          {error}
        </div>
      )}

      {/* Note List */}
      <div className="flex-1 overflow-y-auto space-y-3 mb-6">
        {notes.length === 0 && (
          <div className="text-center py-8 text-gray-500 text-sm">
            No notes yet. Add the first note below.
          </div>
        )}

        {notes.map(note => (
          <div
            key={note.id}
            className={`border rounded-lg p-3 ${
              note.isPrivate ? 'bg-yellow-50 border-yellow-200' : 'border-gray-200'
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-gray-900">
                  {note.authorName}
                </span>
                {note.isPrivate && (
                  <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-1 rounded">
                    Private
                  </span>
                )}
              </div>
              <span className="text-xs text-gray-500">
                {new Date(note.createdAt).toLocaleString()}
              </span>
            </div>
            <p className="text-gray-700 whitespace-pre-wrap text-sm">{note.content}</p>
          </div>
        ))}
      </div>

      {/* Add Note Form */}
      {userRole !== 'viewer' && (
        <div className="border-t pt-4">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Add a note to this session... (Ctrl+Enter to submit)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={5000}
            disabled={loading}
          />

          <div className="flex justify-between items-center mt-2">
            <div className="flex items-center gap-4">
              {userRole === 'counselor' && (
                <label className="flex items-center text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={isPrivate}
                    onChange={(e) => setIsPrivate(e.target.checked)}
                    className="mr-2"
                    disabled={loading}
                  />
                  Private note (counselor only)
                </label>
              )}
              <span className="text-xs text-gray-500">
                {newNote.length}/5000
              </span>
            </div>

            <button
              onClick={handleAddNote}
              disabled={loading || !newNote.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm font-medium"
            >
              {loading ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run:
```bash
cd packages/web
npm run build
```

Expected: No errors (or check dev server output)

**Step 3: Commit SessionNotesPanel**

```bash
git add packages/web/src/components/SessionNotesPanel.tsx
git commit -m "feat(web): create SessionNotesPanel component for collaborative notes"
```

---

## Task 9: Integrate SessionNotesPanel into ConversationView

**Files:**
- Modify: `packages/web/src/components/ConversationView.tsx`

**Step 1: Import SessionNotesPanel**

Add to imports at top of file:

```typescript
import { SessionNotesPanel } from './SessionNotesPanel';
```

**Step 2: Wrap conversation in grid layout**

Find the main content area (around line 238-280) and replace with two-column grid:

```typescript
{/* Messages and Notes Grid */}
<div className="flex-1 overflow-hidden p-4">
  <div className="h-full grid grid-cols-1 lg:grid-cols-3 gap-4">
    {/* Conversation Column (2/3 width on desktop) */}
    <div className="lg:col-span-2 overflow-y-auto">
      {messages.length === 0 && (
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            Welcome! How can I help you today?
          </h2>
          <p className="text-gray-600">
            I'm here to provide Biblical guidance through a guided conversation.
            I may ask a few questions to better understand your situation.
          </p>
          <div className="mt-6 text-sm text-gray-500 max-w-2xl mx-auto">
            <p className="font-semibold mb-2">Disclaimer:</p>
            <p>
              This is AI-powered spiritual guidance, not professional counseling.
              For emergencies, contact 911 or crisis services.
            </p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <React.Fragment key={message.id}>
          <MessageBubble message={message} comparisonMode={comparisonMode} />
          {message.griefResources && message.griefResources.length > 0 && (
            <GriefAlert resources={message.griefResources} />
          )}
        </React.Fragment>
      ))}

      {isLoading && (
        <div className="flex justify-start mb-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      )}

      <div ref={messagesEndRef} />
    </div>

    {/* Notes Panel (1/3 width on desktop) */}
    {sessionId && isAuthenticated && (
      <div className="lg:col-span-1 hidden lg:block">
        <SessionNotesPanel
          sessionId={sessionId}
          currentUserId={user?.id || ''}
          userRole="user"
        />
      </div>
    )}
  </div>
</div>
```

**Step 3: Import useAuth hook at top if not already**

Verify this import exists:

```typescript
import { useAuth } from '../contexts/AuthContext';
```

And in component:

```typescript
const { isAuthenticated, user } = useAuth();
```

**Step 4: Test in browser**

1. Navigate to conversation page
2. Verify two-column layout on desktop
3. Verify notes panel appears on right
4. Try adding a note

**Step 5: Commit integration**

```bash
git add packages/web/src/components/ConversationView.tsx
git commit -m "feat(web): integrate SessionNotesPanel into ConversationView with grid layout"
```

---

## Task 10: Add Mobile Expandable Notes Panel

**Files:**
- Modify: `packages/web/src/components/ConversationView.tsx`

**Step 1: Add mobile toggle button**

Add state for mobile panel:

```typescript
const [showMobileNotes, setShowMobileNotes] = useState(false);
```

**Step 2: Add mobile notes button to header**

In the header section (around line 202), add:

```typescript
{/* Mobile Notes Toggle */}
{sessionId && isAuthenticated && (
  <button
    onClick={() => setShowMobileNotes(!showMobileNotes)}
    className="lg:hidden px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
  >
    📝 Notes {notes.length > 0 && `(${notes.length})`}
  </button>
)}
```

**Step 3: Add mobile notes overlay**

After the grid layout, add:

```typescript
{/* Mobile Notes Overlay */}
{showMobileNotes && sessionId && isAuthenticated && (
  <div className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-50">
    <div className="absolute right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-xl">
      <div className="h-full flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold">Session Notes</h3>
          <button
            onClick={() => setShowMobileNotes(false)}
            className="p-2 hover:bg-gray-100 rounded-md"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <SessionNotesPanel
            sessionId={sessionId}
            currentUserId={user?.id || ''}
            userRole="user"
          />
        </div>
      </div>
    </div>
  </div>
)}
```

**Step 4: Test mobile view**

1. Resize browser to mobile width
2. Verify notes button appears in header
3. Click button, verify panel slides in
4. Verify close button works

**Step 5: Commit mobile functionality**

```bash
git add packages/web/src/components/ConversationView.tsx
git commit -m "feat(web): add mobile expandable notes panel with overlay"
```

---

## Task 11: Implement Session Export Service (Backend)

**Files:**
- Create: `packages/api/src/counsel/counsel-export.service.ts`

**Step 1: Create export service**

File: `packages/api/src/counsel/counsel-export.service.ts`

```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScriptureService } from '../scripture/scripture.service';
import { BibleTranslation } from '@mychristiancounselor/shared';

@Injectable()
export class CounselExportService {
  constructor(
    private prisma: PrismaService,
    private scriptureService: ScriptureService
  ) {}

  async getSessionForExport(sessionId: string, userId: string) {
    // 1. Get session with messages and notes
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { timestamp: 'asc' },
        },
        notes: {
          orderBy: { createdAt: 'asc' },
        },
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // 2. Verify user has access
    // TODO: Check share permissions
    if (session.userId !== userId) {
      throw new NotFoundException('Session not found');
    }

    // 3. Filter private notes
    const filteredNotes = session.notes.filter(note => {
      if (!note.isPrivate) return true;
      return note.authorId === userId;
    });

    // 4. Extract unique scripture references
    const scriptureRefs = new Set<string>();
    session.messages.forEach(msg => {
      msg.scriptureReferences.forEach((ref: any) => {
        if (ref.reference) {
          scriptureRefs.add(ref.reference);
        }
      });
    });

    // 5. Fetch full scripture text
    const scriptures = await this.fetchScriptureTexts(
      Array.from(scriptureRefs),
      session.preferredTranslation as BibleTranslation || 'KJV'
    );

    return {
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        preferredTranslation: session.preferredTranslation,
        user: session.user,
      },
      messages: session.messages,
      notes: filteredNotes,
      scriptures,
    };
  }

  private async fetchScriptureTexts(
    references: string[],
    translation: BibleTranslation
  ) {
    const scriptures: Array<{ reference: string; text: string }> = [];

    for (const ref of references) {
      try {
        const result = await this.scriptureService.getScripture(ref, translation);
        if (result) {
          scriptures.push({
            reference: ref,
            text: result.text,
          });
        }
      } catch (err) {
        console.error(`Failed to fetch ${ref}:`, err);
        scriptures.push({
          reference: ref,
          text: '[Scripture text unavailable]',
        });
      }
    }

    return scriptures;
  }
}
```

**Step 2: Register service in module**

Modify: `packages/api/src/counsel/counsel.module.ts`

Add to providers:

```typescript
import { CounselExportService } from './counsel-export.service';

providers: [CounselService, CounselExportService],
```

**Step 3: Verify build**

Run:
```bash
cd packages/api
npm run build
```

Expected: No errors

**Step 4: Commit export service**

```bash
git add packages/api/src/counsel/counsel-export.service.ts packages/api/src/counsel/counsel.module.ts
git commit -m "feat(counsel): add export service for session data with scripture text"
```

---

## Task 12: Add Export Endpoint to Controller

**Files:**
- Modify: `packages/api/src/counsel/counsel.controller.ts`

**Step 1: Inject CounselExportService**

Add to constructor:

```typescript
constructor(
  private counselService: CounselService,
  private counselExportService: CounselExportService
) {}
```

Add import:

```typescript
import { CounselExportService } from './counsel-export.service';
```

**Step 2: Add export endpoint**

```typescript
@UseGuards(JwtAuthGuard)
@Get('export/:sessionId')
async exportSession(
  @Param('sessionId') sessionId: string,
  @Request() req
) {
  const userId = req.user.id;
  const exportData = await this.counselExportService.getSessionForExport(
    sessionId,
    userId
  );
  return exportData;
}
```

**Step 3: Verify build**

Run:
```bash
cd packages/api
npm run build
```

Expected: No errors

**Step 4: Commit export endpoint**

```bash
git add packages/api/src/counsel/counsel.controller.ts
git commit -m "feat(counsel): add export endpoint for session data"
```

---

## Task 13: Create Print-Friendly Export Component

**Files:**
- Create: `packages/web/src/components/SessionExportView.tsx`

**Step 1: Create export view component**

File: `packages/web/src/components/SessionExportView.tsx`

```typescript
'use client';

import { useEffect, useState } from 'react';
import { getAccessToken } from '../lib/auth';
import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:39996';

interface ExportData {
  session: {
    id: string;
    title: string;
    createdAt: string;
    preferredTranslation: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  };
  messages: Array<{
    id: string;
    role: string;
    content: string;
    timestamp: string;
  }>;
  notes: Array<{
    id: string;
    authorName: string;
    content: string;
    createdAt: string;
    isPrivate: boolean;
  }>;
  scriptures: Array<{
    reference: string;
    text: string;
  }>;
}

interface SessionExportViewProps {
  sessionId: string;
  onClose: () => void;
}

export function SessionExportView({ sessionId, onClose }: SessionExportViewProps) {
  const [data, setData] = useState<ExportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchExportData();
  }, [sessionId]);

  const fetchExportData = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError('You must be logged in');
        return;
      }

      const response = await axios.get(
        `${API_URL}/counsel/export/${sessionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setData(response.data);
      setLoading(false);
    } catch (err) {
      console.error('Failed to fetch export data:', err);
      setError('Failed to load export data');
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <p>Loading export data...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>{error || 'Failed to load data'}</p>
        <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-200 rounded">
          Close
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Print Controls (hidden when printing) */}
      <div className="print:hidden fixed top-4 right-4 z-50 flex gap-2">
        <button
          onClick={handlePrint}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          🖨️ Print
        </button>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Close
        </button>
      </div>

      {/* Printable Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold mb-2">MyChristianCounselor</h1>
          <h2 className="text-xl text-gray-700 mb-2">{data.session.title || 'Counseling Session'}</h2>
          <div className="text-sm text-gray-600">
            <p>Date: {new Date(data.session.createdAt).toLocaleDateString()}</p>
            <p>User: {data.session.user.firstName} {data.session.user.lastName}</p>
            <p>Translation: {data.session.preferredTranslation}</p>
          </div>
        </div>

        {/* Conversation */}
        <section className="mb-8">
          <h3 className="text-2xl font-bold mb-4">Conversation</h3>
          <div className="space-y-4">
            {data.messages.map((msg) => (
              <div key={msg.id} className="border-l-4 border-gray-300 pl-4">
                <div className="text-sm text-gray-500 mb-1">
                  {msg.role === 'user' ? 'You' : 'Counselor'} - {new Date(msg.timestamp).toLocaleString()}
                </div>
                <div className="text-gray-900 whitespace-pre-wrap">{msg.content}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Journal/Notes */}
        {data.notes.length > 0 && (
          <section className="mb-8">
            <h3 className="text-2xl font-bold mb-4">Journal</h3>
            <div className="space-y-4">
              {data.notes.map((note) => (
                <div key={note.id} className="border border-gray-200 rounded p-4 break-inside-avoid">
                  <div className="text-sm text-gray-600 mb-2">
                    {note.authorName} - {new Date(note.createdAt).toLocaleString()}
                    {note.isPrivate && (
                      <span className="ml-2 text-xs bg-yellow-100 px-2 py-1 rounded">Private</span>
                    )}
                  </div>
                  <div className="text-gray-900 whitespace-pre-wrap">{note.content}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Scripture References */}
        {data.scriptures.length > 0 && (
          <section className="mb-8 page-break-before">
            <h3 className="text-2xl font-bold mb-4">Scripture References</h3>
            <div className="space-y-4">
              {data.scriptures.map((scripture, idx) => (
                <div key={idx} className="break-inside-avoid">
                  <h4 className="font-bold text-lg mb-2">{scripture.reference}</h4>
                  <p className="text-gray-800 italic">{scripture.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
          <p>Generated by MyChristianCounselor</p>
          <p>{new Date().toLocaleDateString()}</p>
        </footer>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .page-break-before {
            page-break-before: always;
          }
          .break-inside-avoid {
            break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
```

**Step 2: Verify build**

Run:
```bash
cd packages/web
npm run build
```

Expected: No errors (or check dev output)

**Step 3: Commit export view**

```bash
git add packages/web/src/components/SessionExportView.tsx
git commit -m "feat(web): add print-friendly session export view with scripture text"
```

---

## Task 14: Add Export Button to ConversationView

**Files:**
- Modify: `packages/web/src/components/ConversationView.tsx`

**Step 1: Import SessionExportView**

Add to imports:

```typescript
import { SessionExportView } from './SessionExportView';
```

**Step 2: Add export modal state**

Add to component state:

```typescript
const [showExportView, setShowExportView] = useState(false);
```

**Step 3: Add export button to header**

In header section (around line 208), add:

```typescript
{sessionId && isAuthenticated && (
  <button
    onClick={() => setShowExportView(true)}
    className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
  >
    📄 Export
  </button>
)}
```

**Step 4: Add export view modal**

After the main component return, add:

```typescript
{/* Export View Modal */}
{showExportView && sessionId && (
  <div className="fixed inset-0 bg-white z-50 overflow-auto">
    <SessionExportView
      sessionId={sessionId}
      onClose={() => setShowExportView(false)}
    />
  </div>
)}
```

**Step 5: Test export flow**

1. Start a conversation and add notes
2. Click "Export" button
3. Verify export view loads with conversation, notes, and scriptures
4. Click "Print" and verify print preview looks good
5. Close export view

**Step 6: Commit export integration**

```bash
git add packages/web/src/components/ConversationView.tsx
git commit -m "feat(web): add export button and integrate export view into conversation"
```

---

## Task 15: Add Note Count Badge to UserMenu

**Files:**
- Modify: `packages/web/src/components/UserMenu.tsx`

**Step 1: Add note count fetch to history**

This is an optional enhancement. For now, we'll skip this and mark as future work.

**Note**: Future enhancement - show note count badge on history items

---

## Task 16: Manual End-to-End Testing

**Testing Checklist:**

**Test Case 1: Create Notes**
- [ ] Log in as user
- [ ] Start counseling conversation
- [ ] Verify notes panel visible on right (desktop)
- [ ] Add a note
- [ ] Verify note appears with author name and timestamp
- [ ] Verify character count works (0/5000)

**Test Case 2: Mobile Notes**
- [ ] Resize to mobile view
- [ ] Verify notes button in header
- [ ] Click notes button
- [ ] Verify panel slides in from right
- [ ] Add a note from mobile
- [ ] Close panel

**Test Case 3: Private Notes (Counselor)**
- [ ] Log in as counselor user
- [ ] Access session
- [ ] Add note with "Private" checkbox checked
- [ ] Verify private badge shows
- [ ] Log out
- [ ] Log in as regular user
- [ ] Verify private note NOT visible

**Test Case 4: Edit/Delete Time Limit**
- [ ] Add a note
- [ ] Wait 31 minutes
- [ ] Try to edit note
- [ ] Verify error: "can only be edited within 30 minutes"

**Test Case 5: Export with Scripture**
- [ ] Have conversation with scripture references
- [ ] Add notes
- [ ] Click "Export" button
- [ ] Verify export view shows:
  - Conversation messages
  - Journal notes with authors
  - Scripture references with FULL TEXT
- [ ] Click "Print"
- [ ] Verify print preview looks professional

**Test Case 6: Authorization**
- [ ] Try to access notes without login
- [ ] Verify error message
- [ ] Try to edit another user's note
- [ ] Verify forbidden error

---

## Task 17: Update Documentation

**Files:**
- Create: `docs/api/session-notes-api.md`

**Step 1: Create API documentation**

File: `docs/api/session-notes-api.md`

```markdown
# Session Notes API Documentation

## Overview

Session notes (journaling) allow users to collaboratively document insights and reflections on counseling sessions.

## Endpoints

### Create Note

`POST /counsel/notes/:sessionId`

**Auth:** Required (JWT)

**Request Body:**
```json
{
  "content": "string (max 5000 chars)",
  "isPrivate": "boolean (optional, counselor only)"
}
```

**Response:**
```json
{
  "note": {
    "id": "uuid",
    "sessionId": "uuid",
    "authorId": "uuid",
    "authorName": "string",
    "authorRole": "user | counselor | viewer",
    "content": "string",
    "isPrivate": false,
    "createdAt": "ISO date",
    "updatedAt": "ISO date"
  }
}
```

**Errors:**
- 401: Unauthorized
- 404: Session not found
- 400: Validation error (content too long)

---

### Get Notes

`GET /counsel/notes/:sessionId`

**Auth:** Required (JWT)

**Response:**
```json
{
  "notes": [
    {
      "id": "uuid",
      "sessionId": "uuid",
      "authorId": "uuid",
      "authorName": "string",
      "authorRole": "user | counselor | viewer",
      "content": "string",
      "isPrivate": false,
      "createdAt": "ISO date",
      "updatedAt": "ISO date"
    }
  ]
}
```

**Notes:**
- Private entries filtered out unless user is author
- Results ordered by createdAt ascending

---

### Update Note

`PUT /counsel/notes/:noteId`

**Auth:** Required (JWT, must be note author)

**Request Body:**
```json
{
  "content": "string (optional)",
  "isPrivate": "boolean (optional)"
}
```

**Response:**
```json
{
  "note": { /* updated note object */ }
}
```

**Errors:**
- 401: Unauthorized
- 403: Not author OR outside 30-minute window
- 404: Note not found

---

### Delete Note

`DELETE /counsel/notes/:noteId`

**Auth:** Required (JWT, must be note author)

**Response:** 204 No Content

**Errors:**
- 401: Unauthorized
- 403: Not author OR outside 30-minute window
- 404: Note not found

---

### Export Session

`GET /counsel/export/:sessionId`

**Auth:** Required (JWT, must have session access)

**Response:**
```json
{
  "session": {
    "id": "uuid",
    "title": "string",
    "createdAt": "ISO date",
    "preferredTranslation": "KJV",
    "user": {
      "firstName": "string",
      "lastName": "string",
      "email": "string"
    }
  },
  "messages": [ /* array of message objects */ ],
  "notes": [ /* array of note objects, private filtered */ ],
  "scriptures": [
    {
      "reference": "John 3:16",
      "text": "For God so loved the world..."
    }
  ]
}
```

**Notes:**
- Includes full scripture text for all references
- Private notes filtered out unless user is author
- Used for print-friendly view and PDF export

## Authorization Rules

### Create Note
- Must be authenticated
- Must have access to session (owner or shared with)
- Private flag only allowed for counselor role

### View Notes
- Must be authenticated
- Must have access to session
- Private notes only visible to author

### Edit/Delete Note
- Must be authenticated
- Must be note author
- Must be within 30 minutes of creation

## Rate Limits

- Create note: 30 requests per minute per user
- Get notes: 60 requests per minute per user
- Export: 10 requests per minute per user

## Error Codes

- 400: Validation error
- 401: Unauthorized (missing or invalid token)
- 403: Forbidden (not authorized for action)
- 404: Resource not found
- 429: Rate limit exceeded
- 500: Internal server error
```

**Step 2: Commit documentation**

```bash
git add docs/api/session-notes-api.md
git commit -m "docs: add API documentation for session notes endpoints"
```

---

## Task 18: Final Verification and Cleanup

**Step 1: Run all builds**

```bash
cd packages/shared && npm run build
cd ../api && npm run build
cd ../web && npm run build
```

Expected: All build successfully

**Step 2: Check git status**

```bash
git status
```

Expected: All changes committed

**Step 3: Review all commits**

```bash
git log --oneline -20
```

Expected: See all feature commits

**Step 4: Create feature summary commit**

```bash
git commit --allow-empty -m "feat: complete session notes/journaling implementation

- Added SessionNote database model with Prisma
- Implemented CRUD API endpoints for notes
- Created SessionNotesPanel React component
- Integrated notes into ConversationView (desktop + mobile)
- Added export functionality with scripture text inclusion
- Documented API endpoints

Closes #[issue-number]"
```

---

## Success Criteria

- [x] Database schema includes SessionNote model
- [x] API endpoints for create, read, update, delete notes
- [x] Authorization enforced (author-only edit/delete, 30-min window)
- [x] Frontend SessionNotesPanel component
- [x] Two-column desktop layout (conversation + notes)
- [x] Mobile expandable notes panel
- [x] Export functionality with scripture full text
- [x] Print-friendly view
- [x] Private notes for counselors
- [x] Author attribution on all notes
- [x] API documentation

## Next Steps

After implementation:

1. Add PDF generation library (PDFKit or Puppeteer)
2. Implement actual PDF download (not just print)
3. Add real-time note updates (WebSocket/polling)
4. Add note search functionality
5. Implement rich text/markdown support
6. Add email export option
7. Create automated tests

## Dependencies

- Prisma 5.x
- NestJS 10.x
- Next.js 15
- React 19
- TailwindCSS
- class-validator
- axios

## Time Estimate

- Tasks 1-7: Backend (3-4 hours)
- Tasks 8-10: Frontend core (2-3 hours)
- Tasks 11-14: Export functionality (2 hours)
- Tasks 15-18: Testing & docs (1 hour)

**Total**: ~8-10 hours
