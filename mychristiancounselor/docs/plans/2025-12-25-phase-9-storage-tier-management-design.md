# Phase 9: Storage Tier Management Design

**Date:** 2025-12-25
**Status:** Approved for Implementation
**Part of:** Biblical Resources System

## Executive Summary

Implement automated PDF storage lifecycle management with intelligent tier placement based on biblical alignment scores. Viewable books (≥70% aligned) remain in S3 Standard for instant access, while non-viewable books (<70%) archive to S3 Glacier for cost savings.

## Problem Statement

Currently (Phase 8), PDFs are stored temporarily on disk (`uploads/temp/pdfs/`). This creates several issues:
- No persistent storage for evaluation or user access
- No cost-optimized storage tiers
- No cleanup strategy for temporary files
- Re-evaluation requires re-upload

Phase 9 implements the complete S3-based storage tier system with intelligent lifecycle management.

## Goals

### Primary Goals
1. Migrate PDFs from temp storage to S3 active tier (Standard) for evaluation
2. Archive non-viewable books (<70%) to S3 Glacier for cost savings
3. Keep viewable books (≥70%) in S3 Standard for instant user access
4. Implement PDF upload validation (hash + publication date) to prevent gaming
5. Clean up temporary files after successful S3 migration

### Secondary Goals
1. Handle Glacier restore for re-evaluation scenarios
2. Implement retry logic for failed migrations
3. Audit and cleanup orphaned files
4. Track storage locations in database

## Design Principles

1. **User Experience Over Cost** - Viewable books stay in S3 Standard for instant access
2. **Cost Optimization for Hidden Content** - Non-viewable books archive to Glacier
3. **No Gaming the System** - Hash and date validation prevents manipulation
4. **Resilience** - Retry logic and fallbacks for all operations
5. **Clean Separation** - Background jobs handle migrations, not user-facing endpoints

## Architecture

### PDF Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. UPLOAD (Phase 8 - existing)                                  │
│    POST /api/books/:id/pdf                                      │
│    ↓                                                             │
│    Validation: Hash check, date comparison (if replacing)       │
│    ↓                                                             │
│    Store to temp: uploads/temp/pdfs/{bookId}-{timestamp}.pdf    │
│    ↓                                                             │
│    DB: pdfFilePath, pdfFileHash, pdfMetadataYear, pdfFileSize  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. MIGRATION TO ACTIVE TIER (Phase 9 - new)                    │
│    Background job: migrate-to-active                            │
│    ↓                                                             │
│    Read from temp → Upload to S3 Standard                       │
│    ↓                                                             │
│    s3://bucket/active/books/{bookId}.pdf                        │
│    ↓                                                             │
│    DB: pdfStorageTier='active', pdfStoragePath='s3://...'      │
│    ↓                                                             │
│    Delete temp file                                             │
│    ↓                                                             │
│    Retry 3x on failure                                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. EVALUATION (Phase 7 - existing)                             │
│    AI analyzes PDF from S3 active tier                          │
│    ↓                                                             │
│    Generate biblical alignment score (0-100)                    │
│    ↓                                                             │
│    Update Book with evaluation results                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
┌───────────────────▼──────────┐ ┌─────▼─────────────────────────┐
│ 4a. VIEWABLE (≥70%)          │ │ 4b. NOT ALIGNED (<70%)        │
│     Tiers 2 & 3              │ │     Tier 1                    │
│     ↓                        │ │     ↓                         │
│     STAY in S3 Standard      │ │     MIGRATE to S3 Glacier     │
│     ↓                        │ │     ↓                         │
│     Instant user access ✅   │ │     Background job:           │
│     ↓                        │ │     migrate-to-archived       │
│     pdfStorageTier='active'  │ │     ↓                         │
│                              │ │     s3://bucket/archived/     │
│                              │ │     books/{bookId}.pdf        │
│                              │ │     ↓                         │
│                              │ │     pdfStorageTier='archived' │
│                              │ │     ↓                         │
│                              │ │     Hidden from users         │
│                              │ │     ↓                         │
│                              │ │     Available for re-eval     │
│                              │ │     (3-5 hour Glacier restore)│
└──────────────────────────────┘ └───────────────────────────────┘
```

### Decision Logic: Storage Tier Placement

```typescript
// After evaluation completes
if (biblicalAlignmentScore >= 70) {
  // Conceptually Aligned (70-89%) or Globally Aligned (≥90%)
  // STAY in active tier - users can access
  pdfStorageTier = 'active'
  // Cost: ~$0.023/GB/month
  // Benefit: Instant access, no Glacier delays
} else {
  // Not Aligned (<70%)
  // MOVE to archived tier - hidden from users
  await migratePdfToArchivedTier(bookId)
  pdfStorageTier = 'archived'
  // Cost: ~$0.004/GB/month (5.75x cheaper)
  // Benefit: Cost savings, still available for re-evaluation
}
```

### PDF Upload Validation (Prevents Gaming)

**Scenario: Book already has an evaluated PDF, user uploads new PDF**

```typescript
// Step 1: File Hash Check (fast rejection)
const newHash = calculateSHA256(newPdfBuffer)
if (newHash === existingBook.pdfFileHash) {
  throw new BadRequestException('This PDF is identical to the existing file')
}

