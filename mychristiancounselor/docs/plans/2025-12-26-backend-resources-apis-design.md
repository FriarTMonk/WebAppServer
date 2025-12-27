# Backend Resources APIs Design

**Date**: 2025-12-26
**Status**: Approved
**Related**: Phase 2 Book Resources UI Implementation

## Overview

Three new backend APIs to support the book resources UI Phase 2 implementation:
1. **Reading List API** - Personal book tracking with status, progress, notes, ratings
2. **Organizations Directory API** - Browse external counseling organizations with filters
3. **Recommendations API** - Personalized book recommendations from counseling sessions

All APIs use `/api/resources/` namespace to mirror frontend structure.

---

## 1. Reading List API

### Purpose
Full CRUD API for personal book tracking using the existing `UserReadingList` Prisma model.

### Database Model
```prisma
model UserReadingList {
  id             String    @id @default(uuid())
  userId         String
  bookId         String
  status         String    // 'want_to_read' | 'currently_reading' | 'finished'
  progress       Int?      // Percentage for currently_reading
  personalNotes  String?   @db.Text
  personalRating Int?      // 1-5 stars
  dateStarted    DateTime?
  dateFinished   DateTime?
  addedAt        DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  book           Book      @relation("UserReadingLists", fields: [bookId], references: [id], onDelete: Cascade)
  user           User      @relation("ReadingLists", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, bookId])
  @@index([userId, status])
}
```

### Endpoints

#### GET /api/resources/reading-list
**Purpose**: List user's reading list with optional filtering

**Authentication**: Required (JWT)

**Query Parameters**:
- `status` (optional): `want_to_read` | `currently_reading` | `finished` | `all`
  - Default: `all`

**Response**: `200 OK`
```typescript
{
  items: [
    {
      id: string;
      bookId: string;
      status: string;
      progress: number | null;
      personalNotes: string | null;
      personalRating: number | null;
      dateStarted: string | null;
      dateFinished: string | null;
      addedAt: string;
      updatedAt: string;
      book: {
        id: string;
        title: string;
        author: string;
        coverImageUrl: string | null;
        biblicalAlignmentScore: number | null;
        genreTag: string;
        matureContent: boolean;
      };
    }
  ];
  total: number;
}
```

**Sorting Logic**:
1. `currently_reading` entries: Sort by `progress DESC` (furthest along first)
2. `want_to_read` entries: Sort by `addedAt DESC` (most recently added first)
3. `finished` entries: Sort by `dateFinished DESC` (most recently finished first)

**Error Cases**:
- `401 Unauthorized`: No valid JWT token

---

#### POST /api/resources/reading-list
**Purpose**: Add book to user's reading list

**Authentication**: Required (JWT)

**Request Body**:
```typescript
{
  bookId: string;           // Required
  status?: string;          // Optional, default: 'want_to_read'
  notes?: string;           // Optional
  rating?: number;          // Optional, 1-5
  dateStarted?: string;     // Optional, ISO date
  dateFinished?: string;    // Optional, ISO date
}
```

**Validation Rules**:
- `bookId`: Must exist in Book table
- `status`: Must be one of: `want_to_read`, `currently_reading`, `finished`
- `rating`: If provided, must be 1-5
- `progress`: Not allowed on creation (only via PATCH)
- **Unique constraint**: User cannot add same book twice (@@unique([userId, bookId]))

**Auto-Date Logic**:
- If `status === 'currently_reading'` and no `dateStarted` provided: Set `dateStarted = now()`
- If `status === 'finished'` and no `dateFinished` provided: Set `dateFinished = now()`
- If manual dates provided: Use those instead

**Response**: `201 Created`
```typescript
{
  id: string;
  bookId: string;
  status: string;
  progress: number | null;
  personalNotes: string | null;
  personalRating: number | null;
  dateStarted: string | null;
  dateFinished: string | null;
  addedAt: string;
  updatedAt: string;
}
```

**Error Cases**:
- `400 Bad Request`: Invalid bookId, rating out of range, invalid status
- `401 Unauthorized`: No valid JWT token
- `409 Conflict`: Book already in user's reading list

---

#### PATCH /api/resources/reading-list/:id
**Purpose**: Update reading list entry (status, progress, notes, rating)

**Authentication**: Required (JWT, must own the entry)

