-- CreateTable
CREATE TABLE "_SupervisorClasses" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SupervisorClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_SupervisorClasses_B_index" ON "_SupervisorClasses"("B");

-- AddForeignKey
ALTER TABLE "_SupervisorClasses" ADD CONSTRAINT "_SupervisorClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SupervisorClasses" ADD CONSTRAINT "_SupervisorClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
