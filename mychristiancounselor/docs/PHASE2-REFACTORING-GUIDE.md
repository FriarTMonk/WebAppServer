# Phase 2: God Class Refactoring Guide

## Status: ✅ In Progress (2/4 Services Extracted)

This document provides a comprehensive guide for refactoring the CounselService "god class" (705 lines) into focused, testable services following the Single Responsibility Principle.

## Completed Extractions

### ✅ 1. ScriptureEnrichmentService

**File**: `packages/api/src/counsel/scripture-enrichment.service.ts`

**Responsibilities**:
- Retrieve scriptures based on theological themes
- Support single translation and comparison mode
- Extract scripture references from AI responses
- Enrich responses with related verses for context
- Tag verses with source ('ai-cited', 'related', 'theme')

**Methods**:
- `retrieveScripturesByThemes()` - Get relevant scriptures for themes
- `enrichResponseWithScriptures()` - Extract and enrich AI-cited verses
- Private: `fetchExtractedReferencesWithRelated()` - Fetch and tag verses

**Dependencies**: `ScriptureService`, `AiService`

**Lines Extracted**: ~150 lines from CounselService

---

###✅ 2. SessionService

**File**: `packages/api/src/counsel/session.service.ts`

**Responsibilities**:
- Manage counseling sessions (CRUD operations)
- Handle subscription-aware session persistence
- Create temporary sessions for free users
- Manage translation preferences
- Persist messages (subscription-gated)

**Methods**:
- `getSession()` - Retrieve session with messages
- `getOrCreateSession()` - Get or create with subscription logic
- `createUserMessage()` - Store user messages
- `createAssistantMessage()` - Store assistant messages
- `countClarifyingQuestions()` - Count clarifying questions

**Dependencies**: `PrismaService`, `TranslationService`

**Lines Extracted**: ~190 lines from CounselService

---

### ✅ 3. Integration Complete

**Date**: December 2025

**Changes Made**:
- Updated CounselService constructor to inject ScriptureEnrichmentService and SessionService
- Refactored processQuestion method to delegate to extracted services:
  - Session management → `sessionService.getOrCreateSession()`
  - User message creation → `sessionService.createUserMessage()`
  - Clarification counting → `sessionService.countClarifyingQuestions()`
  - Scripture retrieval → `scriptureEnrichment.retrieveScripturesByThemes()`
  - Scripture enrichment → `scriptureEnrichment.enrichResponseWithScriptures()`
  - Assistant message creation → `sessionService.createAssistantMessage()`
- Updated getSession method to delegate to SessionService

**Results**:
- **Before Integration**: 705 lines
- **After Integration**: 582 lines
- **Reduction**: 123 lines (17.4% decrease)
- **Complexity**: Significantly reduced cyclomatic complexity in processQuestion method
- **Status**: ✅ Compiles successfully, server running without errors

---

## Remaining Extractions

### 🔲 3. NoteService (High Priority)

**Estimated Size**: ~350 lines

**Responsibilities**:
- Note CRUD operations (create, read, update, delete)
- Complex access control logic (6 different scenarios)
- Role determination (owner, counselor, coverage counselor, viewer)
- Privacy filtering
- Notification orchestration

**Methods to Implement**:
```typescript
// Public methods
async createNote(sessionId, authorId, organizationId, createNoteDto)
async getNotesForSession(sessionId, requestingUserId, organizationId)
async updateNote(noteId, requestingUserId, organizationId, updateNoteDto)
async deleteNote(noteId, requestingUserId)

// Private helpers
private async validateNoteCreationAccess(session, authorId)
private async determineAuthorRole(authorId, memberId, organizationId, isPrivate)
private async filterNotesByPermission(notes, requestingUserId, sessionOwnerId, organizationId)
private async sendNoteAddedNotifications(sessionId, authorId, authorName, isPrivate, session, organizationId)
```

**Dependencies**: `PrismaService`, `SubscriptionService`, `EmailService`

**Source Lines in CounselService**:
- `createNote`: lines 288-423
- `sendNoteAddedNotifications`: lines 432-510 (private)
- `getNotesForSession`: lines 512-625
- `updateNote`: lines 627-679
- `deleteNote`: lines 681-704

**Access Control Scenarios**:
1. **Session Owner** - Requires subscription to create notes
2. **Assigned Counselor** - Full access to all notes
3. **Coverage Counselor** - Cannot create private notes
4. **Share with Write Access** - Can create notes via share link
5. **Share Read-Only** - Can view non-private notes
6. **Subscription Check** - Fallback for non-owners without shares

**Privacy Rules**:
- Private notes visible to: Owner, Assigned Counselor only
- Non-private notes visible to: Owner, All Counselors, Share recipients
- Coverage counselors cannot create private notes

---

### 🔲 4. CounselProcessingService (Medium Priority)

**Estimated Size**: ~250 lines

**Responsibilities**:
- Main counseling workflow orchestration
- Crisis and grief detection
- Theme extraction
- AI response generation
- Conversation history management