**Request Body** (all fields optional):
```typescript
{
  status?: string;          // 'want_to_read' | 'currently_reading' | 'finished'
  progress?: number;        // 0-100
  notes?: string;
  rating?: number;          // 1-5
  dateStarted?: string;     // ISO date, override auto-date
  dateFinished?: string;    // ISO date, override auto-date
}
```

**Smart Validation & Auto-Completion**:

1. **Status = `currently_reading`**:
   - `progress`: Must be 1-99% (if provided)
   - Clear `dateFinished` (if any)
   - If no `dateStarted`: Set `dateStarted = now()`
   - Allow manual `dateStarted` override

2. **Status = `finished`**:
   - Auto-set `progress = 100`
   - If no `dateFinished`: Set `dateFinished = now()`
   - Allow manual `dateFinished` override

3. **Status = `want_to_read`**:
   - Clear `progress`, `dateStarted`, `dateFinished`

4. **Progress = 100%** (regardless of status):
   - Auto-change `status = 'finished'`
   - Set `dateFinished = now()` (if not provided)

5. **Date Overrides**:
   - If manual dates provided in request: Use those
   - Else: Apply auto-date logic

**Response**: `200 OK`
```typescript
{
  id: string;
  bookId: string;
  status: string;
  progress: number | null;
  personalNotes: string | null;
  personalRating: number | null;
  dateStarted: string | null;
  dateFinished: string | null;
  addedAt: string;
  updatedAt: string;
}
```

**Error Cases**:
- `400 Bad Request`: Invalid status, progress out of range (1-99 for currently_reading), rating out of range
- `401 Unauthorized`: No valid JWT token
- `403 Forbidden`: User doesn't own this reading list entry
- `404 Not Found`: Reading list entry doesn't exist

---

#### DELETE /api/resources/reading-list/:id
**Purpose**: Remove book from reading list

**Authentication**: Required (JWT, must own the entry)

**Response**: `204 No Content`

**Error Cases**:
- `401 Unauthorized`: No valid JWT token
- `403 Forbidden`: User doesn't own this reading list entry
- `404 Not Found`: Reading list entry doesn't exist

---

## 2. Organizations Directory API

### Purpose
Browse external organizations (counseling centers, churches, support groups) with filtering by location, type, and specialty.

### Database Model
```prisma
model ExternalOrganization {
  id                          String    @id @default(uuid())
  name                        String
  organizationTypes           String[]  // ['church', 'counseling_center', 'support_group']
  specialtyTags               String[]  // ['marriage', 'addiction', 'grief']
  address                     String
  city                        String
  state                       String
  zipCode                     String
  country                     String
  latitude                    Float?
  longitude                   Float?
  phone                       String?
  email                       String?
  website                     String?
  hours                       String?
  recommendedByOrganizationId String
  recommendationNote          String
  createdAt                   DateTime  @default(now())
  updatedAt                   DateTime  @updatedAt
  addedById                   String
  recommendedBy               Organization @relation(fields: [recommendedByOrganizationId], references: [id], onDelete: Cascade)
  addedBy                     User @relation(fields: [addedById], references: [id])

  @@index([recommendedByOrganizationId])
  @@index([city, state])
}
```

### Endpoints

#### GET /api/resources/organizations
**Purpose**: Browse external organizations with filtering

**Authentication**: Required (JWT)

**Query Parameters** (all optional):
- `city` (string): Filter by city (case-insensitive)
- `state` (string): Filter by state (case-insensitive)
- `organizationType` (string): Filter by type (must be in organizationTypes array)
- `specialtyTag` (string): Filter by specialty (must be in specialtyTags array)
- `search` (string): Search name, organizationTypes, specialtyTags (case-insensitive)
- `latitude` (number): User's latitude for distance calculation
- `longitude` (number): User's longitude for distance calculation
- `radius` (number): Search radius in miles (requires lat/long, default: 25, max: 100)
- `skip` (number): Pagination offset (default: 0)
- `take` (number): Pagination limit (default: 20, max: 100)

**Response**: `200 OK`
```typescript
{
  organizations: [
    {
      id: string;
      name: string;
      organizationTypes: string[];
      specialtyTags: string[];
      address: string;
      city: string;
      state: string;
      zipCode: string;
      country: string;
      phone: string | null;
      email: string | null;
      website: string | null;
      hours: string | null;
      recommendationNote: string;
      recommendedBy: {
        id: string;
        name: string;
      };
      distance?: number;  // Miles, only if lat/long provided
    }
  ];
  total: number;
}
```

