-- CreateTable
CREATE TABLE "SessionShareAccess" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAccessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isDismissed" BOOLEAN NOT NULL DEFAULT false,
    "dismissedAt" TIMESTAMP(3),

    CONSTRAINT "SessionShareAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionShareAccess_userId_idx" ON "SessionShareAccess"("userId");

-- CreateIndex
CREATE INDEX "SessionShareAccess_shareId_idx" ON "SessionShareAccess"("shareId");

-- CreateIndex
CREATE INDEX "SessionShareAccess_isDismissed_idx" ON "SessionShareAccess"("isDismissed");

-- CreateIndex
CREATE UNIQUE INDEX "SessionShareAccess_shareId_userId_key" ON "SessionShareAccess"("shareId", "userId");

-- AddForeignKey
ALTER TABLE "SessionShareAccess" ADD CONSTRAINT "SessionShareAccess_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "SessionShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;