**Methods to Implement**:
```typescript
async processQuestion(
  message,
  sessionId?,
  preferredTranslation?,
  comparisonMode?,
  comparisonTranslations?,
  userId?
): Promise<CounselResponse>
```

**Dependencies**:
- `AiService`
- `SafetyService`
- `SubscriptionService`
- `SessionService` (new)
- `ScriptureEnrichmentService` (new)

**Flow**:
1. Crisis detection (early return if crisis detected)
2. Grief detection (flag but continue)
3. Get or create session (via SessionService)
4. Extract theological themes (via AiService)
5. Store user message (via SessionService)
6. Count clarifying questions (via SessionService)
7. Retrieve scriptures (via ScriptureEnrichmentService)
8. Build conversation history
9. Generate AI response (via AiService)
10. Enrich with scripture references (via ScriptureEnrichmentService)
11. Store assistant message (via SessionService)
12. Return response with metadata

---

## Integration Plan

### Step 1: Update CounselService Constructor

```typescript
import { ScriptureEnrichmentService } from './scripture-enrichment.service';
import { SessionService } from './session.service';
// Future: import { NoteService } from './note.service';

@Injectable()
export class CounselService {
  private readonly logger = new Logger(CounselService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private scriptureService: ScriptureService,  // Still needed for now
    private safetyService: SafetyService,
    private subscriptionService: SubscriptionService,
    private translationService: TranslationService,  // Still needed for now
    private emailService: EmailService,
    // New services
    private scriptureEnrichment: ScriptureEnrichmentService,
    private sessionService: SessionService,
    // Future: private noteService: NoteService,
  ) {}
}
```

### Step 2: Refactor processQuestion Method

Replace inline scripture enrichment code (lines 148-224) with:

```typescript
// 6. Retrieve relevant scriptures with themes
const scriptures = await this.scriptureEnrichment.retrieveScripturesByThemes(
  themes,
  session.preferredTranslation,
  comparisonMode,
  comparisonTranslations,
  3
);

// ... AI response generation ...

// 10. Extract and enrich scripture references
const finalScriptures = await this.scriptureEnrichment.enrichResponseWithScriptures(
  aiResponse.content,
  session.preferredTranslation,
  scriptures
);
```

Replace session management code (lines 73-127) with:

```typescript
// 3. Get or create session
const session = await this.sessionService.getOrCreateSession(
  sessionId,
  userId,
  canSaveSession,
  message,
  themes,
  preferredTranslation
);

// 4. Store user message
await this.sessionService.createUserMessage(session.id, message, canSaveSession);

// 5. Count clarifying questions
const clarificationCount = this.sessionService.countClarifyingQuestions(session);
```

Replace message persistence (lines 226-251) with:

```typescript
// 11. Store assistant message
const assistantMessage = await this.sessionService.createAssistantMessage(
  session.id,
  aiResponse.content,
  finalScriptures,
  aiResponse.requiresClarification,
  canSaveSession
);
```

### Step 3: Extract NoteService (Future)

Once NoteService is implemented, replace all note methods:

```typescript
// In CounselService, delegate to NoteService
async createNote(sessionId, authorId, organizationId, createNoteDto) {
  return this.noteService.createNote(sessionId, authorId, organizationId, createNoteDto);
}

async getNotesForSession(sessionId, requestingUserId, organizationId) {
  return this.noteService.getNotesForSession(sessionId, requestingUserId, organizationId);
}

async updateNote(noteId, requestingUserId, organizationId, updateNoteDto) {
  return this.noteService.updateNote(noteId, requestingUserId, organizationId, updateNoteDto);
}

async deleteNote(noteId, requestingUserId) {
  return this.noteService.deleteNote(noteId, requestingUserId);
}
```

---

## Testing Strategy

### Unit Tests for Extracted Services

**ScriptureEnrichmentService Tests**:
```typescript
describe('ScriptureEnrichmentService', () => {
  it('should retrieve scriptures by themes', async () => {
    // Test single translation mode
    // Test comparison mode with multiple translations
  });

  it('should enrich response with AI-cited verses', async () => {
    // Test reference extraction
    // Test related verse fetching
    // Test source tagging (ai-cited, related, theme)
  });

  it('should fall back to theme-based scriptures', async () => {
    // Test fallback when no references extracted
    // Test fallback when all extractions fail
  });
});
```

**SessionService Tests**:
```typescript
describe('SessionService', () => {
  it('should create persistent session for subscribed users', async () => {
    // Test session creation with userId
    // Test session with subscription
  });

  it('should create temporary session for free users', async () => {
    // Test temporary session object creation
    // Test without userId
  });

  it('should update translation preference', async () => {
    // Test translation update
    // Test validation
  });

  it('should persist messages for subscribed users only', async () => {
    // Test message creation with subscription
    // Test skip without subscription
  });

  it('should count clarifying questions correctly', async () => {
    // Test counting logic
    // Test filtering by isClarifyingQuestion
  });
});
```