**Sorting Logic**:
- If `latitude` and `longitude` provided: Sort by distance ASC (nearest first)
- Else: Sort alphabetically by `name ASC`

**Distance Calculation** (Haversine formula):
```typescript
// If lat/long provided, calculate distance for each org
distance = haversineDistance(userLat, userLong, org.latitude, org.longitude);
// Filter by radius if specified
if (radius && distance > radius) exclude;
```

**Error Cases**:
- `400 Bad Request`: Invalid lat/long, radius > 100, take > 100
- `401 Unauthorized`: No valid JWT token

---

#### GET /api/resources/organizations/:id
**Purpose**: Get detailed information about a specific organization

**Authentication**: Required (JWT)

**Response**: `200 OK`
```typescript
{
  id: string;
  name: string;
  organizationTypes: string[];
  specialtyTags: string[];
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  hours: string | null;
  recommendationNote: string;
  createdAt: string;
  updatedAt: string;
  recommendedBy: {
    id: string;
    name: string;
  };
  addedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}
```

**Error Cases**:
- `401 Unauthorized`: No valid JWT token
- `404 Not Found`: Organization doesn't exist

---

## 3. Recommendations API

### Purpose
Personalized book recommendations based on books mentioned in user's counseling sessions. Returns empty for users without sessions.

### Database Models Used
```prisma
model ConversationResourceMention {
  id             String    @id @default(uuid())
  conversationId String    // Session ID
  messageId      String?
  resourceType   String    // 'book' | 'organization'
  bookId         String?
  contextSnippet String?   @db.Text
  mentionedAt    DateTime  @default(now())
  book           Book?     @relation(fields: [bookId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([bookId])
}
```

### Endpoint

#### GET /api/resources/recommendations
**Purpose**: Get personalized book recommendations from counseling sessions

**Authentication**: Required (JWT)

**Query Parameters** (all optional):
- `limit` (number): Max recommendations to return (default: 10, max: 50)
- `excludeInReadingList` (boolean): Exclude books already in user's reading list (default: true)

**Response**: `200 OK`

**If user has counseling sessions with book mentions**:
```typescript
{
  recommendations: [
    {
      book: {
        id: string;
        title: string;
        author: string;
        coverImageUrl: string | null;
        biblicalAlignmentScore: number | null;
        genreTag: string;
        description: string | null;
        matureContent: boolean;
      };
      mentionCount: number;         // How many times mentioned
      lastMentionedAt: string;      // Most recent mention (ISO date)
      contextSnippet: string | null; // Sample conversation context
    }
  ];
  total: number;
  message?: string;
}
```

**If user has NO counseling sessions or no book mentions**:
```typescript
{
  recommendations: [];
  total: 0;
  message: "No recommendations yet. Books mentioned in your counseling sessions will appear here."
}
```

**Algorithm Logic**:
1. Find all user's counseling session IDs (from Conversation model where userId = current user)
2. Query `ConversationResourceMention` where:
   - `conversationId IN user's sessions`
   - `resourceType = 'book'`
   - `bookId IS NOT NULL`
3. Group by `bookId`:
   - Count mentions: `mentionCount`
   - Get most recent `mentionedAt`: `lastMentionedAt`
   - Get most recent `contextSnippet`
4. Join with `Book` table to get full book details
5. Apply book visibility rules (check if user can access based on alignment score and org memberships)
6. If `excludeInReadingList = true`: Filter out books where `UserReadingList` exists for this user+book
7. Sort by: `mentionCount DESC, lastMentionedAt DESC`
8. Limit to requested `limit` (default 10, max 50)

**Visibility Rules Applied**:
- Use same logic as `GET /api/books` endpoint
- Globally aligned (≥90%): All users
- Conceptually aligned (70-89%): Organization members
- Not aligned (<70%): Platform admins only
- Mature content: Respect age-gating rules

**Error Cases**:
- `400 Bad Request`: limit > 50
- `401 Unauthorized`: No valid JWT token

---

## Architecture Patterns

### Controller Structure
Follow existing `book.controller.ts` patterns:
- Use `@Controller('resources')` decorator
- Nest sub-resources: `reading-list`, `organizations`, `recommendations`
- Use dedicated service classes for business logic
- Use DTOs for request/response validation
- Use guards for authentication/authorization

### Service Layer
Create separate services for each API:
- `ReadingListService` - CRUD operations, smart validation logic
- `OrganizationsService` - Filtering, distance calculations
- `RecommendationsService` - Query ConversationResourceMention, apply visibility rules

