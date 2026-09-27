import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getChatRoomsForUser } from "@/app/lib/chatAccess";

export const dynamic = "force-dynamic";

// قائمة محادثات الصفوف / المعلمين المتاحة للمستخدم مع آخر رسالة في كل غرفة
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const rooms = await getChatRoomsForUser(sessionUser.id, sessionUser.role);
    if (rooms.length === 0) return NextResponse.json([]);

    const roomIds = rooms.map((room) => room.classId);
    const teacherIds = rooms
      .filter((room) => room.teacherId)
      .map((room) => room.teacherId as string);

    const latestMessages = await prisma.chatMessage.findMany({
      where: {
        classId: { in: roomIds },
        ...(teacherIds.length > 0 ? { teacherId: { in: teacherIds } } : {}),
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        classId: true,
        teacherId: true,
        content: true,
        imageUrl: true,
        createdAt: true,
        sender: { select: { name: true } },
      },
    });

    const latestByRoom = new Map<string, (typeof latestMessages)[number]>();
    for (const message of latestMessages) {
      const key = `${message.classId}:${message.teacherId ?? "all"}`;
      if (!latestByRoom.has(key)) latestByRoom.set(key, message);
    }

    return NextResponse.json(
      rooms.map((room) => {
        const key = `${room.classId}:${room.teacherId ?? "all"}`;
        const last = latestByRoom.get(key);
        return {
          classId: room.classId,
          teacherId: room.teacherId,
          className: room.className,
          teacherName: room.teacherName,
          lastMessage: last
            ? {
                senderName: last.sender.name,
                content: last.content,
                imageUrl: last.imageUrl,
                createdAt: last.createdAt,
              }
            : null,
        };
      })
    );
  } catch {
    return NextResponse.json({ error: "فشل في تحميل المحادثات" }, { status: 500 });
  }
}
