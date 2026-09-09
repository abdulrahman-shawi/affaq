import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";
import { getSupervisorScope } from "@/app/lib/supervisorScope";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    const scope = await getSupervisorScope(sessionUser);

    const sessions = await prisma.session.findMany({
      where: scope
        ? {
            teacherId: { in: scope.visibleTeacherIds },
            grade: { in: scope.classOrders },
          }
        : // المعلم يرى حصصه هو فقط
          sessionUser.role === "teacher"
          ? { teacher: { userId: sessionUser.id } }
          : undefined,
      include: { teacher: { include: { user: true } } },
      orderBy: { date: "desc" },
    });
    return NextResponse.json(sessions);
  } catch {
    return NextResponse.json({ error: "فشل في تحميل الحصص" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || !["admin", "teacher"].includes(sessionUser.role)) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const body = await req.json();
    const { teacherId, grade, subject, date, zoomLink, recordingUrl } = body;

    if (!teacherId || !grade || !subject || !date) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    // المعلم ينشئ حصصاً باسمه فقط — لا يمكنه انتحال معلم آخر
    let effectiveTeacherId = teacherId;
    if (sessionUser.role === "teacher") {
      const me = await prisma.teacher.findUnique({
        where: { userId: sessionUser.id },
        select: { id: true },
      });
      if (!me) {
        return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
      }
      effectiveTeacherId = me.id;
    }

    // بدء الحصة من الجدول idempotent: نفس المعلم والمادة والصف في نفس اليوم
    // تعيد الحصة الموجودة بدل إنشاء نسخة مكررة
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const existing = await prisma.session.findFirst({
      where: {
        teacherId: effectiveTeacherId,
        grade: Number(grade),
        subject,
        date: { gte: dayStart, lt: dayEnd },
      },
      include: { teacher: { include: { user: true } } },
    });
    if (existing) {
      return NextResponse.json(existing);
    }

    const session = await prisma.session.create({
      data: {
        teacherId: effectiveTeacherId,
        grade: Number(grade),
        subject,
        date: new Date(date),
        zoomLink: zoomLink || null,
        recordingUrl: recordingUrl || null,
      },
      include: { teacher: { include: { user: true } } },
    });

    return NextResponse.json(session, { status: 201 });
  } catch {
    return NextResponse.json({ error: "فشل في إنشاء الحصة" }, { status: 500 });
  }
}
