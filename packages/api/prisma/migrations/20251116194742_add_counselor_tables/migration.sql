-- CreateTable
CREATE TABLE "CounselorAssignment" (
    "id" TEXT NOT NULL,
    "counselorId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "CounselorAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselorObservation" (
    "id" TEXT NOT NULL,
    "counselorId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CounselorObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounselorCoverageGrant" (
    "id" TEXT NOT NULL,
    "primaryCounselorId" TEXT NOT NULL,
    "backupCounselorId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "grantedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "CounselorCoverageGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberWellbeingStatus" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "aiSuggestedStatus" TEXT NOT NULL,
    "overriddenBy" TEXT,
    "summary" TEXT NOT NULL,
    "lastAnalyzedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberWellbeingStatus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "senderId" TEXT,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "linkTo" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CounselorAssignment_counselorId_status_idx" ON "CounselorAssignment"("counselorId", "status");

-- CreateIndex
CREATE INDEX "CounselorAssignment_memberId_idx" ON "CounselorAssignment"("memberId");

-- CreateIndex
CREATE INDEX "CounselorAssignment_organizationId_idx" ON "CounselorAssignment"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "CounselorAssignment_counselorId_memberId_organizationId_key" ON "CounselorAssignment"("counselorId", "memberId", "organizationId");

-- CreateIndex
CREATE INDEX "CounselorObservation_counselorId_memberId_idx" ON "CounselorObservation"("counselorId", "memberId");

-- CreateIndex
CREATE INDEX "CounselorObservation_createdAt_idx" ON "CounselorObservation"("createdAt");

-- CreateIndex
CREATE INDEX "CounselorCoverageGrant_backupCounselorId_revokedAt_idx" ON "CounselorCoverageGrant"("backupCounselorId", "revokedAt");

-- CreateIndex
CREATE INDEX "CounselorCoverageGrant_primaryCounselorId_idx" ON "CounselorCoverageGrant"("primaryCounselorId");

-- CreateIndex
CREATE INDEX "CounselorCoverageGrant_memberId_idx" ON "CounselorCoverageGrant"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "MemberWellbeingStatus_memberId_key" ON "MemberWellbeingStatus"("memberId");

-- CreateIndex
CREATE INDEX "MemberWellbeingStatus_status_idx" ON "MemberWellbeingStatus"("status");

-- CreateIndex
CREATE INDEX "MemberWellbeingStatus_lastAnalyzedAt_idx" ON "MemberWellbeingStatus"("lastAnalyzedAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_isRead_isDismissed_idx" ON "Notification"("recipientId", "isRead", "isDismissed");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");

-- AddForeignKey
ALTER TABLE "CounselorAssignment" ADD CONSTRAINT "CounselorAssignment_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorAssignment" ADD CONSTRAINT "CounselorAssignment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorAssignment" ADD CONSTRAINT "CounselorAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorObservation" ADD CONSTRAINT "CounselorObservation_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorObservation" ADD CONSTRAINT "CounselorObservation_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorCoverageGrant" ADD CONSTRAINT "CounselorCoverageGrant_primaryCounselorId_fkey" FOREIGN KEY ("primaryCounselorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorCoverageGrant" ADD CONSTRAINT "CounselorCoverageGrant_backupCounselorId_fkey" FOREIGN KEY ("backupCounselorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounselorCoverageGrant" ADD CONSTRAINT "CounselorCoverageGrant_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberWellbeingStatus" ADD CONSTRAINT "MemberWellbeingStatus_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
