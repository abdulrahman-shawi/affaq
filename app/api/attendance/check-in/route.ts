import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionUser } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

// تسجيل حضور ذاتي للطالب عند دخوله حصة اليوم من الجدول الأسبوعي
export async function POST(req: Request) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.role !== "student") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 403 });
    }

    const { slotId } = await req.json();
    if (!slotId) {
      return NextResponse.json({ error: "بيانات ناقصة" }, { status: 400 });
    }

    const student = await prisma.student.findUnique({
      where: { userId: sessionUser.id },
      include: { class: true },
    });
    if (!student?.classId || !student.class) {
      return NextResponse.json(
        { error: "لم يُسند لك صف بعد" },
        { status: 400 }
      );
    }

    const slot = await prisma.timetableSlot.findUnique({
      where: { id: slotId },
    });
    if (!slot || slot.classId !== student.classId) {
      return NextResponse.json(
        { error: "هذه الحصة ليست ضمن جدولك" },
        { status: 403 }
      );
    }

    // لا يمكن الدخول إلا في يوم الحصة نفسه
    const now = new Date();
    if (slot.dayOfWeek !== now.getDay()) {
      return NextResponse.json(
        { error: "هذه الحصة ليست مجدولة اليوم" },
        { status: 400 }
      );
    }

    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);

    // grade في الحصة يطابق order في الصف الدراسي
    const session = await prisma.session.findFirst({
      where: {
        teacherId: slot.teacherId,
        subject: slot.subject,
        grade: student.class.order,
        date: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { date: "asc" },
    });
    if (!session) {
      return NextResponse.json(
        { error: "لم يُنشأ اجتماع لهذه الحصة بعد" },
        { status: 404 }
      );
    }
    if (!session.zoomLink) {
      return NextResponse.json(
        { error: "لا يوجد رابط زوم لهذه الحصة" },
        { status: 400 }
      );
    }

    // تسجيل الحضور مرة واحدة فقط، دون تغيير سجل موجود
    const existing = await prisma.attendance.findFirst({
      where: { sessionId: session.id, studentId: student.id },
    });
    if (!existing) {
      await prisma.attendance.create({
        data: {
          sessionId: session.id,
          studentId: student.id,
          status: "present",
        },
      });
    }

    return NextResponse.json({
      zoomLink: session.zoomLink,
      alreadyMarked: Boolean(existing),
    });
  } catch {
    return NextResponse.json({ error: "فشل في تسجيل الحضور" }, { status: 500 });
  }
}
