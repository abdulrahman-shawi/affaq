-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_assignmentId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_sessionId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Message" DROP CONSTRAINT "Message_teacherId_fkey";

-- AlterTable
ALTER TABLE "Message" DROP COLUMN "assignmentId",
DROP COLUMN "senderType",
DROP COLUMN "sessionId",
DROP COLUMN "studentId",
DROP COLUMN "teacherId",
ADD COLUMN     "toAll" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MessageClass" (
    "messageId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,

    CONSTRAINT "MessageClass_pkey" PRIMARY KEY ("messageId","classId")
);

-- CreateTable
CREATE TABLE "MessageRecipient" (
    "messageId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "MessageRecipient_pkey" PRIMARY KEY ("messageId","userId")
);

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageClass" ADD CONSTRAINT "MessageClass_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageClass" ADD CONSTRAINT "MessageClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "ClassLevel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageRecipient" ADD CONSTRAINT "MessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
