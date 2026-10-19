-- AlterTable
ALTER TABLE "Parent" ALTER COLUMN "phones" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Student" ALTER COLUMN "guardianPhones" DROP DEFAULT;

-- CreateTable
CREATE TABLE "SiteSettings" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "siteName" TEXT NOT NULL DEFAULT 'آفاق أكاديمي',
    "academyName" TEXT NOT NULL DEFAULT 'آفاق أكاديمي',
    "logoUrl" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSettings_pkey" PRIMARY KEY ("id")
);
