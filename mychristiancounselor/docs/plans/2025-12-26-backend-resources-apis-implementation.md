# Backend Resources APIs Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement 3 backend REST APIs for reading lists, organizations directory, and personalized recommendations

**Architecture:** New `resources` NestJS module with 3 controllers and services following existing book module patterns. Uses Prisma for database, class-validator for DTOs, JWT guards for authentication.

**Tech Stack:** NestJS, Prisma, TypeScript, class-validator, Jest

---

## Task 1: Create Resources Module Structure

**Files:**
- Create: `packages/api/src/resources/resources.module.ts`
- Create: `packages/api/src/resources/resources.controller.ts`
- Modify: `packages/api/src/app/app.module.ts`

**Step 1: Create resources module file**

File: `packages/api/src/resources/resources.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResourcesController } from './resources.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [],
  exports: [],
})
export class ResourcesModule {}
```

**Step 2: Create empty controller**

File: `packages/api/src/resources/resources.controller.ts`

```typescript
import { Controller } from '@nestjs/common';

/**
 * Controller for resources endpoints (reading lists, organizations, recommendations).
 * Base path: /api/resources
 */
@Controller('resources')
export class ResourcesController {
  constructor() {}
}
```

**Step 3: Register module in app.module.ts**

File: `packages/api/src/app/app.module.ts`

Find the imports array (around line 78) and add:

```typescript
import { ResourcesModule } from '../resources/resources.module';

@Module({
  imports: [
    // ... existing imports ...
    BookModule,
    ResourcesModule, // Add this line
    // ... other imports ...
  ],
})
```

**Step 4: Test module loads**

Run: `cd packages/api && npm run build`
Expected: Build succeeds, no errors

**Step 5: Commit**

```bash
git add packages/api/src/resources/ packages/api/src/app/app.module.ts
git commit -m "feat(api): create Resources module structure

Creates new Resources module to house reading list, organizations,
and recommendations APIs at /api/resources base path.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 2: Create Reading List DTOs

**Files:**
- Create: `packages/api/src/resources/dto/reading-list-query.dto.ts`
- Create: `packages/api/src/resources/dto/add-to-reading-list.dto.ts`
- Create: `packages/api/src/resources/dto/update-reading-list.dto.ts`
- Create: `packages/api/src/resources/dto/reading-list-item.dto.ts`
- Create: `packages/api/src/resources/dto/reading-list-response.dto.ts`
- Create: `packages/api/src/resources/dto/index.ts`

**Step 1: Create query DTO**

File: `packages/api/src/resources/dto/reading-list-query.dto.ts`

```typescript
import { IsOptional, IsIn } from 'class-validator';

export class ReadingListQueryDto {
  @IsOptional()
  @IsIn(['want_to_read', 'currently_reading', 'finished', 'all'])
  status?: 'want_to_read' | 'currently_reading' | 'finished' | 'all' = 'all';
}
```

**Step 2: Create add DTO**

File: `packages/api/src/resources/dto/add-to-reading-list.dto.ts`

```typescript
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';

export class AddToReadingListDto {
  @IsString()
  bookId: string;

  @IsOptional()
  @IsIn(['want_to_read', 'currently_reading', 'finished'])
  status?: 'want_to_read' | 'currently_reading' | 'finished' = 'want_to_read';

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsISO8601()
  dateStarted?: string;

  @IsOptional()
  @IsISO8601()
  dateFinished?: string;
}
```

**Step 3: Create update DTO**

File: `packages/api/src/resources/dto/update-reading-list.dto.ts`

```typescript
import {
  IsString,
  IsOptional,
  IsIn,
  IsInt,
  Min,
  Max,
  IsISO8601,
} from 'class-validator';

export class UpdateReadingListDto {
  @IsOptional()
  @IsIn(['want_to_read', 'currently_reading', 'finished'])
  status?: 'want_to_read' | 'currently_reading' | 'finished';

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  rating?: number;

  @IsOptional()
  @IsISO8601()
  dateStarted?: string;

