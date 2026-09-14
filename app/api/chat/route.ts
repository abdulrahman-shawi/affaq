import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getChatClassIds } from "@/app/lib/chatAccess";

export const dynamic = "force-dynamic";

// قائمة محادثات الصفوف المتاحة للمستخدم مع آخر رسالة في كل منها
export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const classIds = await getChatClassIds(sessionUser.id, sessionUser.role);
    if (classIds.length === 0) return NextResponse.json([]);

    const classes = await prisma.classLevel.findMany({
      where: { id: { in: classIds } },
      select: {
        id: true,
        name: true,
        chatMessages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            content: true,
            imageUrl: true,
            createdAt: true,
            sender: { select: { name: true } },
          },
        },
      },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(
      classes.map((c) => {
        const last = c.chatMessages[0];
        return {
          classId: c.id,
          className: c.name,
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
