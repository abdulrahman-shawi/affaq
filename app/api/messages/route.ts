import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import {
  containsLinkOrPhone,
  FORBIDDEN_CONTENT_MESSAGE,
} from "@/app/lib/messageValidation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const messages = await prisma.message.findMany({
      include: {
        student: { include: { user: true } },
        teacher: { include: { user: true } },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(messages);
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
    const { content, senderType, senderId, studentId, teacherId } = body;

    if (!content || !senderType || !senderId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    if (containsLinkOrPhone(content)) {
      return NextResponse.json(
        { error: FORBIDDEN_CONTENT_MESSAGE },
        { status: 400 }
      );
    }

    const message = await prisma.message.create({
      data: {
        content,
        senderType,
        senderId,
        studentId: studentId || null,
        teacherId: teacherId || null,
      },
    });

    return NextResponse.json(message, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إرسال الرسالة" }, { status: 500 });
  }
}