  @IsOptional()
  @IsISO8601()
  dateFinished?: string;
}
```

**Step 4: Create response DTOs**

File: `packages/api/src/resources/dto/reading-list-item.dto.ts`

```typescript
export class ReadingListItemDto {
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
```

File: `packages/api/src/resources/dto/reading-list-response.dto.ts`

```typescript
import { ReadingListItemDto } from './reading-list-item.dto';

export class ReadingListResponseDto {
  items: ReadingListItemDto[];
  total: number;
}
```

**Step 5: Create index file**

File: `packages/api/src/resources/dto/index.ts`

```typescript
export * from './reading-list-query.dto';
export * from './add-to-reading-list.dto';
export * from './update-reading-list.dto';
export * from './reading-list-item.dto';
export * from './reading-list-response.dto';
```

**Step 6: Test DTOs compile**

Run: `cd packages/api && npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add packages/api/src/resources/dto/
git commit -m "feat(api): add Reading List DTOs

Creates DTOs for reading list CRUD operations with validation:
- Query DTO with status filter
- Add DTO with book, status, notes, rating, dates
- Update DTO with all editable fields
- Response DTOs for items and lists

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 3: Create Reading List Service

**Files:**
- Create: `packages/api/src/resources/services/reading-list.service.ts`
- Create: `packages/api/src/resources/services/reading-list.service.spec.ts`

**Step 1: Write failing test for addToReadingList**

File: `packages/api/src/resources/services/reading-list.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { ReadingListService } from './reading-list.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ReadingListService', () => {
  let service: ReadingListService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      book: {
        findUnique: jest.fn(),
      },
      userReadingList: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReadingListService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ReadingListService>(ReadingListService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToReadingList', () => {
    it('should add book to reading list with default status', async () => {
      const userId = 'user-123';
      const bookId = 'book-456';
      const dto = { bookId };

      prisma.book.findUnique.mockResolvedValue({ id: bookId } as any);
      prisma.userReadingList.findUnique.mockResolvedValue(null);
      prisma.userReadingList.create.mockResolvedValue({
        id: 'reading-list-789',
        userId,
        bookId,
        status: 'want_to_read',
        progress: null,
        personalNotes: null,
        personalRating: null,
        dateStarted: null,
        dateFinished: null,
        addedAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const result = await service.addToReadingList(userId, dto);

      expect(result.status).toBe('want_to_read');
      expect(prisma.userReadingList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          bookId,
          status: 'want_to_read',
        }),
      });
    });

    it('should throw NotFoundException if book does not exist', async () => {
      const userId = 'user-123';
      const dto = { bookId: 'invalid-book' };

      prisma.book.findUnique.mockResolvedValue(null);

      await expect(service.addToReadingList(userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ConflictException if book already in reading list', async () => {
      const userId = 'user-123';
      const bookId = 'book-456';
      const dto = { bookId };

      prisma.book.findUnique.mockResolvedValue({ id: bookId } as any);
      prisma.userReadingList.findUnique.mockResolvedValue({
        id: 'existing-entry',
      } as any);

      await expect(service.addToReadingList(userId, dto)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should auto-set dateStarted when status is currently_reading', async () => {
      const userId = 'user-123';
      const bookId = 'book-456';
      const dto = { bookId, status: 'currently_reading' as const };

      prisma.book.findUnique.mockResolvedValue({ id: bookId } as any);
      prisma.userReadingList.findUnique.mockResolvedValue(null);
      prisma.userReadingList.create.mockResolvedValue({
        id: 'reading-list-789',
        dateStarted: new Date(),
      } as any);

      await service.addToReadingList(userId, dto);

      expect(prisma.userReadingList.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          status: 'currently_reading',
          dateStarted: expect.any(Date),
        }),
      });
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: FAIL with "ReadingListService is not defined"

**Step 3: Create minimal service implementation**

File: `packages/api/src/resources/services/reading-list.service.ts`

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  AddToReadingListDto,
  UpdateReadingListDto,
  ReadingListQueryDto,
  ReadingListResponseDto,
} from '../dto';

@Injectable()
export class ReadingListService {
  private readonly logger = new Logger(ReadingListService.name);

  constructor(private readonly prisma: PrismaService) {}

  async addToReadingList(userId: string, dto: AddToReadingListDto) {
    this.logger.log(`Adding book ${dto.bookId} to reading list for user ${userId}`);

    // Check if book exists
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });

    if (!book) {
      throw new NotFoundException(`Book with ID ${dto.bookId} not found`);
    }

    // Check if already in reading list
    const existing = await this.prisma.userReadingList.findUnique({
      where: {
        userId_bookId: {
          userId,
          bookId: dto.bookId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Book already in reading list');
    }

    // Auto-set dates based on status
    const dateStarted =
      dto.dateStarted
        ? new Date(dto.dateStarted)
        : dto.status === 'currently_reading'
          ? new Date()
          : null;

    const dateFinished =
      dto.dateFinished
        ? new Date(dto.dateFinished)
        : dto.status === 'finished'
          ? new Date()
          : null;

    // Create entry
    const entry = await this.prisma.userReadingList.create({
      data: {
        userId,
        bookId: dto.bookId,
        status: dto.status || 'want_to_read',
        personalNotes: dto.notes || null,
        personalRating: dto.rating || null,
        dateStarted,
        dateFinished,
      },
    });

    return entry;
  }

  async getReadingList(
    userId: string,
    query: ReadingListQueryDto,
  ): Promise<ReadingListResponseDto> {
    // TODO: Implement in next task
    return { items: [], total: 0 };
  }

  async updateReadingListItem(
    userId: string,
    id: string,
    dto: UpdateReadingListDto,
  ) {
    // TODO: Implement in next task
    return null;
  }

  async removeFromReadingList(userId: string, id: string) {
    // TODO: Implement in next task
    return;
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/resources/services/
git commit -m "feat(api): implement Reading List Service addToReadingList

Implements addToReadingList with:
- Book existence validation
- Duplicate prevention with ConflictException
- Auto-date setting for status transitions
- Full test coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 4: Implement Reading List Query Logic

**Files:**
- Modify: `packages/api/src/resources/services/reading-list.service.ts`
- Modify: `packages/api/src/resources/services/reading-list.service.spec.ts`

**Step 1: Add tests for getReadingList**

File: `packages/api/src/resources/services/reading-list.service.spec.ts`

Add to describe block:

```typescript
describe('getReadingList', () => {
  it('should return all reading list items when status is all', async () => {
    const userId = 'user-123';
    const query = { status: 'all' as const };

    const mockItems = [
      {
        id: 'item-1',
        userId,
        bookId: 'book-1',
        status: 'currently_reading',
        progress: 50,
        book: { id: 'book-1', title: 'Test Book 1', author: 'Author 1' },
      },
      {
        id: 'item-2',
        userId,
        bookId: 'book-2',
        status: 'want_to_read',
        progress: null,
        book: { id: 'book-2', title: 'Test Book 2', author: 'Author 2' },
      },
    ];

    prisma.userReadingList.findMany.mockResolvedValue(mockItems as any);
    prisma.userReadingList.count.mockResolvedValue(2);

    const result = await service.getReadingList(userId, query);

    expect(result.items).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it('should filter by status when specified', async () => {
    const userId = 'user-123';
    const query = { status: 'currently_reading' as const };

    prisma.userReadingList.findMany.mockResolvedValue([
      {
        id: 'item-1',
        status: 'currently_reading',
        book: { title: 'Reading Now' },
      },
    ] as any);
    prisma.userReadingList.count.mockResolvedValue(1);

    await service.getReadingList(userId, query);

    expect(prisma.userReadingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: 'currently_reading',
        }),
      }),
    );
  });

