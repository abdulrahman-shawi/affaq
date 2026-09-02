-- AlterTable
ALTER TABLE "Student"
ADD COLUMN "fatherName" TEXT,
ADD COLUMN "motherName" TEXT,
ADD COLUMN "guardianPhones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "Parent"
ADD COLUMN "phones" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
