# Phase 2: Remaining Refactoring Tasks

## Completed ✅

### CounselService Refactoring (100% Complete)
- **705 lines → 113 lines (84% reduction)**
- Extracted 4 specialized services
- Converted to pure Facade pattern
- All code compiling and running successfully

Services Created:
1. **ScriptureEnrichmentService** (140 lines) - Scripture operations
2. **SessionService** (190 lines) - Session management
3. **NoteService** (466 lines) - Note CRUD with access control
4. **CounselProcessingService** (194 lines) - Workflow orchestration

---

## Remaining Tasks 🔲

### 1. Split AiService (High Priority)

**Current State**: 752-line god class with mixed responsibilities

**Goal**: Split into two focused services
- **CounselingAiService** (~350 lines) - OpenAI-based counseling AI
- **SupportAiService** (~400 lines) - Anthropic Claude-based support ticket AI

**Why Split**:
- Already has clear separation markers in code (line 77 & 345)
- Uses different AI providers (OpenAI vs Anthropic)
- Serves different business domains (counseling vs support)
- Difficult to test as single service
- Violates Single Responsibility Principle

**CounselingAiService Methods** (OpenAI):
```typescript
- generateResponse() - Generate counseling responses with clarifying questions
- extractTheologicalThemes() - Extract theological themes from messages
- extractScriptureReferences() - Extract Bible references from text
- detectCrisisContextual() - AI-powered crisis detection
- detectGriefContextual() - AI-powered grief detection
```

**SupportAiService Methods** (Anthropic Claude):
```typescript
- detectPriority() - Detect support ticket priority levels
- batchSimilarityCheck() - Compare tickets for similarity using AI
- findSimilarActiveTickets() - Find similar open tickets
- processWeeklySimilarityBatch() - Weekly batch processing
- getCachedHistoricalMatches() - Retrieve cached similarity results
```

**Files to Update** (6 files import AiService):
1. `counsel-processing.service.ts` → Use CounselingAiService
2. `scripture-enrichment.service.ts` → Use CounselingAiService
3. `wellbeing-analysis.service.ts` → Use CounselingAiService
4. `support.service.ts` → Use SupportAiService
5. `ai.scheduler.ts` → Use SupportAiService
6. `ai.module.ts` → Export both services

**Estimated Effort**: 2-3 hours
- File creation: 30 min
- Module updates: 30 min
- Import updates: 30 min
- Testing: 1-2 hours

---

### 2. Extract PermissionService (Medium Priority)

**Current State**: Permission checking logic scattered across multiple services

**Goal**: Centralize all permission/authorization logic into PermissionService

**Permissions to Centralize**:

**Note Access Control** (from NoteService):
- Session owner permissions (subscription-gated)
- Assigned counselor permissions (full access)
- Coverage counselor permissions (limited access)
- Share-based permissions (read/write variations)
- Role determination logic

**Session Access Control** (potential locations):
- Session ownership verification
- Share access validation
- Counselor assignment checks
- Organization membership verification

**Subscription-Based Permissions** (potential locations):
- History access checks
- Note creation checks
- Export access checks
- Feature gating logic

**Methods to Implement**:
```typescript
class PermissionService {
  // Note permissions
  async canCreateNote(userId: string, sessionId: string, organizationId: string): Promise<boolean>
  async canViewNotes(userId: string, sessionId: string, organizationId: string): Promise<boolean>
  async canEditNote(userId: string, noteId: string): Promise<boolean>
  async canDeleteNote(userId: string, noteId: string): Promise<boolean>

  // Session permissions
  async canAccessSession(userId: string, sessionId: string): Promise<boolean>
  async canShareSession(userId: string, sessionId: string): Promise<boolean>

  // Role checks
  async isSessionOwner(userId: string, sessionId: string): Promise<boolean>
  async isAssignedCounselor(userId: string, memberId: string, organizationId: string): Promise<boolean>
  async isCoverageCounselor(userId: string, memberId: string): Promise<boolean>

  // Share access
  async hasShareAccess(userId: string, sessionId: string): Promise<{hasAccess: boolean, allowNotesAccess: boolean}>
}
```

**Services to Refactor**:
- NoteService (remove access control logic)
- SessionService (add permission checks)
- CounselProcessingService (add permission checks)
- ShareService (consolidate permission logic)

**Benefits**:
- Single source of truth for all permissions
- Easier to audit security rules
- Consistent permission logic across features
- Simpler to add new permission types
- Easier to test permission rules in isolation

**Estimated Effort**: 3-4 hours
- Analysis of scattered logic: 1 hour
- Service creation: 1 hour
- Refactoring existing services: 1-2 hours
- Testing: 1 hour

---

### 3. Centralize Subscription Status Checks (Low Priority)

**Current State**: Subscription checks scattered across services

**Goal**: Create consistent pattern for subscription checking

**Current Usage Locations**:
- CounselProcessingService: Check for history access, clarifying questions limit
- NoteService: Check for note creation access
- SessionService: Check for session persistence
- ProfileService: Check for history access
- ExportService: Check for export access