  it('should sort currently_reading by progress DESC', async () => {
    const userId = 'user-123';
    const query = { status: 'currently_reading' as const };

    await service.getReadingList(userId, query);

    expect(prisma.userReadingList.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { progress: 'desc' },
      }),
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: FAIL (getReadingList returns empty array)

**Step 3: Implement getReadingList**

File: `packages/api/src/resources/services/reading-list.service.ts`

Replace getReadingList method:

```typescript
async getReadingList(
  userId: string,
  query: ReadingListQueryDto,
): Promise<ReadingListResponseDto> {
  this.logger.log(`Getting reading list for user ${userId}, status: ${query.status}`);

  // Build where clause
  const where: any = { userId };
  if (query.status && query.status !== 'all') {
    where.status = query.status;
  }

  // Determine sort order based on status
  let orderBy: any;
  if (query.status === 'currently_reading') {
    orderBy = { progress: 'desc' }; // Furthest along first
  } else if (query.status === 'want_to_read') {
    orderBy = { addedAt: 'desc' }; // Most recently added first
  } else if (query.status === 'finished') {
    orderBy = { dateFinished: 'desc' }; // Most recently finished first
  } else {
    // Mixed status - use custom sorting logic
    orderBy = { addedAt: 'desc' };
  }

  // Execute queries in parallel
  const [items, total] = await Promise.all([
    this.prisma.userReadingList.findMany({
      where,
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
            biblicalAlignmentScore: true,
            genreTag: true,
            matureContent: true,
          },
        },
      },
      orderBy,
    }),
    this.prisma.userReadingList.count({ where }),
  ]);

  // Transform to DTOs
  const dtoItems = items.map((item) => ({
    id: item.id,
    bookId: item.bookId,
    status: item.status,
    progress: item.progress,
    personalNotes: item.personalNotes,
    personalRating: item.personalRating,
    dateStarted: item.dateStarted?.toISOString() || null,
    dateFinished: item.dateFinished?.toISOString() || null,
    addedAt: item.addedAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    book: item.book,
  }));

  return {
    items: dtoItems,
    total,
  };
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/resources/services/
git commit -m "feat(api): implement Reading List query with sorting

Implements getReadingList with:
- Status filtering (all, want_to_read, currently_reading, finished)
- Smart sorting per status (progress desc, addedAt desc, dateFinished desc)
- Full book details via join
- Full test coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 5: Implement Reading List Update Logic with State Machine

**Files:**
- Modify: `packages/api/src/resources/services/reading-list.service.ts`
- Modify: `packages/api/src/resources/services/reading-list.service.spec.ts`

**Step 1: Add tests for updateReadingListItem**

File: `packages/api/src/resources/services/reading-list.service.spec.ts`

Add to describe block:

```typescript
describe('updateReadingListItem', () => {
  it('should update status to currently_reading and set dateStarted', async () => {
    const userId = 'user-123';
    const id = 'item-1';
    const dto = { status: 'currently_reading' as const };

    const existing = {
      id,
      userId,
      bookId: 'book-1',
      status: 'want_to_read',
      dateStarted: null,
    };

    prisma.userReadingList.findUnique.mockResolvedValue(existing as any);
    prisma.userReadingList.update.mockResolvedValue({
      ...existing,
      status: 'currently_reading',
      dateStarted: new Date(),
    } as any);

    await service.updateReadingListItem(userId, id, dto);

    expect(prisma.userReadingList.update).toHaveBeenCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: 'currently_reading',
        dateStarted: expect.any(Date),
        dateFinished: null, // Should clear dateFinished
      }),
    });
  });

  it('should auto-complete when progress reaches 100', async () => {
    const userId = 'user-123';
    const id = 'item-1';
    const dto = { progress: 100 };

    const existing = {
      id,
      userId,
      status: 'currently_reading',
      progress: 80,
    };

    prisma.userReadingList.findUnique.mockResolvedValue(existing as any);
    prisma.userReadingList.update.mockResolvedValue({
      ...existing,
      status: 'finished',
      progress: 100,
      dateFinished: new Date(),
    } as any);

    await service.updateReadingListItem(userId, id, dto);

    expect(prisma.userReadingList.update).toHaveBeenCalledWith({
      where: { id },
      data: expect.objectContaining({
        status: 'finished',
        progress: 100,
        dateFinished: expect.any(Date),
      }),
    });
  });

  it('should validate progress is 1-99 for currently_reading', async () => {
    const userId = 'user-123';
    const id = 'item-1';
    const dto = { status: 'currently_reading' as const, progress: 100 };

    const existing = {
      id,
      userId,
      status: 'want_to_read',
    };

    prisma.userReadingList.findUnique.mockResolvedValue(existing as any);

    // Progress 100 should auto-transition to finished, not stay currently_reading
    await service.updateReadingListItem(userId, id, dto);

    expect(prisma.userReadingList.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'finished',
        }),
      }),
    );
  });

  it('should use manual date override if provided', async () => {
    const userId = 'user-123';
    const id = 'item-1';
    const manualDate = '2023-06-15T00:00:00.000Z';
    const dto = { status: 'currently_reading' as const, dateStarted: manualDate };

    const existing = {
      id,
      userId,
      status: 'want_to_read',
    };

    prisma.userReadingList.findUnique.mockResolvedValue(existing as any);
    prisma.userReadingList.update.mockResolvedValue({} as any);

    await service.updateReadingListItem(userId, id, dto);

    expect(prisma.userReadingList.update).toHaveBeenCalledWith({
      where: { id },
      data: expect.objectContaining({
        dateStarted: new Date(manualDate),
      }),
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: FAIL (method returns null)

**Step 3: Implement updateReadingListItem with state machine**

File: `packages/api/src/resources/services/reading-list.service.ts`

Replace updateReadingListItem method:

```typescript
async updateReadingListItem(
  userId: string,
  id: string,
  dto: UpdateReadingListDto,
) {
  this.logger.log(`Updating reading list item ${id} for user ${userId}`);

  // Fetch existing entry
  const existing = await this.prisma.userReadingList.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundException(`Reading list item with ID ${id} not found`);
  }

  if (existing.userId !== userId) {
    throw new ForbiddenException('You do not own this reading list item');
  }

  // Build update data with smart state transitions
  const updateData: any = {};

  // Handle progress = 100% -> auto-finish
  if (dto.progress === 100) {
    updateData.status = 'finished';
    updateData.progress = 100;
    updateData.dateFinished = dto.dateFinished
      ? new Date(dto.dateFinished)
      : new Date();
  }
  // Handle explicit status change
  else if (dto.status) {
    updateData.status = dto.status;

    if (dto.status === 'currently_reading') {
      // Set dateStarted if not already set or if manual override provided
      updateData.dateStarted = dto.dateStarted
        ? new Date(dto.dateStarted)
        : existing.dateStarted || new Date();
      // Clear dateFinished
      updateData.dateFinished = null;
      // Progress must be 1-99 if provided
      if (dto.progress !== undefined) {
        if (dto.progress < 1 || dto.progress > 99) {
          throw new BadRequestException(
            'Progress must be 1-99 for currently_reading status',
          );
        }
        updateData.progress = dto.progress;
      }
    } else if (dto.status === 'finished') {
      // Set dateFinished
      updateData.dateFinished = dto.dateFinished
        ? new Date(dto.dateFinished)
        : new Date();
      // Auto-set progress to 100
      updateData.progress = 100;
    } else if (dto.status === 'want_to_read') {
      // Clear progress and dates
      updateData.progress = null;
      updateData.dateStarted = null;
      updateData.dateFinished = null;
    }
  }
  // Handle progress update without status change
  else if (dto.progress !== undefined) {
    updateData.progress = dto.progress;
  }

  // Handle other field updates
  if (dto.notes !== undefined) {
    updateData.personalNotes = dto.notes;
  }
  if (dto.rating !== undefined) {
    updateData.personalRating = dto.rating;
  }

  // Manual date overrides (if not already set above)
  if (dto.dateStarted && !updateData.dateStarted) {
    updateData.dateStarted = new Date(dto.dateStarted);
  }
  if (dto.dateFinished && !updateData.dateFinished) {
    updateData.dateFinished = new Date(dto.dateFinished);
  }

  // Update entry
  const updated = await this.prisma.userReadingList.update({
    where: { id },
    data: updateData,
  });

  return updated;
}
```

Add import at top:

```typescript
import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
```

**Step 4: Run test to verify it passes**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/resources/services/
git commit -m "feat(api): implement Reading List update with smart state machine

Implements updateReadingListItem with:
- Auto-completion when progress = 100%
- Smart date setting on status transitions
- Progress validation (1-99 for currently_reading)
- Manual date override support
- Full ownership validation
- Full test coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 6: Implement Reading List Delete

**Files:**
- Modify: `packages/api/src/resources/services/reading-list.service.ts`
- Modify: `packages/api/src/resources/services/reading-list.service.spec.ts`

**Step 1: Add tests for removeFromReadingList**

File: `packages/api/src/resources/services/reading-list.service.spec.ts`

Add to describe block:

```typescript
describe('removeFromReadingList', () => {
  it('should delete reading list item', async () => {
    const userId = 'user-123';
    const id = 'item-1';

    const existing = {
      id,
      userId,
      bookId: 'book-1',
    };

    prisma.userReadingList.findUnique.mockResolvedValue(existing as any);
    prisma.userReadingList.delete.mockResolvedValue(existing as any);

    await service.removeFromReadingList(userId, id);

    expect(prisma.userReadingList.delete).toHaveBeenCalledWith({
      where: { id },
    });
  });

  it('should throw NotFoundException if item does not exist', async () => {
    const userId = 'user-123';
    const id = 'invalid-id';

    prisma.userReadingList.findUnique.mockResolvedValue(null);

    await expect(service.removeFromReadingList(userId, id)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should throw ForbiddenException if user does not own item', async () => {
    const userId = 'user-123';
    const id = 'item-1';

    const existing = {
      id,
      userId: 'different-user',
      bookId: 'book-1',
    };

    prisma.userReadingList.findUnique.mockResolvedValue(existing as any);

    await expect(service.removeFromReadingList(userId, id)).rejects.toThrow(
      ForbiddenException,
    );
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: FAIL (method does nothing)

**Step 3: Implement removeFromReadingList**

File: `packages/api/src/resources/services/reading-list.service.ts`

Replace removeFromReadingList method:

```typescript
async removeFromReadingList(userId: string, id: string): Promise<void> {
  this.logger.log(`Removing reading list item ${id} for user ${userId}`);

  // Fetch existing entry
  const existing = await this.prisma.userReadingList.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new NotFoundException(`Reading list item with ID ${id} not found`);
  }

  if (existing.userId !== userId) {
    throw new ForbiddenException('You do not own this reading list item');
  }

  // Delete entry
  await this.prisma.userReadingList.delete({
    where: { id },
  });

  this.logger.log(`Removed reading list item ${id}`);
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/api && npm test reading-list.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/resources/services/
git commit -m "feat(api): implement Reading List delete

Implements removeFromReadingList with:
- Existence validation
- Ownership validation
- Full test coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 7: Wire Reading List Service to Controller

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts`
- Modify: `packages/api/src/resources/resources.module.ts`
- Create: `packages/api/src/resources/resources.controller.spec.ts`

**Step 1: Register service in module**

File: `packages/api/src/resources/resources.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResourcesController } from './resources.controller';
import { ReadingListService } from './services/reading-list.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ReadingListService],
  exports: [ReadingListService],
})
export class ResourcesModule {}
```

**Step 2: Add controller endpoints**

File: `packages/api/src/resources/resources.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@mychristiancounselor/shared';
import { ReadingListService } from './services/reading-list.service';
import {
  AddToReadingListDto,
  UpdateReadingListDto,
  ReadingListQueryDto,
  ReadingListResponseDto,
} from './dto';

/**
 * Controller for resources endpoints (reading lists, organizations, recommendations).
 * Base path: /api/resources
 */
@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly readingListService: ReadingListService) {}

  /**
   * Get user's reading list with optional status filter.
   * GET /api/resources/reading-list
   *
   * @param user - Authenticated user
   * @param query - Query parameters (status filter)
   * @returns Reading list items with book details
   */
  @Get('reading-list')
  async getReadingList(
    @CurrentUser() user: User,
    @Query() query: ReadingListQueryDto,
  ): Promise<ReadingListResponseDto> {
    return this.readingListService.getReadingList(user.id, query);
  }

  /**
   * Add book to user's reading list.
   * POST /api/resources/reading-list
   *
   * @param user - Authenticated user
   * @param dto - Book and status info
   * @returns Created reading list entry
   */
  @Post('reading-list')
  @HttpCode(HttpStatus.CREATED)
  async addToReadingList(
    @CurrentUser() user: User,
    @Body() dto: AddToReadingListDto,
  ) {
    return this.readingListService.addToReadingList(user.id, dto);
  }

  /**
   * Update reading list item (status, progress, notes, rating).
   * PATCH /api/resources/reading-list/:id
   *
   * @param user - Authenticated user
   * @param id - Reading list item ID
   * @param dto - Fields to update
   * @returns Updated reading list entry
   */
  @Patch('reading-list/:id')
  async updateReadingListItem(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() dto: UpdateReadingListDto,
  ) {
    return this.readingListService.updateReadingListItem(user.id, id, dto);
  }

  /**
   * Remove book from reading list.
   * DELETE /api/resources/reading-list/:id
   *
   * @param user - Authenticated user
   * @param id - Reading list item ID
   */
  @Delete('reading-list/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeFromReadingList(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.readingListService.removeFromReadingList(user.id, id);
  }
}
```

**Step 3: Test endpoints manually**

Run: `cd packages/api && npm run build && npm run start:dev`

Test with curl:
```bash
# Get reading list (requires auth token)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" http://localhost:3000/api/resources/reading-list

