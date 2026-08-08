import { NextResponse } from "next/server";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getAllowedTargets } from "@/app/lib/messageTargets";
import {
  containsLinkOrPhone,
  FORBIDDEN_CONTENT_MESSAGE,
} from "@/app/lib/messageValidation";

export const dynamic = "force-dynamic";

const messageInclude = {
  sender: { select: { id: true, name: true, role: true } },
  classes: { include: { class: { select: { id: true, name: true } } } },
  recipients: {
    include: { user: { select: { id: true, name: true, role: true } } },
  },
} satisfies Prisma.MessageInclude;

function toDTO(m: Prisma.MessageGetPayload<{ include: typeof messageInclude }>) {
  return {
    id: m.id,
    content: m.content,
    toAll: m.toAll,
    createdAt: m.createdAt,
    sender: m.sender,
    classes: m.classes.map((c) => ({ id: c.class.id, name: c.class.name })),
    recipients: m.recipients.map((r) => ({
      id: r.user.id,
      name: r.user.name,
      role: r.user.role,
    })),
  };
}

// يعيد شرط الرؤية حسب دور المستخدم: يرى ما أرسله، وما وُجّه إليه،
// وما وُجّه للجميع أو لصفوفه
async function visibilityFilter(
  userId: string,
  role: string
): Promise<Prisma.MessageWhereInput> {
  if (role === "admin") return {};

  let classIds: string[] = [];
  if (role === "teacher") {
    const teacher = await prisma.teacher.findUnique({
      where: { userId },
      select: { classes: { select: { id: true } } },
    });
    classIds = teacher?.classes.map((c) => c.id) ?? [];
  } else if (role === "student") {
    const student = await prisma.student.findUnique({
      where: { userId },
      select: { classId: true },
    });
    classIds = student?.classId ? [student.classId] : [];
  }

  return {
    OR: [
      { senderId: userId },
      { toAll: true },
      { recipients: { some: { userId } } },
      ...(classIds.length > 0
        ? [{ classes: { some: { classId: { in: classIds } } } }]
        : []),
    ],
  };
}

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const where = await visibilityFilter(sessionUser.id, sessionUser.role);
    const messages = await prisma.message.findMany({
      where,
      include: messageInclude,
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(messages.map(toDTO));
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الرسائل" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    const body = await req.json();
    const content = typeof body.content === "string" ? body.content.trim() : "";
    const toAll = body.toAll === true;
    const classIds: string[] = Array.isArray(body.classIds)
      ? body.classIds.filter((id: unknown) => typeof id === "string")
      : [];
    const recipientIds: string[] = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((id: unknown) => typeof id === "string")
      : [];

    if (!content) {
      return NextResponse.json({ error: "نص الرسالة مطلوب" }, { status: 400 });
    }

    if (containsLinkOrPhone(content)) {
      return NextResponse.json(
        { error: FORBIDDEN_CONTENT_MESSAGE },
        { status: 400 }
      );
    }

    if (!toAll && classIds.length === 0 && recipientIds.length === 0) {
      return NextResponse.json(
        { error: "يجب اختيار جهة واحدة على الأقل" },
        { status: 400 }
      );
    }

    // التحقق من أن الجهات المطلوبة ضمن ما يسمح به دور المستخدم
    const allowed = await getAllowedTargets(sessionUser.id, sessionUser.role);
    if (toAll && !allowed.canSendToAll) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const allowedClassIds = new Set(allowed.classes.map((c) => c.id));
    if (classIds.some((id) => !allowedClassIds.has(id))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }
    const allowedUserIds = new Set(allowed.users.map((u) => u.id));
    if (recipientIds.some((id) => !allowedUserIds.has(id))) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderId: sessionUser.id,
        toAll,
        classes: { create: classIds.map((classId) => ({ classId })) },
        recipients: { create: recipientIds.map((userId) => ({ userId })) },
      },
      include: messageInclude,
    });

    // إشعار المستلمين بالرسالة الجديدة
    const notifiedUsers = await prisma.user.findMany({
      where: {
        id: { not: sessionUser.id },
        OR: [
          ...(toAll ? [{}] : []),
          { id: { in: recipientIds } },
          { student: { classId: { in: classIds } } },
          { teacher: { classes: { some: { id: { in: classIds } } } } },
        ],
      },
      select: { id: true, role: true },
    });
    if (notifiedUsers.length > 0) {
      await prisma.notification.createMany({
        data: notifiedUsers.map((u) => ({
          userId: u.id,
          title: "رسالة جديدة",
          body: `${sessionUser.name}: ${content.slice(0, 100)}`,
          type: "message",
          link: `/dashboard/${u.role}/messages`,
        })),
      });
    }

    return NextResponse.json(toDTO(message), { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إرسال الرسالة" }, { status: 500 });
  }
}
