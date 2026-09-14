import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getPusher } from "@/app/lib/pusher";
import { canAccessClassChat, chatChannelName } from "@/app/lib/chatAccess";
import { summarizeReactions } from "@/app/lib/chatDto";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// تبديل تفاعل المستخدم على رسالة — إن كان موجوداً يُحذف وإلا يُضاف
export async function POST(
  req: Request,
  { params }: { params: { messageId: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const emoji = typeof body.emoji === "string" ? body.emoji : "";
    if (!ALLOWED_EMOJIS.includes(emoji)) {
      return NextResponse.json({ error: "تفاعل غير مدعوم" }, { status: 400 });
    }

    const message = await prisma.chatMessage.findUnique({
      where: { id: params.messageId },
      select: { classId: true },
    });
    if (!message) {
      return NextResponse.json({ error: "الرسالة غير موجودة" }, { status: 404 });
    }
    const allowed = await canAccessClassChat(
      sessionUser.id,
      sessionUser.role,
      message.classId
    );
    if (!allowed) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const key = {
      messageId: params.messageId,
      userId: sessionUser.id,
      emoji,
    };
    const existing = await prisma.chatReaction.findUnique({
      where: { messageId_userId_emoji: key },
    });
    if (existing) {
      await prisma.chatReaction.delete({
        where: { messageId_userId_emoji: key },
      });
    } else {
      await prisma.chatReaction.create({ data: key });
    }

    const reactions = await prisma.chatReaction.findMany({
      where: { messageId: params.messageId },
      select: { userId: true, emoji: true },
    });
    const summary = summarizeReactions(reactions, sessionUser.id);

    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger(chatChannelName(message.classId), "reaction", {
        messageId: params.messageId,
        reactions,
      });
    }

    return NextResponse.json({ reactions: summary });
  } catch {
    return NextResponse.json({ error: "فشل في تحديث التفاعل" }, { status: 500 });
  }
}