// Step 2: Extract Publication Metadata
const newMetadata = extractPdfMetadata(newPdfBuffer)
const newYear = newMetadata.year // From PDF /CreationDate or /ModDate

// Step 3: Decision Matrix
const existingYear = existingBook.pdfMetadataYear

if (!existingYear && !newYear) {
  // Both have no date - hash should have caught this
  throw new BadRequestException('Cannot determine publication year')
}

if (!existingYear && newYear) {
  // New has date, existing doesn't - accept dated version
  return ACCEPT
}

if (existingYear && !newYear) {
  // Existing has date, new doesn't - keep dated version
  throw new BadRequestException('Cannot replace dated PDF with undated PDF')
}

if (existingYear && newYear) {
  if (newYear > existingYear) {
    // Newer edition - accept and re-evaluate
    return ACCEPT
  } else {
    // Same or older edition - reject
    throw new BadRequestException(
      `Only newer editions can replace existing PDFs (uploaded: ${newYear}, current: ${existingYear})`
    )
  }
}
```

**First PDF Upload:**
- Skip all validation (no hash, no date comparison)
- Always queue evaluation

## Components

### New Services

#### 1. StorageOrchestratorService
**Location:** `packages/api/src/book/services/storage-orchestrator.service.ts`

**Responsibilities:**
- Orchestrate PDF storage lifecycle
- Coordinate between file system, S3, and database
- Handle validation and metadata extraction

**Methods:**
```typescript
class StorageOrchestratorService {
  // Migrate temp → S3 active
  async migratePdfToActiveTier(bookId: string): Promise<void>

  // Migrate S3 active → S3 archived (Glacier)
  async migratePdfToArchivedTier(bookId: string): Promise<void>

  // Retrieve PDF from current tier (handles Glacier restore)
  async retrievePdf(bookId: string): Promise<Buffer>

  // Extract SHA-256 hash and publication year from PDF
  async extractPdfMetadata(buffer: Buffer): Promise<{ hash: string; year?: number }>

  // Validate new PDF upload (hash + date comparison)
  async validatePdfUpload(bookId: string, newPdf: Buffer): Promise<void>
}
```

**Dependencies:**
- `S3StorageProvider` - S3 operations
- `PrismaService` - Database updates
- `fs.promises` - File system operations

#### 2. PdfMigrationProcessor
**Location:** `packages/api/src/book/processors/pdf-migration.processor.ts`

**Responsibilities:**
- Process background jobs for PDF migrations
- Handle retries and error notifications

**Job Types:**
```typescript
// Job 1: Migrate temp → S3 active (queued after upload)
@Process('migrate-to-active')
async handleMigrateToActive(job: Job<{ bookId: string }>) {
  await this.storageOrchestrator.migratePdfToActiveTier(job.data.bookId)
}

