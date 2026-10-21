-- CreateTable
CREATE TABLE "AttendanceArchive" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "grade" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "teacherId" TEXT,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "archivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceArchive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AttendanceArchive_studentId_date_idx" ON "AttendanceArchive"("studentId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "AttendanceArchive_sessionId_studentId_key" ON "AttendanceArchive"("sessionId", "studentId");

-- AddForeignKey
ALTER TABLE "AttendanceArchive" ADD CONSTRAINT "AttendanceArchive_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

