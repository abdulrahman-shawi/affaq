import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getPusher } from "@/app/lib/pusher";
import { canAccessClassChat, chatChannelName } from "@/app/lib/chatAccess";
import { chatMessageInclude, chatMessageToDTO } from "@/app/lib/chatDto";
import {
  containsLinkOrPhone,
  FORBIDDEN_CONTENT_MESSAGE,
} from "@/app/lib/messageValidation";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

// آخر رسائل المحادثة — ?before=<messageId> لتحميل الأقدم
export async function GET(
  req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const allowed = await canAccessClassChat(
      sessionUser.id,
      sessionUser.role,
      params.classId
    );
    if (!allowed) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const before = searchParams.get("before");

    const messages = await prisma.chatMessage.findMany({
      where: { classId: params.classId },
      include: chatMessageInclude,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE + 1,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    });

    const hasMore = messages.length > PAGE_SIZE;
    const page = hasMore ? messages.slice(0, PAGE_SIZE) : messages;

    return NextResponse.json({
      messages: page
        .reverse()
        .map((m) => chatMessageToDTO(m, sessionUser.id)),
      hasMore,
    });
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الرسائل" }, { status: 500 });
  }
}

// إرسال رسالة (نص و/أو صورة) مع رد اختياري — بث لحظي عبر Pusher وإشعارات
export async function POST(
  req: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const allowed = await canAccessClassChat(
      sessionUser.id,
      sessionUser.role,
      params.classId
    );
    if (!allowed) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const content =
      typeof body.content === "string" ? body.content.trim() : "";
    const imageUrl =
      typeof body.imageUrl === "string" && body.imageUrl ? body.imageUrl : null;
    const replyToId =
      typeof body.replyToId === "string" && body.replyToId
        ? body.replyToId
        : null;

    if (!content && !imageUrl) {
      return NextResponse.json(
        { error: "الرسالة فارغة" },
        { status: 400 }
      );
    }
    if (content && containsLinkOrPhone(content)) {
      return NextResponse.json(
        { error: FORBIDDEN_CONTENT_MESSAGE },
        { status: 400 }
      );
    }
    if (replyToId) {
      const target = await prisma.chatMessage.findUnique({
        where: { id: replyToId },
        select: { classId: true },
      });
      if (!target || target.classId !== params.classId) {
        return NextResponse.json(
          { error: "الرسالة المُقتبسة غير موجودة" },
          { status: 400 }
        );
      }
    }

    const message = await prisma.chatMessage.create({
      data: {
        classId: params.classId,
        senderId: sessionUser.id,
        content: content || null,
        imageUrl,
        replyToId,
      },
      include: chatMessageInclude,
    });
    const dto = chatMessageToDTO(message, sessionUser.id);

    const pusher = getPusher();
    if (pusher) {
      await pusher.trigger(chatChannelName(params.classId), "new-message", dto);
    }

    // إشعار الطرف الآخر: رسالة الطالب تُشعِر معلمات الصف، ورسالة المعلمة/الإدارة تُشعِر الطلاب
    const classInfo = await prisma.classLevel.findUnique({
      where: { id: params.classId },
      select: { name: true },
    });
    const fromStudent = sessionUser.role === "student";
    const recipients = fromStudent
      ? (
          await prisma.teacher.findMany({
            where: { classes: { some: { id: params.classId } } },
            select: { user: { select: { id: true, role: true } } },
          })
        ).map((t) => t.user)
      : (
          await prisma.student.findMany({
            where: { classId: params.classId, status: "active" },
            select: { user: { select: { id: true, role: true } } },
          })
        ).map((s) => s.user);

    const targets = recipients.filter((u) => u.id !== sessionUser.id);
    if (targets.length > 0) {
      await prisma.notification.createMany({
        data: targets.map((u) => ({
          userId: u.id,
          title: `رسالة جديدة في دردشة ${classInfo?.name ?? "الصف"}`,
          body: content || "صورة",
          type: "message",
          link:
            u.role === "admin" || u.role === "supervisor"
              ? "/dashboard/admin/chat"
              : `/dashboard/${u.role}/chat`,
        })),
      });
    }

    return NextResponse.json(dto, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إرسال الرسالة" }, { status: 500 });
  }
}