// Job 2: Migrate S3 active → S3 archived (queued after evaluation if <70%)
@Process('migrate-to-archived')
async handleMigrateToArchived(job: Job<{ bookId: string }>) {
  await this.storageOrchestrator.migratePdfToArchivedTier(job.data.bookId)
}
```

**Queue Configuration:**
```typescript
{
  name: 'pdf-migration',
  concurrency: 3, // Process 3 migrations concurrently
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 1000, // 1s, 2s, 4s
  }
}
```

### Enhanced Existing Services

#### BookOrchestratorService.uploadPdf()
**Changes:**
```typescript
async uploadPdf(...) {
  // NEW: Validate if replacing existing PDF
  if (existingBook.pdfFileHash) {
    await this.storageOrchestrator.validatePdfUpload(bookId, file.buffer)
  }

  // NEW: Extract metadata
  const metadata = await this.storageOrchestrator.extractPdfMetadata(file.buffer)

  // Existing: Save to temp
  await fs.writeFile(filePath, file.buffer)

  // Existing: Update database
  await this.prisma.book.update({
    data: {
      pdfFilePath,
      pdfFileSize,
      pdfUploadedAt: new Date(),
      pdfFileHash: metadata.hash, // NEW
      pdfMetadataYear: metadata.year, // NEW
    }
  })

  // NEW: Queue migration to active tier (high priority)
  await this.pdfMigrationQueue.add('migrate-to-active', { bookId }, { priority: 1 })
}
```

#### BookEvaluationProcessor (after evaluation)
**Changes:**
```typescript
async handleEvaluateBook(job: Job) {
  // Existing: Perform evaluation
  const score = await this.aiEvaluator.evaluate(...)

  // Existing: Update book
  await this.prisma.book.update({
    data: {
      biblicalAlignmentScore: score,
      evaluationStatus: 'completed',
      // ... other fields
    }
  })

  // NEW: Conditional archival based on score
  if (score < 70) {
    // Not aligned - move to Glacier
    await this.pdfMigrationQueue.add('migrate-to-archived', { bookId }, { priority: 2 })
  }
  // If score >= 70: Do nothing, stays in active tier
}
```

## Database Schema

### New Fields for Book Model

```prisma
model Book {
  // ... existing fields

  // PDF Storage
  pdfFilePath       String?         // Temp disk path (nullable after migration)
  pdfStoragePath    String?         // S3 path: s3://bucket/active/books/{id}.pdf
  pdfStorageTier    PdfStorageTier? // active | archived
  pdfFileSize       Int?            // File size in bytes
  pdfUploadedAt     DateTime?       // Upload timestamp
  pdfLicenseType    PdfLicenseType? // License enum

  // NEW: Validation & Metadata
  pdfFileHash       String?         // SHA-256 hash for duplicate detection
  pdfMetadataYear   Int?            // Year extracted from PDF metadata
}