**Options**:

**Option A: Enhance SubscriptionService** (Recommended)
Add helper methods to existing SubscriptionService:
```typescript
class SubscriptionService {
  // Existing
  async getSubscriptionStatus(userId?: string): Promise<SubscriptionStatus>

  // New helpers
  async requiresHistoryAccess(userId?: string): Promise<void>  // throws if no access
  async requiresFeature(userId: string, feature: Feature): Promise<void>
  async canAccessFeature(userId: string, feature: Feature): Promise<boolean>

  // Feature enum
  enum Feature {
    HISTORY_ACCESS,
    NOTE_CREATION,
    EXPORT,
    ADVANCED_SEARCH,
    // ... other features
  }
}
```

**Option B: Create SubscriptionGuard**
NestJS guard that can be applied to routes/methods:
```typescript
@SubscriptionRequired(Feature.HISTORY_ACCESS)
async getHistory() { ... }
```

**Option C: Keep Current Pattern** (Status Quo)
- Services call `getSubscriptionStatus()` and check fields
- Pro: Explicit, clear what's being checked
- Con: Repetitive code, easy to miss checks

**Recommendation**: Option A (Enhance SubscriptionService)
- Centralizes logic without major refactoring
- Provides both imperative (throw) and conditional (return bool) styles
- Easy to add new feature flags
- Backward compatible with existing code

**Estimated Effort**: 1-2 hours
- Add helper methods: 30 min
- Update calling code (optional): 1 hour
- Testing: 30 min

---

## Prioritization Recommendation

### High Priority (Do Next)
1. **Split AiService** - Largest remaining god class (752 lines)
   - Clear separation already exists in code
   - Two distinct responsibilities (counseling vs support)
   - Different AI providers

### Medium Priority (After AiService)
2. **Extract PermissionService** - Security-critical
   - Scattered permission logic is hard to audit
   - Important for security compliance
   - Makes authorization rules explicit and testable

### Low Priority (Optional)
3. **Centralize Subscription Checks** - Nice to have
   - Current pattern works fine
   - Low risk if not done
   - Can be done incrementally

---

## Success Metrics

**Phase 2 Goal**: Eliminate all god classes over 400 lines

**Current State**:
- ✅ CounselService: 113 lines (was 705)
- 🔲 AiService: 752 lines
- ✅ All other services: < 400 lines

**After AiService Split**:
- ✅ CounselingAiService: ~350 lines
- ✅ SupportAiService: ~400 lines
- ✅ All services: < 500 lines ✨

---

## Testing Strategy

For each remaining refactoring:

### Unit Tests
- Test extracted services in isolation
- Mock dependencies
- Focus on business logic

### Integration Tests
- Test service interactions
- Verify permission flows work end-to-end
- Test subscription gating

### Regression Tests
- Run existing test suite
- Manual smoke testing of key features
- Verify no behavioral changes

---

## Risk Mitigation

### For AiService Split:
- **Risk**: Breaking existing AI functionality
- **Mitigation**:
  - Keep original AiService temporarily as facade
  - Update imports gradually
  - Test each AI feature after split

### For PermissionService:
- **Risk**: Breaking access control
- **Mitigation**:
  - Add comprehensive permission tests first
  - Refactor one permission type at a time
  - Security review after extraction

### For Subscription Centralization:
- **Risk**: Breaking feature gating
- **Mitigation**:
  - Make changes backward compatible
  - Add feature flag tests
  - Deploy behind feature toggle

---

## Next Session Checklist

When continuing Phase 2:

1. [ ] Read this document
2. [ ] Review AiService structure (752 lines)
3. [ ] Create CounselingAiService with OpenAI methods
4. [ ] Create SupportAiService with Anthropic methods
5. [ ] Update AiModule to export both services
6. [ ] Update 6 importing files:
   - [ ] counsel-processing.service.ts
   - [ ] scripture-enrichment.service.ts
   - [ ] wellbeing-analysis.service.ts
   - [ ] support.service.ts
   - [ ] ai.scheduler.ts
   - [ ] ai.module.ts
7. [ ] Test compilation
8. [ ] Run smoke tests
9. [ ] Commit with detailed message
10. [ ] Update documentation
11. [ ] Mark task as complete in todo list
12. [ ] Decide if continuing with PermissionService or moving to Phase 3

---

## Phase 2 Completion Criteria

Phase 2 will be considered **100% complete** when:
- ✅ CounselService fully refactored (DONE)
- ✅ AiService split into two services (CounselingAi + SupportAi)
- ✅ All god classes (>400 lines) eliminated
- ✅ All code compiling and tests passing
- ✅ Documentation updated
- 🎯 Optional: PermissionService extracted
- 🎯 Optional: Subscription checks centralized

**Current Completion**: 75% (1 of 2 required tasks complete)
**With AiService Split**: 100% (All required tasks complete)
