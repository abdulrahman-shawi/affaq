-- DropIndex
DROP INDEX "ChatMessage_classId_createdAt_idx";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "teacherId" TEXT;

-- CreateIndex
CREATE INDEX "ChatMessage_classId_teacherId_createdAt_idx" ON "ChatMessage"("classId", "teacherId", "createdAt");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