enum PdfStorageTier {
  active    // S3 Standard - instant access
  archived  // S3 Glacier - 3-5 hour restore
}
```

**Migration Required:**
```sql
-- Add new fields
ALTER TABLE "Book" ADD COLUMN "pdfFileHash" TEXT;
ALTER TABLE "Book" ADD COLUMN "pdfMetadataYear" INTEGER;
```

## Error Handling

### Migration Failures

#### Temp → Active Tier Failure
**Scenario:** S3 upload fails (network, credentials, bucket doesn't exist)

**Handling:**
1. Retry 3 times with exponential backoff (1s, 2s, 4s)
2. If all retries fail:
   - Log error with full context
   - Email platform admin with details
   - Keep temp file on disk (don't delete)
   - Evaluation can fallback to temp file
3. Manual retry via admin dashboard or CLI command

#### Active → Archived Tier Failure
**Scenario:** Glacier upload or copy fails

**Handling:**
1. Retry 3 times with exponential backoff
2. If all retries fail:
   - Log error but don't block
   - PDF stays in active tier (higher cost but accessible)
   - Daily scheduled job catches missed archives
3. No impact on user experience (book already evaluated)

### Glacier Restore for Re-evaluation

**Scenario:** Need to re-evaluate archived book (algorithm update)

**Handling:**
```typescript
async retrievePdf(bookId: string): Promise<Buffer> {
  const book = await this.prisma.book.findUnique({ where: { id: bookId } })

  if (book.pdfStorageTier === 'archived') {
    // Check if restore is already in progress
    const restoreStatus = await this.s3.checkRestoreStatus(book.pdfStoragePath)

    if (restoreStatus === 'not_initiated') {
      // Initiate Glacier restore (3-5 hours for Standard tier)
      await this.s3.initiateRestore(book.pdfStoragePath, {
        tier: 'Standard', // Free, 3-5 hours
        days: 7, // Keep in Standard for 7 days
      })
      throw new PdfRestoreInProgressException('PDF restore initiated, try again in 3-5 hours')
    }

    if (restoreStatus === 'in_progress') {
      throw new PdfRestoreInProgressException('PDF restore in progress, try again later')
    }

    // restoreStatus === 'completed' - fetch from S3
  }

  return await this.s3.download(book.pdfStoragePath)
}
```

**Alternative:** Use S3 Glacier Instant Retrieval class (higher cost, instant access)

### Cleanup & Orphaned Files

#### Temp Files Without S3 Upload
**Scenario:** Migration failed and never recovered

**Handling:**
- Daily cleanup job: Delete temp files >7 days old where `pdfStorageTier IS NULL`
- Prevents disk bloat
- Logs deleted files for audit

```typescript
@Cron('0 2 * * *') // 2 AM daily
async cleanupOrphanedTempFiles() {
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - 7)

  const files = await fs.readdir('uploads/temp/pdfs/')

  for (const file of files) {
    const stats = await fs.stat(`uploads/temp/pdfs/${file}`)
    if (stats.mtime < cutoffDate) {
      const bookId = extractBookIdFromFilename(file)
      const book = await this.prisma.book.findUnique({ where: { id: bookId } })

      if (!book.pdfStorageTier) {
        // No S3 migration - safe to delete
        await fs.unlink(`uploads/temp/pdfs/${file}`)
        this.logger.warn(`Deleted orphaned temp file: ${file}`)
      }
    }
  }
}
```

#### S3 Files Without Database Records
**Scenario:** Database record deleted but S3 file remains

**Handling:**
- Monthly audit job: List S3 files, check if Book record exists
- Log orphans for manual review (don't auto-delete - could be race condition)
- Platform admin reviews and decides

## Configuration

### Environment Variables

```bash
# AWS S3 Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-key-here
AWS_SECRET_ACCESS_KEY=your-secret-here
S3_BUCKET=mychristiancounselor-active

# Optional: Separate buckets for active/archived
S3_ACTIVE_BUCKET=mychristiancounselor-active
S3_ARCHIVED_BUCKET=mychristiancounselor-archived

# Storage Provider (future: azure, gcs)
STORAGE_PROVIDER=s3

# Glacier Restore Configuration
GLACIER_RESTORE_TIER=Standard  # Standard (3-5hrs), Expedited (1-5min, expensive)
GLACIER_RESTORE_DAYS=7         # How long restored file stays in S3 Standard

