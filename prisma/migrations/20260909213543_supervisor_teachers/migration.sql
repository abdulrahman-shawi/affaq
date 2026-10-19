-- CreateTable
CREATE TABLE "SupervisorTeacher" (
    "supervisorId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,

    CONSTRAINT "SupervisorTeacher_pkey" PRIMARY KEY ("supervisorId","classId","teacherId")
);

-- AddForeignKey
ALTER TABLE "SupervisorTeacher" ADD CONSTRAINT "SupervisorTeacher_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorTeacher" ADD CONSTRAINT "SupervisorTeacher_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupervisorTeacher" ADD CONSTRAINT "SupervisorTeacher_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
