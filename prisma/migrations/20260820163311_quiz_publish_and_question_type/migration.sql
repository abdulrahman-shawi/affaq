-- AlterTable
ALTER TABLE "Quiz" ADD COLUMN     "published" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "QuizQuestion" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'mcq';