# Cleanup Configuration
TEMP_FILE_RETENTION_DAYS=7           # Delete temp files older than this
PDF_MIGRATION_RETRY_ATTEMPTS=3       # Number of retries for failed migrations
```

### Queue Configuration

**New Queue:** `pdf-migration`

```typescript
// packages/api/src/config/queue.config.ts
export const queueConfig = {
  // ... existing queues (evaluationQueue)

  pdfMigrationQueue: {
    name: 'pdf-migration',
    concurrency: 3, // Process 3 migrations concurrently
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // 1s, 2s, 4s
    },
    removeOnComplete: {
      age: 86400, // Keep completed jobs for 24 hours
      count: 1000,
    },
    removeOnFail: {
      age: 604800, // Keep failed jobs for 7 days
      count: 500,
    },
  },
}
```

## Cost Analysis

### Assumptions
- Average book PDF: 10MB
- Expected distribution: 70% viewable (≥70%), 30% not aligned (<70%)
- 1000 books uploaded per year

### Annual Costs

**Viewable Books (≥70% - Stay in S3 Standard):**
- 700 books × 10MB = 7GB
- S3 Standard: $0.023/GB/month
- Cost: 7GB × $0.023 = **$0.16/month** = **$1.92/year**
- Benefit: Instant user access, no Glacier delays

**Non-Viewable Books (<70% - Move to S3 Glacier):**
- 300 books × 10MB = 3GB
- S3 Glacier: $0.004/GB/month
- Cost: 3GB × $0.004 = **$0.01/month** = **$0.12/year**
- If stayed in Standard: 3GB × $0.023 = $0.07/month = $0.84/year
- **Savings: $0.72/year per 3GB**

**Total Annual Storage Cost:**
- Active tier: $1.92/year
- Archived tier: $0.12/year
- **Total: $2.04/year for 10GB (1000 books)**

**Retrieval Costs (Glacier Standard - Free):**
- Algorithm updates: ~2x per year
- Re-evaluate 300 archived books
- Standard tier retrieval: Free
- Only pay for storage during 7-day restore period

### Cost Optimization Impact
- **Without intelligent tiering:** 10GB × $0.023/month = $2.76/year
- **With intelligent tiering:** $2.04/year
- **Savings: $0.72/year** (26% reduction)
- **UX benefit:** 70% of books have instant access

## Testing Strategy

### Unit Tests

**StorageOrchestratorService:**
- ✅ `migratePdfToActiveTier()` success: Temp deleted, DB updated
- ✅ `migratePdfToActiveTier()` S3 failure: Temp preserved, retries attempted
- ✅ `migratePdfToArchivedTier()` success: Active→Archived, DB updated
- ✅ `migratePdfToArchivedTier()` failure: Stays active, logged for retry
- ✅ `retrievePdf()` from active tier
- ✅ `retrievePdf()` from archived tier (Glacier restore)
- ✅ `extractPdfMetadata()` with valid PDF
- ✅ `extractPdfMetadata()` with invalid PDF
- ✅ `validatePdfUpload()` - all scenarios (hash match, date comparisons)

**PdfMigrationProcessor:**
- ✅ Job handler: migrate-to-active success
- ✅ Job handler: migrate-to-active failure with retries
- ✅ Job handler: migrate-to-archived success
- ✅ Error notifications sent on failure

**BookOrchestratorService.uploadPdf() validation:**
- ✅ No existing PDF: Accept without validation
- ✅ Hash match: Reject with proper message
- ✅ Both PDFs no date: Reject
- ✅ New has date, existing doesn't: Accept
- ✅ Existing has date, new doesn't: Reject
- ✅ Both have dates, new > existing: Accept and queue re-evaluation
- ✅ Both have dates, new ≤ existing: Reject

### Integration Tests

**End-to-End PDF Flow:**
1. Upload PDF → verify temp storage
2. Wait for migration job → verify S3 active tier
3. Trigger evaluation → verify PDF accessible from S3
4. Evaluation completes with score ≥70 → verify stays in active
5. Evaluation completes with score <70 → verify moves to archived
6. Verify temp file cleaned up

**S3 Operations (with localstack):**
- ✅ Upload to S3 active tier
- ✅ Move from active to archived tier
- ✅ Download from archived tier
- ✅ Glacier restore initiation
- ✅ Delete operations

### Manual Testing Checklist

- [ ] Real S3 bucket uploads (staging environment)
- [ ] Large PDF files (>50MB, up to 100MB limit)
- [ ] Glacier retrieval with real Glacier (3-5 hour wait)
- [ ] Concurrent uploads (race conditions)
- [ ] Network interruption during upload
- [ ] PDF replacement flow (upload newer edition)
- [ ] PDF replacement rejection (same/older edition)
- [ ] Hash duplicate detection

## Implementation Phases

### Phase 9.1: Core Migration (Week 1-2)
- Create StorageOrchestratorService
- Implement PDF metadata extraction (hash, year)
- Implement migratePdfToActiveTier()
- Create PdfMigrationProcessor and queue
- Add migration job to BookOrchestratorService.uploadPdf()
- Database migration for new fields
- Unit tests for migration logic

### Phase 9.2: Conditional Archival (Week 2-3)
- Implement migratePdfToArchivedTier()
- Add conditional logic to BookEvaluationProcessor
- Implement score-based archival decision
- Unit tests for archival logic
- Integration tests for end-to-end flow

### Phase 9.3: Upload Validation (Week 3-4)
- Implement PDF upload validation logic
- Add hash comparison
- Add publication date comparison
- Update BookOrchestratorService.uploadPdf()
- Unit tests for all validation scenarios
- API tests for rejection messages

### Phase 9.4: Glacier & Cleanup (Week 4-5)
- Implement retrievePdf() with Glacier restore
- Implement temp file cleanup job
- Implement S3 audit job
- Error handling and retry logic
- Alert notifications
- End-to-end testing with real S3

### Phase 9.5: Testing & Polish (Week 5-6)
- Integration testing on staging
- Performance testing (concurrent uploads)
- Cost monitoring setup
- Documentation updates
- Production deployment
- Monitoring and alerts

## Security Considerations

**AWS Credentials:**
- Use IAM roles with least privilege
- S3 bucket policies restrict access
- Encrypt at rest (S3 default encryption)
- Encrypt in transit (TLS/HTTPS)

**PDF Validation:**
- Hash verification prevents file tampering
- Date extraction prevents gaming scores
- File size limits (100MB) prevent abuse
- PDF magic number validation (Phase 8)

**Access Control:**
- Only org admins from submitting org can upload PDFs
- Platform admins can view all evaluations
- Users can only access PDFs for books they can view (≥70% if member)

## Monitoring & Alerts

**Metrics to Track:**
- Migration success/failure rates
- Average migration time (temp → active, active → archived)
- Storage costs (active tier GB, archived tier GB)
- Glacier restore requests
- Temp file cleanup counts
- Orphaned file counts

**Alerts:**
- Migration failures exceed 10% in 1 hour → Email platform admin
- Temp disk usage >80% → Alert to clean up or expand disk
- S3 costs exceed budget → Review archival strategy
- Glacier restore failures → Investigate bucket/permissions

## Future Enhancements

**Phase 10+:**
- Multi-region S3 replication for disaster recovery
- CloudFront CDN for PDF delivery (faster downloads)
- PDF compression before upload (reduce storage costs)
- S3 Intelligent-Tiering (automatic cost optimization)
- Azure Blob Storage / Google Cloud Storage support
- PDF watermarking for copyrighted content
- PDF preview/thumbnail generation

---

## Appendix: Storage Tier Decision Matrix

| Alignment Score | Visibility Tier | Storage Tier | Cost/GB/Month | Access Speed | Use Case |
|-----------------|-----------------|--------------|---------------|--------------|----------|
| <70% | Not Aligned (Hidden) | S3 Glacier | $0.004 | 3-5 hours | Future re-evaluation only |
| 70-89% | Conceptually Aligned (Org-only) | S3 Standard | $0.023 | Instant | Org member access |
| ≥90% | Globally Aligned (Public) | S3 Standard | $0.023 | Instant | All user access |

**Key Insight:** Storage tier is based on visibility/accessibility, not just score. Users need instant access to books they can view.