# Add book
curl -X POST -H "Authorization: Bearer YOUR_JWT_TOKEN" -H "Content-Type: application/json" \
  -d '{"bookId":"some-book-id","status":"want_to_read"}' \
  http://localhost:3000/api/resources/reading-list
```

Expected: Endpoints respond correctly

**Step 4: Commit**

```bash
git add packages/api/src/resources/
git commit -m "feat(api): wire Reading List Service to controller

Adds controller endpoints for reading list CRUD:
- GET /api/resources/reading-list (with status filter)
- POST /api/resources/reading-list (add book)
- PATCH /api/resources/reading-list/:id (update)
- DELETE /api/resources/reading-list/:id (remove)

All endpoints require authentication.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 8: Create Organizations DTOs

**Files:**
- Create: `packages/api/src/resources/dto/organization-query.dto.ts`
- Create: `packages/api/src/resources/dto/organization-response.dto.ts`
- Modify: `packages/api/src/resources/dto/index.ts`

**Step 1: Create query DTO**

File: `packages/api/src/resources/dto/organization-query.dto.ts`

```typescript
import {
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OrganizationQueryDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  organizationType?: string;

  @IsOptional()
  @IsString()
  specialtyTag?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  radius?: number = 25;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number = 20;
}
```

**Step 2: Create response DTO**

File: `packages/api/src/resources/dto/organization-response.dto.ts`

```typescript
export class OrganizationDto {
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
  distance?: number; // Miles, only if lat/long provided
}

export class OrganizationDetailDto extends OrganizationDto {
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
  addedBy: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export class OrganizationListResponseDto {
  organizations: OrganizationDto[];
  total: number;
}
```

**Step 3: Update index**

File: `packages/api/src/resources/dto/index.ts`

Add exports:

```typescript
export * from './reading-list-query.dto';
export * from './add-to-reading-list.dto';
export * from './update-reading-list.dto';
export * from './reading-list-item.dto';
export * from './reading-list-response.dto';
export * from './organization-query.dto';
export * from './organization-response.dto';
```

**Step 4: Test DTOs compile**

Run: `cd packages/api && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/api/src/resources/dto/
git commit -m "feat(api): add Organizations DTOs

Creates DTOs for organizations directory with validation:
- Query DTO with location, type, specialty, distance filters
- Response DTOs for list and detail views
- Support for distance calculation

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 9: Create Organizations Service with Distance Calculation

**Files:**
- Create: `packages/api/src/resources/services/organizations.service.ts`
- Create: `packages/api/src/resources/services/organizations.service.spec.ts`
- Create: `packages/api/src/resources/utils/haversine.ts`

**Step 1: Create Haversine distance utility**

File: `packages/api/src/resources/utils/haversine.ts`

```typescript
/**
 * Calculate distance between two points using Haversine formula.
 * Returns distance in miles.
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in miles
 */
