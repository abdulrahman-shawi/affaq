-- CreateTable
CREATE TABLE "ShowcasePost" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "mediaUrl" TEXT NOT NULL,
    "mediaType" TEXT NOT NULL,
    "caption" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcasePost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShowcasePost_createdAt_idx" ON "ShowcasePost"("createdAt");

-- AddForeignKey
ALTER TABLE "ShowcasePost" ADD CONSTRAINT "ShowcasePost_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcasePost" ADD CONSTRAINT "ShowcasePost_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
