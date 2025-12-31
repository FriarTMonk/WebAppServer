-- CreateTable
CREATE TABLE "CrisisAlertLog" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "counselorId" TEXT,
    "crisisType" TEXT NOT NULL,
    "confidence" TEXT NOT NULL,
    "detectionMethod" TEXT NOT NULL,
    "triggeringMessage" TEXT NOT NULL,
    "messageId" TEXT,
    "emailSent" BOOLEAN NOT NULL DEFAULT false,
    "emailLogId" TEXT,
    "throttled" BOOLEAN NOT NULL DEFAULT false,
    "throttleReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrisisAlertLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberWellbeingHistory" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "trajectory" TEXT,
    "summary" TEXT NOT NULL,
    "overriddenBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberWellbeingHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSummary" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "topics" TEXT[],
    "sentiment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Assessment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT,
    "questions" JSONB NOT NULL,
    "scoringRules" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentSchedule" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetValue" TEXT,
    "schedule" TEXT NOT NULL,
    "triggers" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssignedAssessment" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "assignedBy" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssignedAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assignedAssessmentId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "score" DOUBLE PRECISION,
    "interpretation" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberTask" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "counselorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MemberTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "ownerId" TEXT,
    "trigger" JSONB NOT NULL,
    "conditions" JSONB,
    "actions" JSONB NOT NULL,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkflowRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkflowExecution" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "triggeredBy" TEXT NOT NULL,
    "context" JSONB NOT NULL,
    "actions" JSONB NOT NULL,
    "success" BOOLEAN NOT NULL,
    "error" TEXT,
    "executedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkflowExecution_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CrisisAlertLog_emailLogId_key" ON "CrisisAlertLog"("emailLogId");

-- CreateIndex
CREATE INDEX "CrisisAlertLog_memberId_idx" ON "CrisisAlertLog"("memberId");

-- CreateIndex
CREATE INDEX "CrisisAlertLog_counselorId_idx" ON "CrisisAlertLog"("counselorId");

-- CreateIndex
CREATE INDEX "CrisisAlertLog_createdAt_idx" ON "CrisisAlertLog"("createdAt");

-- CreateIndex
CREATE INDEX "CrisisAlertLog_emailSent_idx" ON "CrisisAlertLog"("emailSent");

-- CreateIndex
CREATE INDEX "MemberWellbeingHistory_memberId_idx" ON "MemberWellbeingHistory"("memberId");

-- CreateIndex
CREATE INDEX "MemberWellbeingHistory_createdAt_idx" ON "MemberWellbeingHistory"("createdAt");

-- CreateIndex
CREATE INDEX "MemberWellbeingHistory_status_idx" ON "MemberWellbeingHistory"("status");

-- CreateIndex
CREATE UNIQUE INDEX "SessionSummary_sessionId_key" ON "SessionSummary"("sessionId");

-- CreateIndex
CREATE INDEX "SessionSummary_memberId_idx" ON "SessionSummary"("memberId");

-- CreateIndex
CREATE INDEX "SessionSummary_createdAt_idx" ON "SessionSummary"("createdAt");

-- CreateIndex
CREATE INDEX "Assessment_type_idx" ON "Assessment"("type");

-- CreateIndex
CREATE INDEX "Assessment_category_idx" ON "Assessment"("category");

-- CreateIndex
CREATE INDEX "Assessment_isActive_idx" ON "Assessment"("isActive");

-- CreateIndex
CREATE INDEX "AssessmentSchedule_assessmentId_idx" ON "AssessmentSchedule"("assessmentId");

-- CreateIndex
CREATE INDEX "AssessmentSchedule_isActive_idx" ON "AssessmentSchedule"("isActive");

-- CreateIndex
CREATE INDEX "AssignedAssessment_assessmentId_idx" ON "AssignedAssessment"("assessmentId");

-- CreateIndex
CREATE INDEX "AssignedAssessment_memberId_idx" ON "AssignedAssessment"("memberId");

-- CreateIndex
CREATE INDEX "AssignedAssessment_assignedBy_idx" ON "AssignedAssessment"("assignedBy");

-- CreateIndex
CREATE INDEX "AssignedAssessment_status_idx" ON "AssignedAssessment"("status");

-- CreateIndex
CREATE INDEX "AssignedAssessment_dueDate_idx" ON "AssignedAssessment"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_assignedAssessmentId_key" ON "AssessmentResponse"("assignedAssessmentId");

-- CreateIndex
CREATE INDEX "AssessmentResponse_assignedAssessmentId_idx" ON "AssessmentResponse"("assignedAssessmentId");

-- CreateIndex
CREATE INDEX "MemberTask_memberId_idx" ON "MemberTask"("memberId");

-- CreateIndex
CREATE INDEX "MemberTask_counselorId_idx" ON "MemberTask"("counselorId");

-- CreateIndex
CREATE INDEX "MemberTask_status_idx" ON "MemberTask"("status");

-- CreateIndex
CREATE INDEX "MemberTask_dueDate_idx" ON "MemberTask"("dueDate");

-- CreateIndex
CREATE INDEX "WorkflowRule_level_idx" ON "WorkflowRule"("level");

-- CreateIndex
CREATE INDEX "WorkflowRule_ownerId_idx" ON "WorkflowRule"("ownerId");

-- CreateIndex
CREATE INDEX "WorkflowRule_isActive_idx" ON "WorkflowRule"("isActive");

-- CreateIndex
CREATE INDEX "WorkflowExecution_ruleId_idx" ON "WorkflowExecution"("ruleId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_executedAt_idx" ON "WorkflowExecution"("executedAt");

-- CreateIndex
CREATE INDEX "WorkflowExecution_success_idx" ON "WorkflowExecution"("success");

-- AddForeignKey
ALTER TABLE "CrisisAlertLog" ADD CONSTRAINT "CrisisAlertLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisAlertLog" ADD CONSTRAINT "CrisisAlertLog_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrisisAlertLog" ADD CONSTRAINT "CrisisAlertLog_emailLogId_fkey" FOREIGN KEY ("emailLogId") REFERENCES "EmailLog"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberWellbeingHistory" ADD CONSTRAINT "MemberWellbeingHistory_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberWellbeingHistory" ADD CONSTRAINT "MemberWellbeingHistory_overriddenBy_fkey" FOREIGN KEY ("overriddenBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSummary" ADD CONSTRAINT "SessionSummary_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSummary" ADD CONSTRAINT "SessionSummary_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentSchedule" ADD CONSTRAINT "AssessmentSchedule_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedAssessment" ADD CONSTRAINT "AssignedAssessment_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedAssessment" ADD CONSTRAINT "AssignedAssessment_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssignedAssessment" ADD CONSTRAINT "AssignedAssessment_assignedBy_fkey" FOREIGN KEY ("assignedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assignedAssessmentId_fkey" FOREIGN KEY ("assignedAssessmentId") REFERENCES "AssignedAssessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTask" ADD CONSTRAINT "MemberTask_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberTask" ADD CONSTRAINT "MemberTask_counselorId_fkey" FOREIGN KEY ("counselorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "WorkflowRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