export function haversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 3959; // Earth radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
```

**Step 2: Write failing test for organizations service**

File: `packages/api/src/resources/services/organizations.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { OrganizationsService } from './organizations.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrisma = {
      externalOrganization: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrganizationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<OrganizationsService>(OrganizationsService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findOrganizations', () => {
    it('should return organizations without distance when no lat/long', async () => {
      const query = { city: 'Nashville' };

      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org',
          city: 'Nashville',
          recommendedBy: { id: 'rec-1', name: 'Recommender' },
        },
      ];

      prisma.externalOrganization.findMany.mockResolvedValue(mockOrgs as any);
      prisma.externalOrganization.count.mockResolvedValue(1);

      const result = await service.findOrganizations(query);

      expect(result.organizations).toHaveLength(1);
      expect(result.organizations[0].distance).toBeUndefined();
    });

    it('should calculate distance when lat/long provided', async () => {
      const query = {
        latitude: 36.1627, // Nashville
        longitude: -86.7816,
      };

      const mockOrgs = [
        {
          id: 'org-1',
          name: 'Test Org',
          latitude: 36.1627,
          longitude: -86.7816,
          recommendedBy: { id: 'rec-1', name: 'Recommender' },
        },
      ];

      prisma.externalOrganization.findMany.mockResolvedValue(mockOrgs as any);
      prisma.externalOrganization.count.mockResolvedValue(1);

      const result = await service.findOrganizations(query);

      expect(result.organizations[0].distance).toBeDefined();
      expect(result.organizations[0].distance).toBeCloseTo(0, 1); // Same location
    });

    it('should filter by organizationType', async () => {
      const query = { organizationType: 'church' };

      await service.findOrganizations(query);

      expect(prisma.externalOrganization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationTypes: { has: 'church' },
          }),
        }),
      );
    });
  });
});
```

**Step 3: Run test to verify it fails**

Run: `cd packages/api && npm test organizations.service.spec.ts`
Expected: FAIL with "OrganizationsService is not defined"

**Step 4: Create service implementation**

File: `packages/api/src/resources/services/organizations.service.ts`

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  OrganizationQueryDto,
  OrganizationListResponseDto,
  OrganizationDetailDto,
} from '../dto';
import { haversineDistance } from '../utils/haversine';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findOrganizations(
    query: OrganizationQueryDto,
  ): Promise<OrganizationListResponseDto> {
    this.logger.log(`Finding organizations with query: ${JSON.stringify(query)}`);

    const {
      city,
      state,
      organizationType,
      specialtyTag,
      search,
      latitude,
      longitude,
      radius = 25,
      skip = 0,
      take = 20,
    } = query;

    // Build where clause
    const where: any = {};

    if (city) {
      where.city = { contains: city, mode: 'insensitive' };
    }

    if (state) {
      where.state = { contains: state, mode: 'insensitive' };
    }

    if (organizationType) {
      where.organizationTypes = { has: organizationType };
    }

    if (specialtyTag) {
      where.specialtyTags = { has: specialtyTag };
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { organizationTypes: { has: search } },
        { specialtyTags: { has: search } },
      ];
    }

    // Determine sort order
    const orderBy = latitude && longitude ? undefined : { name: 'asc' };

    // Execute queries in parallel
    const [organizations, total] = await Promise.all([
      this.prisma.externalOrganization.findMany({
        where,
        include: {
          recommendedBy: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy,
      }),
      this.prisma.externalOrganization.count({ where }),
    ]);

    // Calculate distances and filter by radius if lat/long provided
    let orgDtos = organizations.map((org) => {
      const dto: any = {
        id: org.id,
        name: org.name,
        organizationTypes: org.organizationTypes,
        specialtyTags: org.specialtyTags,
        address: org.address,
        city: org.city,
        state: org.state,
        zipCode: org.zipCode,
        country: org.country,
        phone: org.phone,
        email: org.email,
        website: org.website,
        hours: org.hours,
        recommendationNote: org.recommendationNote,
        recommendedBy: org.recommendedBy,
      };

      // Calculate distance if coordinates provided
      if (
        latitude !== undefined &&
        longitude !== undefined &&
        org.latitude &&
        org.longitude
      ) {
        dto.distance = haversineDistance(
          latitude,
          longitude,
          org.latitude,
          org.longitude,
        );
      }

      return dto;
    });

    // Filter by radius if applicable
    if (latitude !== undefined && longitude !== undefined && radius) {
      orgDtos = orgDtos.filter(
        (org) => org.distance === undefined || org.distance <= radius,
      );
    }

    // Sort by distance if lat/long provided
    if (latitude !== undefined && longitude !== undefined) {
      orgDtos.sort((a, b) => {
        if (a.distance === undefined) return 1;
        if (b.distance === undefined) return -1;
        return a.distance - b.distance;
      });
    }

    // Apply pagination after filtering
    const paginatedOrgs = orgDtos.slice(skip, skip + take);

    return {
      organizations: paginatedOrgs,
      total: orgDtos.length,
    };
  }

  async findOrganizationById(id: string): Promise<OrganizationDetailDto> {
    this.logger.log(`Finding organization with ID: ${id}`);

    const org = await this.prisma.externalOrganization.findUnique({
      where: { id },
      include: {
        recommendedBy: {
          select: {
            id: true,
            name: true,
          },
        },
        addedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!org) {
      throw new NotFoundException(`Organization with ID ${id} not found`);
    }

    return {
      id: org.id,
      name: org.name,
      organizationTypes: org.organizationTypes,
      specialtyTags: org.specialtyTags,
      address: org.address,
      city: org.city,
      state: org.state,
      zipCode: org.zipCode,
      country: org.country,
      latitude: org.latitude,
      longitude: org.longitude,
      phone: org.phone,
      email: org.email,
      website: org.website,
      hours: org.hours,
      recommendationNote: org.recommendationNote,
      createdAt: org.createdAt.toISOString(),
      updatedAt: org.updatedAt.toISOString(),
      recommendedBy: org.recommendedBy,
      addedBy: org.addedBy,
    };
  }
}
```

**Step 5: Run test to verify it passes**

Run: `cd packages/api && npm test organizations.service.spec.ts`
Expected: PASS

**Step 6: Commit**

```bash
git add packages/api/src/resources/
git commit -m "feat(api): implement Organizations Service with distance calc

Implements Organizations Service with:
- Location filtering (city, state, lat/long/radius)
- Type and specialty filtering
- Search across name and tags
- Haversine distance calculation
- Smart sorting (distance or alphabetical)
- Full test coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 10: Wire Organizations Service to Controller

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts`
- Modify: `packages/api/src/resources/resources.module.ts`

**Step 1: Register service in module**

File: `packages/api/src/resources/resources.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ResourcesController } from './resources.controller';
import { ReadingListService } from './services/reading-list.service';
import { OrganizationsService } from './services/organizations.service';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ReadingListService, OrganizationsService],
  exports: [ReadingListService, OrganizationsService],
})
export class ResourcesModule {}
```

**Step 2: Add controller endpoints**

File: `packages/api/src/resources/resources.controller.ts`

Add to constructor:

```typescript
constructor(
  private readonly readingListService: ReadingListService,
  private readonly organizationsService: OrganizationsService,
) {}
```

Add imports:

