-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "recordingUrl" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "subReminderAt" TIMESTAMP(3);
