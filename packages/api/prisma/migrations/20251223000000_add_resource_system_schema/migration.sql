-- AddResourceSystemModels
-- This migration adds the resource system models for books, external organizations, and related features.
-- The schema was applied using prisma db push, this migration file documents the changes.

-- CreateTable
CREATE TABLE IF NOT EXISTS "Book" (
    "id" TEXT NOT NULL,
    "isbn" TEXT,
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "publisher" TEXT,
    "publicationYear" INTEGER,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "evaluationStatus" TEXT NOT NULL DEFAULT 'pending',
    "biblicalAlignmentScore" INTEGER,
    "visibilityTier" TEXT,
    "evaluationVersion" TEXT,
    "theologicalSummary" TEXT,
    "denominationalTags" TEXT[],
    "genreTag" TEXT,
    "matureContent" BOOLEAN NOT NULL DEFAULT false,
    "matureContentReason" TEXT,
    "scriptureComparisonNotes" TEXT,
    "theologicalStrengths" TEXT[],
    "theologicalConcerns" TEXT[],
    "scoringReasoning" TEXT,
    "analysisLevel" TEXT,
    "aiModel" TEXT,
    "pdfStoragePath" TEXT,
    "pdfStorageTier" TEXT,
    "pdfLicenseType" TEXT,
    "pdfUploadedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "submittedById" TEXT NOT NULL,
    "submittedByOrganizationId" TEXT NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "EvaluationRecord" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "changedFrom" INTEGER,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aiModel" TEXT NOT NULL,
    "analysisLevel" TEXT NOT NULL,

    CONSTRAINT "EvaluationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "DoctrineCategoryScore" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "DoctrineCategoryScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "PurchaseLink" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "retailer" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PurchaseLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "BookEndorsement" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "endorsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endorsedById" TEXT NOT NULL,

    CONSTRAINT "BookEndorsement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "UserReadingList" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER,
    "personalNotes" TEXT,
    "personalRating" INTEGER,
    "dateStarted" TIMESTAMP(3),
    "dateFinished" TIMESTAMP(3),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserReadingList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ExternalOrganization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationTypes" TEXT[],
    "specialtyTags" TEXT[],
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "email" TEXT,
    "website" TEXT,
    "hours" TEXT,
    "recommendedByOrganizationId" TEXT NOT NULL,
    "recommendationNote" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "addedById" TEXT NOT NULL,

    CONSTRAINT "ExternalOrganization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ConversationResourceMention" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "messageId" TEXT,
    "resourceType" TEXT NOT NULL,
    "bookId" TEXT,
    "externalOrgId" TEXT,
    "contextSnippet" TEXT,
    "mentionedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationResourceMention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Book_isbn_key" ON "Book"("isbn");
CREATE INDEX IF NOT EXISTS "Book_biblicalAlignmentScore_idx" ON "Book"("biblicalAlignmentScore");
CREATE INDEX IF NOT EXISTS "Book_visibilityTier_idx" ON "Book"("visibilityTier");
CREATE INDEX IF NOT EXISTS "Book_evaluationStatus_idx" ON "Book"("evaluationStatus");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "EvaluationRecord_bookId_idx" ON "EvaluationRecord"("bookId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "DoctrineCategoryScore_bookId_category_key" ON "DoctrineCategoryScore"("bookId", "category");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "BookEndorsement_bookId_organizationId_key" ON "BookEndorsement"("bookId", "organizationId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserReadingList_userId_bookId_key" ON "UserReadingList"("userId", "bookId");
CREATE INDEX IF NOT EXISTS "UserReadingList_userId_status_idx" ON "UserReadingList"("userId", "status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ExternalOrganization_recommendedByOrganizationId_idx" ON "ExternalOrganization"("recommendedByOrganizationId");
CREATE INDEX IF NOT EXISTS "ExternalOrganization_city_state_idx" ON "ExternalOrganization"("city", "state");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ConversationResourceMention_conversationId_idx" ON "ConversationResourceMention"("conversationId");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT IF NOT EXISTS "Book_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Book" ADD CONSTRAINT IF NOT EXISTS "Book_submittedByOrganizationId_fkey" FOREIGN KEY ("submittedByOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvaluationRecord" ADD CONSTRAINT IF NOT EXISTS "EvaluationRecord_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctrineCategoryScore" ADD CONSTRAINT IF NOT EXISTS "DoctrineCategoryScore_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseLink" ADD CONSTRAINT IF NOT EXISTS "PurchaseLink_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookEndorsement" ADD CONSTRAINT IF NOT EXISTS "BookEndorsement_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookEndorsement" ADD CONSTRAINT IF NOT EXISTS "BookEndorsement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookEndorsement" ADD CONSTRAINT IF NOT EXISTS "BookEndorsement_endorsedById_fkey" FOREIGN KEY ("endorsedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserReadingList" ADD CONSTRAINT IF NOT EXISTS "UserReadingList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserReadingList" ADD CONSTRAINT IF NOT EXISTS "UserReadingList_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalOrganization" ADD CONSTRAINT IF NOT EXISTS "ExternalOrganization_recommendedByOrganizationId_fkey" FOREIGN KEY ("recommendedByOrganizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalOrganization" ADD CONSTRAINT IF NOT EXISTS "ExternalOrganization_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationResourceMention" ADD CONSTRAINT IF NOT EXISTS "ConversationResourceMention_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ConversationResourceMention" ADD CONSTRAINT IF NOT EXISTS "ConversationResourceMention_externalOrgId_fkey" FOREIGN KEY ("externalOrgId") REFERENCES "ExternalOrganization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