```typescript
import {
  OrganizationQueryDto,
  OrganizationListResponseDto,
  OrganizationDetailDto,
} from './dto';
```

Add endpoints after reading list methods:

```typescript
/**
 * Browse external organizations with filtering.
 * GET /api/resources/organizations
 *
 * @param user - Authenticated user
 * @param query - Query parameters (location, type, specialty filters)
 * @returns Organizations matching filters
 */
@Get('organizations')
async getOrganizations(
  @CurrentUser() user: User,
  @Query() query: OrganizationQueryDto,
): Promise<OrganizationListResponseDto> {
  return this.organizationsService.findOrganizations(query);
}

/**
 * Get detailed information about a specific organization.
 * GET /api/resources/organizations/:id
 *
 * @param user - Authenticated user
 * @param id - Organization ID
 * @returns Organization details
 */
@Get('organizations/:id')
async getOrganizationById(
  @CurrentUser() user: User,
  @Param('id') id: string,
): Promise<OrganizationDetailDto> {
  return this.organizationsService.findOrganizationById(id);
}
```

**Step 3: Test endpoints manually**

Run: `cd packages/api && npm run build && npm run start:dev`

Test with curl:
```bash
# Get organizations
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/resources/organizations?city=Nashville"

# Get organization by ID
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  http://localhost:3000/api/resources/organizations/some-org-id
```

Expected: Endpoints respond correctly

**Step 4: Commit**

```bash
git add packages/api/src/resources/
git commit -m "feat(api): wire Organizations Service to controller

Adds controller endpoints for organizations directory:
- GET /api/resources/organizations (with filters)
- GET /api/resources/organizations/:id (detail view)

All endpoints require authentication.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 11: Create Recommendations DTOs

**Files:**
- Create: `packages/api/src/resources/dto/recommendations-query.dto.ts`
- Create: `packages/api/src/resources/dto/recommendations-response.dto.ts`
- Modify: `packages/api/src/resources/dto/index.ts`

**Step 1: Create query DTO**

File: `packages/api/src/resources/dto/recommendations-query.dto.ts`

```typescript
import { IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RecommendationsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  excludeInReadingList?: boolean = true;
}
```

**Step 2: Create response DTO**

File: `packages/api/src/resources/dto/recommendations-response.dto.ts`

```typescript
export class RecommendedBookDto {
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
  mentionCount: number;
  lastMentionedAt: string;
  contextSnippet: string | null;
}

export class RecommendationsResponseDto {
  recommendations: RecommendedBookDto[];
  total: number;
  message?: string;
}
```

**Step 3: Update index**

File: `packages/api/src/resources/dto/index.ts`

Add exports:

```typescript
export * from './recommendations-query.dto';
export * from './recommendations-response.dto';
```

**Step 4: Test DTOs compile**

Run: `cd packages/api && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add packages/api/src/resources/dto/
git commit -m "feat(api): add Recommendations DTOs

Creates DTOs for personalized recommendations:
- Query DTO with limit and exclude filters
- Response DTOs with book, mention count, context
- Support for empty state messaging

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 12: Create Recommendations Service

**Files:**
- Create: `packages/api/src/resources/services/recommendations.service.ts`
- Create: `packages/api/src/resources/services/recommendations.service.spec.ts`

**Step 1: Write failing test**

File: `packages/api/src/resources/services/recommendations.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from './recommendations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityCheckerService } from '../../book/services/visibility-checker.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;
  let prisma: jest.Mocked<PrismaService>;
  let visibilityChecker: jest.Mocked<VisibilityCheckerService>;

  beforeEach(async () => {
    const mockPrisma = {
      conversation: {
        findMany: jest.fn(),
      },
      conversationResourceMention: {
        findMany: jest.fn(),
      },
      userReadingList: {
        findMany: jest.fn(),
      },
    };

    const mockVisibilityChecker = {
      canUserAccessBook: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: VisibilityCheckerService,
          useValue: mockVisibilityChecker,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    prisma = module.get(PrismaService);
    visibilityChecker = module.get(VisibilityCheckerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return empty with message if no sessions', async () => {
      const userId = 'user-123';
      const query = {};

      prisma.conversation.findMany.mockResolvedValue([]);

      const result = await service.getRecommendations(userId, query);

      expect(result.recommendations).toHaveLength(0);
      expect(result.message).toBe(
        'No recommendations yet. Books mentioned in your counseling sessions will appear here.',
      );
    });

    it('should return recommendations sorted by mention count and recency', async () => {
      const userId = 'user-123';
      const query = {};

      const mockSessions = [
        { id: 'session-1', conversationId: 'conv-1' },
        { id: 'session-2', conversationId: 'conv-2' },
      ];

      const mockMentions = [
        {
          bookId: 'book-1',
          mentionedAt: new Date('2024-01-01'),
          contextSnippet: 'Context 1',
          book: {
            id: 'book-1',
            title: 'Book 1',
            author: 'Author 1',
            biblicalAlignmentScore: 90,
          },
        },
        {
          bookId: 'book-1',
          mentionedAt: new Date('2024-01-02'),
          contextSnippet: 'Context 2',
          book: null,
        },
        {
          bookId: 'book-2',
          mentionedAt: new Date('2024-01-03'),
          contextSnippet: 'Context 3',
          book: {
            id: 'book-2',
            title: 'Book 2',
            author: 'Author 2',
            biblicalAlignmentScore: 85,
          },
        },
      ];

      prisma.conversation.findMany.mockResolvedValue(mockSessions as any);
      prisma.conversationResourceMention.findMany.mockResolvedValue(
        mockMentions as any,
      );
      prisma.userReadingList.findMany.mockResolvedValue([]);
      visibilityChecker.canUserAccessBook.mockResolvedValue(true);

      const result = await service.getRecommendations(userId, query);

      expect(result.recommendations).toHaveLength(2);
      // Book 1 should be first (2 mentions)
      expect(result.recommendations[0].book.id).toBe('book-1');
      expect(result.recommendations[0].mentionCount).toBe(2);
      // Book 2 should be second (1 mention)
      expect(result.recommendations[1].book.id).toBe('book-2');
      expect(result.recommendations[1].mentionCount).toBe(1);
    });

    it('should exclude books in reading list when flag is true', async () => {
      const userId = 'user-123';
      const query = { excludeInReadingList: true };

      const mockSessions = [{ id: 'session-1', conversationId: 'conv-1' }];
      const mockMentions = [
        {
          bookId: 'book-1',
          book: { id: 'book-1', title: 'Book 1' },
        },
      ];
      const mockReadingList = [{ bookId: 'book-1' }];

      prisma.conversation.findMany.mockResolvedValue(mockSessions as any);
      prisma.conversationResourceMention.findMany.mockResolvedValue(
        mockMentions as any,
      );
      prisma.userReadingList.findMany.mockResolvedValue(mockReadingList as any);

      const result = await service.getRecommendations(userId, query);

      expect(result.recommendations).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/api && npm test recommendations.service.spec.ts`
Expected: FAIL with "RecommendationsService is not defined"

**Step 3: Create service implementation**