**NoteService Tests** (Future):
```typescript
describe('NoteService', () => {
  describe('createNote', () => {
    it('should allow session owner to create notes with subscription', async () => {});
    it('should allow assigned counselor to create notes', async () => {});
    it('should allow coverage counselor to create non-private notes', async () => {});
    it('should block coverage counselor from creating private notes', async () => {});
    it('should allow note creation via share with write access', async () => {});
    it('should block note creation without subscription or access', async () => {});
  });

  describe('getNotesForSession', () => {
    it('should show all notes to session owner', async () => {});
    it('should show private notes to assigned counselor', async () => {});
    it('should hide private notes from coverage counselor', async () => {});
    it('should show only non-private notes to shared users', async () => {});
  });

  describe('updateNote', () => {
    it('should allow note author to update their notes', async () => {});
    it('should allow counselor to update any notes in their sessions', async () => {});
    it('should block non-counselors from updating others notes', async () => {});
  });

  describe('deleteNote', () => {
    it('should allow note author to delete their notes', async () => {});
    it('should block non-authors from deleting notes', async () => {});
  });

  describe('notifications', () => {
    it('should notify owner when others add notes', async () => {});
    it('should notify counselors when owner adds notes', async () => {});
    it('should notify shared users of non-private notes', async () => {});
    it('should not notify for private notes to non-counselors', async () => {});
  });
});
```

---

## Benefits of This Refactoring

### Before Refactoring
- **CounselService**: 705 lines, 6 public methods, 1 private method
- **Responsibilities**: 7+ distinct concerns mixed together
- **Testability**: Difficult - 7 service dependencies mocked together
- **Maintainability**: Low - changes to notes affect session logic
- **Cyclomatic Complexity**: Very High in `processQuestion` and `createNote`

### After Refactoring
- **CounselService**: ~100 lines (facade/orchestrator)
- **ScriptureEnrichmentService**: ~140 lines (focused)
- **SessionService**: ~190 lines (focused)
- **NoteService**: ~350 lines (focused) [Future]
- **CounselProcessingService**: ~250 lines (focused) [Future]

### Metrics Improvement

| Metric | Before | After |
|---|---|---|
| **Lines per file** | 705 | 100-350 |
| **Responsibilities** | 7+ | 1 per service |
| **Test complexity** | Very High | Low-Medium |
| **Reason to change** | 7+ reasons | 1 per service |
| **Service dependencies** | 7 in one class | 2-4 per service |
| **Cyclomatic complexity** | Very High | Low-Medium |

---

## Risk Mitigation

### Regression Prevention
1. **Integration Tests**: Write integration tests before refactoring to catch regressions
2. **Incremental Changes**: Refactor one method at a time with immediate testing
3. **Feature Flags**: Use feature flags to toggle between old and new implementations
4. **Parallel Testing**: Run both implementations in production with metrics comparison

### Common Pitfalls
1. **Breaking Prisma Relations**: Ensure all `include` clauses are preserved
2. **Subscription Logic**: Don't lose subscription checks during extraction
3. **Transaction Boundaries**: Maintain proper transaction scoping
4. **Error Handling**: Preserve error types and messages for API consumers

---

## Next Steps

1. ✅ **Complete** - Extract ScriptureEnrichmentService
2. ✅ **Complete** - Extract SessionService
3. ✅ **Complete** - Update CounselModule with new services
4. ✅ **Complete** - Update CounselService to inject and use new services
5. 🔲 **Todo** - Write unit tests for ScriptureEnrichmentService
6. 🔲 **Todo** - Write unit tests for SessionService
7. 🔲 **Todo** - Extract NoteService with access control logic
8. 🔲 **Todo** - Write unit tests for NoteService
9. 🔲 **Todo** - Extract CounselProcessingService (optional)
10. 🔲 **Todo** - Run full integration test suite
11. 🔲 **Todo** - Deploy behind feature flag

---

## File Structure

```
packages/api/src/counsel/
├── counsel.service.ts                    # Facade (target: ~100 lines)
├── counsel-processing.service.ts         # Future
├── scripture-enrichment.service.ts       # ✅ Created
├── session.service.ts                    # ✅ Created
├── note.service.ts                       # Future
├── assignment.service.ts                 # Existing
├── observation.service.ts                # Existing
├── wellbeing-analysis.service.ts         # Existing
├── counsel-export.service.ts             # Existing
├── counsel.controller.ts                 # Existing
├── counsel.module.ts                     # ✅ Updated
├── dto/
│   ├── create-note.dto.ts               # Existing
│   ├── update-note.dto.ts               # Existing
│   └── ...
└── spec/
    ├── scripture-enrichment.service.spec.ts  # Todo
    ├── session.service.spec.ts              # Todo
    ├── note.service.spec.ts                 # Future
    └── ...
```

---

## Conclusion

This phased refactoring approach allows incremental improvement while maintaining production stability. The two services extracted so far (ScriptureEnrichmentService and SessionService) demonstrate the pattern and provide immediate benefits:

- **Clearer separation of concerns**
- **Easier to test in isolation**
- **Reduced complexity in CounselService**
- **Foundation for complete refactoring**

The team can continue this pattern to complete the extraction of NoteService and optionally CounselProcessingService, ultimately transforming the 705-line god class into a set of focused, testable services.