### DTOs
Define request/response DTOs:
- `AddToReadingListDto`, `UpdateReadingListDto`
- `OrganizationQueryDto`, `OrganizationResponseDto`
- `RecommendationsQueryDto`, `RecommendationResponseDto`

### Guards
- `JwtAuthGuard` - All endpoints require authentication
- Optional: `IsOrgAdminGuard` - If we add admin endpoints for managing orgs

### Error Handling
- Use NestJS exception filters
- Return consistent error format
- Log errors for debugging

---

## Implementation Notes

### Reading List - Smart Validation
The PATCH endpoint has complex state transitions. Implement as a state machine:

```typescript
class ReadingListStateMachine {
  transition(currentState: UserReadingList, updates: UpdateDto): UserReadingList {
    // Handle progress = 100% -> auto-finish
    if (updates.progress === 100) {
      return this.finishBook(currentState, updates);
    }

    // Handle status change
    if (updates.status) {
      return this.changeStatus(currentState, updates);
    }

    // Simple field updates
    return this.updateFields(currentState, updates);
  }
}
```

### Organizations - Distance Calculation
Use Haversine formula for accurate distance:

```typescript
function haversineDistance(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
```

### Recommendations - Performance
Optimize queries:
1. Use Prisma's query optimization for joins
2. Add index on `ConversationResourceMention.conversationId`
3. Consider caching popular recommendations
4. Limit to 50 recommendations max to prevent expensive queries

### Testing Strategy
- Unit tests for service logic (validation, state transitions, distance calc)
- Integration tests for endpoints (request/response, auth, error cases)
- E2E tests for critical flows (add to list -> mark as reading -> finish)

---

## Security Considerations

1. **Authorization**: Users can only access their own reading lists
2. **Input Validation**: All DTOs validate using class-validator
3. **SQL Injection**: Prisma prevents SQL injection by default
4. **Rate Limiting**: Consider rate limiting for recommendations (expensive query)
5. **Book Visibility**: Recommendations respect same visibility rules as `/api/books`

---

## Database Migrations

No schema changes needed:
- ✅ `UserReadingList` model exists
- ✅ `ExternalOrganization` model exists
- ✅ `ConversationResourceMention` model exists

All necessary indexes already present:
- ✅ `@@index([userId, status])` on UserReadingList
- ✅ `@@index([city, state])` on ExternalOrganization
- ✅ `@@index([conversationId])` and `@@index([bookId])` on ConversationResourceMention

---

## Frontend Integration

### Reading List
- UI Pages: `/resources/reading-list`
- Components: Tab navigation (Want to Read, Currently Reading, Finished)
- Actions: Add to list from book detail page, update status/progress, add notes/ratings

### Organizations
- UI Pages: `/resources/organizations`
- Components: Location filters, organization type filters, map view (future)
- Actions: Browse, view details, get directions

### Recommendations
- UI Pages: `/resources/recommended`
- Components: Personalized book cards with mention context
- Actions: View book details, add to reading list

---

## Success Criteria

### Reading List API
- ✅ Users can add books to reading list
- ✅ Progress tracking works correctly (1-99%, auto-complete at 100%)
- ✅ Status transitions work (want_to_read → currently_reading → finished)
- ✅ Dates auto-set correctly with manual override support
- ✅ Unique constraint prevents duplicates

### Organizations API
- ✅ Authenticated users can browse organizations
- ✅ Location filters work (city, state, distance)
- ✅ Type and specialty filters work
- ✅ Distance calculation accurate within 1%
- ✅ Results sorted by distance or alphabetically

### Recommendations API
- ✅ Books mentioned in sessions appear in recommendations
- ✅ Mention count and recency affect ranking
- ✅ Empty array for users without sessions
- ✅ Excludes books already in reading list (optional)
- ✅ Respects book visibility rules

---

## Future Enhancements

### Reading List
- Book series tracking (read book 1-3 of series)
- Reading goals (finish 12 books this year)
- Reading stats (total books read, pages read, avg rating)
- Social features (share reading list with counselor)

### Organizations
- Organization reviews/ratings
- Favorite organizations
- Direct contact/appointment booking integration
- Map view with pins
- Driving directions integration

### Recommendations
- AI-enhanced recommendations (analyze conversation sentiment, topics)
- "Why recommended" explanations
- Similar books suggestions
- Trending in your organization