File: `packages/api/src/resources/services/recommendations.service.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VisibilityCheckerService } from '../../book/services/visibility-checker.service';
import {
  RecommendationsQueryDto,
  RecommendationsResponseDto,
} from '../dto';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly visibilityChecker: VisibilityCheckerService,
  ) {}

  async getRecommendations(
    userId: string,
    query: RecommendationsQueryDto,
  ): Promise<RecommendationsResponseDto> {
    this.logger.log(`Getting recommendations for user ${userId}`);

    const { limit = 10, excludeInReadingList = true } = query;

    // Step 1: Find user's counseling sessions
    const sessions = await this.prisma.conversation.findMany({
      where: { userId },
      select: { conversationId: true },
    });

    if (sessions.length === 0) {
      return {
        recommendations: [],
        total: 0,
        message:
          'No recommendations yet. Books mentioned in your counseling sessions will appear here.',
      };
    }

    const sessionIds = sessions.map((s) => s.conversationId);

    // Step 2: Find book mentions in sessions
    const mentions = await this.prisma.conversationResourceMention.findMany({
      where: {
        conversationId: { in: sessionIds },
        resourceType: 'book',
        bookId: { not: null },
      },
      include: {
        book: {
          select: {
            id: true,
            title: true,
            author: true,
            coverImageUrl: true,
            biblicalAlignmentScore: true,
            genreTag: true,
            description: true,
            matureContent: true,
          },
        },
      },
      orderBy: { mentionedAt: 'desc' },
    });

    if (mentions.length === 0) {
      return {
        recommendations: [],
        total: 0,
        message:
          'No recommendations yet. Books mentioned in your counseling sessions will appear here.',
      };
    }

    // Step 3: Group by bookId and aggregate
    const bookMap = new Map<
      string,
      {
        book: any;
        mentionCount: number;
        lastMentionedAt: Date;
        contextSnippet: string | null;
      }
    >();

    for (const mention of mentions) {
      if (!mention.book) continue;

      const existing = bookMap.get(mention.bookId!);
      if (existing) {
        existing.mentionCount++;
        if (mention.mentionedAt > existing.lastMentionedAt) {
          existing.lastMentionedAt = mention.mentionedAt;
          existing.contextSnippet = mention.contextSnippet;
        }
      } else {
        bookMap.set(mention.bookId!, {
          book: mention.book,
          mentionCount: 1,
          lastMentionedAt: mention.mentionedAt,
          contextSnippet: mention.contextSnippet,
        });
      }
    }

    // Step 4: Filter by visibility
    const visibleBooks: any[] = [];
    for (const [bookId, data] of bookMap.entries()) {
      const canAccess = await this.visibilityChecker.canUserAccessBook(
        userId,
        data.book,
      );
      if (canAccess) {
        visibleBooks.push(data);
      }
    }

    // Step 5: Exclude books in reading list if flag set
    let filteredBooks = visibleBooks;
    if (excludeInReadingList) {
      const readingList = await this.prisma.userReadingList.findMany({
        where: { userId },
        select: { bookId: true },
      });
      const readingListBookIds = new Set(readingList.map((r) => r.bookId));
      filteredBooks = visibleBooks.filter(
        (b) => !readingListBookIds.has(b.book.id),
      );
    }

    // Step 6: Sort by mention count DESC, then lastMentionedAt DESC
    filteredBooks.sort((a, b) => {
      if (a.mentionCount !== b.mentionCount) {
        return b.mentionCount - a.mentionCount;
      }
      return b.lastMentionedAt.getTime() - a.lastMentionedAt.getTime();
    });

    // Step 7: Apply limit
    const limitedBooks = filteredBooks.slice(0, limit);

    // Step 8: Transform to DTOs
    const recommendations = limitedBooks.map((data) => ({
      book: data.book,
      mentionCount: data.mentionCount,
      lastMentionedAt: data.lastMentionedAt.toISOString(),
      contextSnippet: data.contextSnippet,
    }));

    return {
      recommendations,
      total: recommendations.length,
    };
  }
}
```

**Step 4: Run test to verify it passes**

Run: `cd packages/api && npm test recommendations.service.spec.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add packages/api/src/resources/services/
git commit -m "feat(api): implement Recommendations Service

Implements session-based recommendations with:
- Query ConversationResourceMention for user sessions
- Group by book, count mentions, track recency
- Apply visibility rules via VisibilityCheckerService
- Exclude books already in reading list (optional)
- Sort by mention count and recency
- Empty state for users without sessions
- Full test coverage

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 13: Wire Recommendations Service to Controller and Module

**Files:**
- Modify: `packages/api/src/resources/resources.controller.ts`
- Modify: `packages/api/src/resources/resources.module.ts`

**Step 1: Import BookModule in ResourcesModule**

File: `packages/api/src/resources/resources.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookModule } from '../book/book.module';
import { ResourcesController } from './resources.controller';
import { ReadingListService } from './services/reading-list.service';
import { OrganizationsService } from './services/organizations.service';
import { RecommendationsService } from './services/recommendations.service';

@Module({
  imports: [PrismaModule, BookModule], // Add BookModule for VisibilityCheckerService
  controllers: [ResourcesController],
  providers: [
    ReadingListService,
    OrganizationsService,
    RecommendationsService,
  ],
  exports: [
    ReadingListService,
    OrganizationsService,
    RecommendationsService,
  ],
})
export class ResourcesModule {}
```

**Step 2: Add controller endpoints**

File: `packages/api/src/resources/resources.controller.ts`

Add to constructor:

```typescript
constructor(
  private readonly readingListService: ReadingListService,
  private readonly organizationsService: OrganizationsService,
  private readonly recommendationsService: RecommendationsService,
) {}
```

Add imports:

```typescript
import {
  RecommendationsQueryDto,
  RecommendationsResponseDto,
} from './dto';
```

Add endpoint after organizations methods:

```typescript
/**
 * Get personalized book recommendations from counseling sessions.
 * GET /api/resources/recommendations
 *
 * @param user - Authenticated user
 * @param query - Query parameters (limit, exclude filters)
 * @returns Recommended books based on session mentions
 */
@Get('recommendations')
async getRecommendations(
  @CurrentUser() user: User,
  @Query() query: RecommendationsQueryDto,
): Promise<RecommendationsResponseDto> {
  return this.recommendationsService.getRecommendations(user.id, query);
}
```

**Step 3: Test endpoints manually**

Run: `cd packages/api && npm run build && npm run start:dev`

Test with curl:
```bash
# Get recommendations
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  "http://localhost:3000/api/resources/recommendations?limit=5"
```

Expected: Endpoints respond correctly

**Step 4: Commit**

```bash
git add packages/api/src/resources/
git commit -m "feat(api): wire Recommendations Service to controller

Adds controller endpoint for personalized recommendations:
- GET /api/resources/recommendations (with limit and exclude filters)

Imports BookModule to access VisibilityCheckerService.
All endpoints require authentication.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 14: Integration Testing

**Files:**
- Create: `packages/api/src/resources/resources.e2e.spec.ts`

**Step 1: Create E2E tests**

