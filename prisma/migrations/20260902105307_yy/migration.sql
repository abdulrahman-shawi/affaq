/*
  Warnings:

  - Made the column `answers` on table `QuizAttempt` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "QuizAttempt" ALTER COLUMN "answers" SET NOT NULL,
ALTER COLUMN "essayScores" DROP DEFAULT;