File: `packages/api/src/resources/resources.e2e.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../app/app.module';
import { PrismaService } from '../prisma/prisma.service';

describe('Resources API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;
  let userId: string;
  let bookId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Setup: Create test user and book
    const user = await prisma.user.create({
      data: {
        email: 'test-resources@example.com',
        password: 'hashed-password',
        emailVerified: true,
      },
    });
    userId = user.id;

    const book = await prisma.book.create({
      data: {
        title: 'Test Book',
        author: 'Test Author',
        genreTag: 'theology',
        biblicalAlignmentScore: 90,
        evaluationVersion: '1.0',
        aiModel: 'test',
        submittedByOrganizationId: 'org-id',
      },
    });
    bookId = book.id;

    // Get auth token (mock - replace with actual auth flow in real tests)
    authToken = 'mock-jwt-token';
  });

  afterAll(async () => {
    // Cleanup
    await prisma.userReadingList.deleteMany({
      where: { userId },
    });
    await prisma.book.deleteMany({
      where: { id: bookId },
    });
    await prisma.user.deleteMany({
      where: { id: userId },
    });
    await app.close();
  });

  describe('/api/resources/reading-list (GET)', () => {
    it('should return empty reading list initially', () => {
      return request(app.getHttpServer())
        .get('/api/resources/reading-list')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.items).toEqual([]);
          expect(res.body.total).toBe(0);
        });
    });

    it('should require authentication', () => {
      return request(app.getHttpServer())
        .get('/api/resources/reading-list')
        .expect(401);
    });
  });

  describe('/api/resources/reading-list (POST)', () => {
    it('should add book to reading list', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/resources/reading-list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          status: 'want_to_read',
        })
        .expect(201);

      expect(response.body.bookId).toBe(bookId);
      expect(response.body.status).toBe('want_to_read');
    });

    it('should return 409 if book already in reading list', () => {
      return request(app.getHttpServer())
        .post('/api/resources/reading-list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          status: 'want_to_read',
        })
        .expect(409);
    });

    it('should validate DTO fields', () => {
      return request(app.getHttpServer())
        .post('/api/resources/reading-list')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          bookId,
          rating: 10, // Invalid rating (max 5)
        })
        .expect(400);
    });
  });

  describe('/api/resources/organizations (GET)', () => {
    it('should return organizations list', () => {
      return request(app.getHttpServer())
        .get('/api/resources/organizations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('organizations');
          expect(res.body).toHaveProperty('total');
        });
    });

    it('should filter by city', () => {
      return request(app.getHttpServer())
        .get('/api/resources/organizations?city=Nashville')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });

  describe('/api/resources/recommendations (GET)', () => {
    it('should return recommendations or empty message', () => {
      return request(app.getHttpServer())
        .get('/api/resources/recommendations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('recommendations');
          expect(res.body).toHaveProperty('total');
        });
    });

    it('should respect limit parameter', () => {
      return request(app.getHttpServer())
        .get('/api/resources/recommendations?limit=5')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.recommendations.length).toBeLessThanOrEqual(5);
        });
    });
  });
});
```

**Step 2: Run E2E tests**

Run: `cd packages/api && npm run test:e2e resources.e2e.spec.ts`
Expected: Tests pass (or skip if auth not fully mocked)

**Step 3: Commit**

```bash
git add packages/api/src/resources/
git commit -m "test(api): add E2E tests for Resources APIs

Adds integration tests for:
- Reading list CRUD operations
- Organizations directory filtering
- Recommendations generation
- Authentication requirements
- DTO validation

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Task 15: Update Frontend API Client

**Files:**
- Modify: `packages/web/src/lib/api.ts`

**Step 1: Add resources API methods**

File: `packages/web/src/lib/api.ts`

Add after existing book methods:

```typescript
// Reading List API
export const readingListApi = {
  list: (status?: string) => {
    const params = status && status !== 'all' ? `?status=${status}` : '';
    return apiFetch(`/resources/reading-list${params}`, { method: 'GET' });
  },

  add: (bookId: string, data?: any) =>
    apiFetch('/resources/reading-list', {
      method: 'POST',
      body: JSON.stringify({ bookId, ...data }),
    }),

  update: (id: string, data: any) =>
    apiFetch(`/resources/reading-list/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  remove: (id: string) =>
    apiFetch(`/resources/reading-list/${id}`, { method: 'DELETE' }),
};

// Organizations API
export const organizationsApi = {
  list: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiFetch(`/resources/organizations${query}`, { method: 'GET' });
  },

  getById: (id: string) =>
    apiFetch(`/resources/organizations/${id}`, { method: 'GET' }),
};

// Recommendations API
export const recommendationsApi = {
  get: (params?: any) => {
    const query = params ? `?${new URLSearchParams(params).toString()}` : '';
    return apiFetch(`/resources/recommendations${query}`, { method: 'GET' });
  },
};
```

**Step 2: Test API client compiles**

Run: `cd packages/web && npm run build`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add packages/web/src/lib/api.ts
git commit -m "feat(web): add Resources API client methods

Adds client methods for:
- Reading list CRUD (list, add, update, remove)
- Organizations directory (list, getById)
- Recommendations (get)

All methods use apiFetch with proper auth headers.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Final Steps

**Step 1: Run full test suite**

Run: `cd packages/api && npm test`
Expected: All tests pass

**Step 2: Test all endpoints manually**

Use Postman or curl to test:
- GET /api/resources/reading-list
- POST /api/resources/reading-list
- PATCH /api/resources/reading-list/:id
- DELETE /api/resources/reading-list/:id
- GET /api/resources/organizations
- GET /api/resources/organizations/:id
- GET /api/resources/recommendations

**Step 3: Update documentation**

Create summary document showing all endpoints work.

**Step 4: Final commit**

```bash
git add .
git commit -m "feat(api): complete Backend Resources APIs implementation

Implements 3 backend APIs for book resources UI:

1. Reading List API (/api/resources/reading-list)
   - Full CRUD with smart status transitions
   - Auto-date setting and manual overrides
   - Progress tracking with auto-completion at 100%

2. Organizations Directory API (/api/resources/organizations)
   - Location-based filtering (city, state, lat/long/radius)
   - Type and specialty filtering
   - Haversine distance calculation

3. Recommendations API (/api/resources/recommendations)
   - Session-based personalized recommendations
   - Mention count and recency ranking
   - Visibility rules enforcement

All APIs require authentication, include full test coverage,
and follow existing NestJS patterns from book module.

🤖 Generated with Claude Code

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>"
```

---

## Success Criteria

- ✅ All 3 APIs implemented and tested
- ✅ Reading list supports all statuses with smart transitions
- ✅ Progress tracking auto-completes at 100%
- ✅ Organizations can be filtered by location, type, specialty
- ✅ Distance calculation accurate using Haversine formula
- ✅ Recommendations based on counseling session mentions
- ✅ All endpoints require authentication
- ✅ Full test coverage (unit + integration)
- ✅ Frontend API client methods added
- ✅ No database migrations needed (uses existing models)

---

## Notes

- All services follow existing patterns from `book.module.ts`
- DTOs use class-validator for validation
- Services use PrismaService for database access
- Controllers use JwtAuthGuard for authentication
- Tests use Jest with mocked dependencies
- Haversine formula provides accurate distance calculations
- VisibilityCheckerService ensures book visibility rules are respected
- Reading list state machine handles complex status transitions
